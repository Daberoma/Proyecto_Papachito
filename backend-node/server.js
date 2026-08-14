import express from 'express';
import cors from 'cors';
import { PORT } from './src/config.js';
import { pool } from './src/db/pool.js';
import { stableUuid } from './src/utils/stableUuid.js';
import { healthRouter } from './src/routes/health.routes.js';
import { catalogRouter } from './src/routes/catalog.routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(healthRouter());
app.use(catalogRouter());

app.post('/api/config/productos', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const price = Number(req.body.price || 0);
  const category = String(req.body.category || 'Otros').trim() || 'Otros';
  const description = String(req.body.description || 'Producto creado desde Papachito').trim();
  if (!name || !Number.isFinite(price) || price < 0) return res.status(422).json({ ok: false, message: 'Se requieren nombre y precio válidos' });

  const client = await pool.connect();
  try {
    await client.query('begin');
    const cat = await client.query(
      `INSERT INTO categories(name) VALUES($1)
       ON CONFLICT(name) DO UPDATE SET active=TRUE
       RETURNING id`,
      [category],
    );
    const product = await client.query(
      `INSERT INTO products(category_id,name,description,unit_code,sale_price,active)
       VALUES($1,$2,$3,'NIU',$4,TRUE)
       RETURNING id`,
      [cat.rows[0].id, name, description, price],
    );
    await client.query(
      `INSERT INTO product_stock(product_id,warehouse_id,quantity)
       VALUES($1,20,0)
       ON CONFLICT(product_id,warehouse_id) DO NOTHING`,
      [product.rows[0].id],
    );
    await client.query('commit');
    res.json({ ok: true, id: product.rows[0].id });
  } catch (error) {
    await client.query('rollback');
    res.status(500).json({ ok: false, message: 'No se pudo crear el producto' });
  } finally {
    client.release();
  }
});

app.delete('/api/config/productos/:id', async (req, res) => {
  const result = await pool.query('UPDATE products SET active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id', [Number(req.params.id)]);
  res.json({ ok: result.rowCount > 0 });
});

app.post('/api/ventas/sincronizar', async (req, res) => {
  const sale = req.body || {};
  const items = Array.isArray(sale.items) ? sale.items : [];
  const seller = String(sale.seller || '').trim();
  const localId = String(sale.id || '').trim();
  if (!seller || !localId || items.length === 0) return res.status(422).json({ ok: false, message: 'Venta incompleta' });

  const uuid = stableUuid(localId);
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 1)) * Math.max(0, Number(item.price || 0)), 0);
  if (total <= 0) return res.status(422).json({ ok: false, message: 'Total inválido' });

  const createdAt = sale.createdAt ? new Date(sale.createdAt) : new Date();
  const saleDate = createdAt.toISOString().slice(0, 10);
  // La base migrada usa códigos legacy_11/legacy_12; mantener el nombre como
  // respaldo permite que Yape/Plin no termine registrado como efectivo.
  const paymentCode = sale.paymentMethod === 'digital' ? 'legacy_12' : 'legacy_11';
  const paymentName = sale.paymentMethod === 'digital' ? 'YAPE / PLIN' : 'EFECTIVO';
  const client = await pool.connect();
  try {
    const exists = await client.query('SELECT id FROM sales WHERE sale_uuid=$1', [uuid]);
    if (exists.rowCount) return res.json({ ok: true, uuid, duplicate: true });

    await client.query('begin');
    const inserted = await client.query(
      `INSERT INTO sales(sale_uuid,document_type,status,customer_document,customer_name,currency,sale_date,sold_at,total,amount_received,change_amount,original_payload)
       VALUES($1,'03','completed','00000000',$5,'PEN',$2,$3,$4,$4,0,$6::jsonb)
       RETURNING id`,
      [uuid, saleDate, createdAt.toISOString(), total, seller, JSON.stringify(sale)],
    );
    const saleId = inserted.rows[0].id;
    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity || 1));
      const price = Math.max(0, Number(item.price || 0));
      const productId = Number.isFinite(Number(item.id)) ? Number(item.id) : null;
      await client.query(
        `INSERT INTO sale_items(sale_id,product_id,product_name,quantity,unit_price,line_total)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [saleId, productId, String(item.name || 'Producto').trim(), qty, price, qty * price],
      );
      if (productId) await client.query('UPDATE product_stock SET quantity=quantity-$1, updated_at=CURRENT_TIMESTAMP WHERE product_id=$2 AND warehouse_id=20', [qty, productId]);
    }
    const method = await client.query(
      'SELECT id FROM payment_methods WHERE code=$1 OR UPPER(name)=UPPER($2) ORDER BY CASE WHEN code=$1 THEN 0 ELSE 1 END LIMIT 1',
      [paymentCode, paymentName],
    );
    await client.query('INSERT INTO sale_payments(sale_id,payment_method_id,amount) VALUES($1,$2,$3)', [saleId, method.rows[0]?.id || 1, total]);
    await client.query(`INSERT INTO audit_log(sale_uuid,action,details) VALUES($1,'mobile_sync',$2::jsonb)`, [uuid, JSON.stringify({ seller, local_id: localId })]);
    await client.query('commit');
    res.json({ ok: true, uuid, total });
  } catch (error) {
    await client.query('rollback');
    res.status(500).json({ ok: false, message: 'No se pudo sincronizar' });
  } finally {
    client.release();
  }
});

app.delete('/api/ventas/:uuid', async (req, res) => {
  const uuid = String(req.params.uuid || '');
  if (!uuid) return res.status(422).json({ ok: false, message: 'Venta no indicada' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE sales SET status='cancelled', cancelled_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE sale_uuid=$1 AND status <> 'cancelled' RETURNING sale_uuid`, [uuid],
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Venta no encontrada o ya anulada' });
    }
    await client.query(
      `INSERT INTO audit_log(sale_uuid, action, details) VALUES($1,'cancelled',$2::jsonb)`,
      [uuid, JSON.stringify({ source: 'mobile', reason: 'Anulación manual' })],
    );
    await client.query('COMMIT');
    res.json({ ok: true, uuid, status: 'cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, message: 'No se pudo anular la venta' });
  } finally {
    client.release();
  }
});

app.get('/api/ventas', async (_req, res) => {
  const result = await pool.query(`
    SELECT s.sale_uuid AS uuid, s.legacy_cpe_id, s.document_type, s.series, s.document_number, s.status,
           COALESCE(s.original_payload->>'seller', s.customer_name) AS customer_name, s.sold_at, s.total,
           COALESCE((SELECT pm.code FROM sale_payments sp JOIN payment_methods pm ON pm.id=sp.payment_method_id WHERE sp.sale_id=s.id LIMIT 1), 'legacy_11') AS payment_method,
           COALESCE((SELECT json_agg(json_build_object('name', si.product_name, 'quantity', si.quantity, 'price', si.unit_price))
                     FROM sale_items si WHERE si.sale_id=s.id), '[]'::json) AS items
    FROM sales s
    ORDER BY s.sold_at DESC
    LIMIT 100
  `);
  res.json({ ok: true, sales: result.rows });
});

app.get('/api/reportes', async (req, res) => {
  const period = String(req.query.periodo || 'mes');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const from = String(req.query.desde || (period === 'dia'
    ? new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10)
    : period === 'ano' ? yearStart : period === 'historico' ? '1900-01-01' : monthStart));
  const to = String(req.query.hasta || today);
  const grouping = period === 'ano' || period === 'historico' ? 'month' : 'day';
  const trunc = grouping === 'month' ? 'month' : 'day';
  const summary = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total
     FROM sales WHERE status='completed' AND sale_date BETWEEN $1 AND $2`,
    [from, to],
  );
  const series = await pool.query(
    `SELECT date_trunc('${trunc}', sale_date::timestamp)::date AS date, COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total
     FROM sales WHERE status='completed' AND sale_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY 1`,
    [from, to],
  );
  const historical = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total,
            MIN(sale_date) AS first_date, MAX(sale_date) AS last_date
     FROM sales WHERE status='completed'`,
  );
  const topProducts = await pool.query(
    `SELECT product_name AS name, COALESCE(SUM(quantity),0)::float AS quantity, COALESCE(SUM(line_total),0)::float AS total
     FROM sale_items si JOIN sales s ON s.id=si.sale_id
     WHERE s.status='completed' AND s.sale_date BETWEEN $1 AND $2
     GROUP BY product_name ORDER BY total DESC LIMIT 5`, [from, to],
  );
  const payments = await pool.query(
    `SELECT COALESCE(pm.name,'Otro') AS label, COALESCE(SUM(sp.amount),0)::float AS total
     FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id
     LEFT JOIN payment_methods pm ON pm.id=sp.payment_method_id
     WHERE s.status='completed' AND s.sale_date BETWEEN $1 AND $2
     GROUP BY pm.name ORDER BY total DESC`, [from, to],
  );
  const s = summary.rows[0];
  const h = historical.rows[0];
  res.json({
    ok: true,
    period,
    from,
    to,
    summary: { count: s.count, total: s.total, average: s.count ? s.total / s.count : 0 },
    series: series.rows,
    historical: { count: h.count, total: h.total, firstDate: h.first_date, lastDate: h.last_date },
    topProducts: topProducts.rows,
    payments: payments.rows,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: 'Error interno de API' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Papachito Node API en http://0.0.0.0:${PORT}`);
});
