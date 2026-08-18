import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT } from './src/config.js';
import { pool } from './src/db/pool.js';
import { stableUuid } from './src/utils/stableUuid.js';
import { healthRouter } from './src/routes/health.routes.js';
import { catalogRouter } from './src/routes/catalog.routes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(healthRouter());
app.use(catalogRouter());

const qrMethods = new Set(['yape', 'plin', 'bbva']);
const qrStorageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'storage', 'payment-qr');
const qrMimeExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function normalizeQrMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  return qrMethods.has(method) ? method : '';
}

function parseQrData(data, mimeType) {
  const raw = String(data || '');
  const match = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
  const mime = String(mimeType || match?.[1] || '').toLowerCase();
  const base64 = (match?.[2] || raw).replace(/\s/g, '');
  if (!qrMimeExtensions[mime] || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || !base64) return null;
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) return null;
  return { buffer, mime, extension: qrMimeExtensions[mime] };
}

async function removeStoredQr(fileName) {
  if (!fileName) return;
  await fs.unlink(path.join(qrStorageDir, path.basename(fileName))).catch(() => {});
}

app.get('/api/config/medios-pago', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT method, mime_type, version, updated_at
       FROM payment_qr_config ORDER BY method`,
    );
    res.json({
      ok: true,
      qrs: result.rows.map((row) => ({
        method: row.method,
        mimeType: row.mime_type,
        version: String(row.version),
        updatedAt: row.updated_at,
        url: `/api/config/medios-pago/${row.method}/qr`,
      })),
    });
  } catch (error) { next(error); }
});

app.get('/api/config/medios-pago/:method/qr', async (req, res, next) => {
  try {
    const method = normalizeQrMethod(req.params.method);
    if (!method) return res.status(400).json({ ok: false, message: 'Medio de pago no válido' });
    const result = await pool.query('SELECT file_name, mime_type, version FROM payment_qr_config WHERE method=$1', [method]);
    if (!result.rowCount) return res.status(404).json({ ok: false, message: 'QR no configurado' });
    const file = await fs.readFile(path.join(qrStorageDir, path.basename(result.rows[0].file_name)));
    res.setHeader('Content-Type', result.rows[0].mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${result.rows[0].version}"`);
    return res.send(file);
  } catch (error) { return next(error); }
});

app.put('/api/config/medios-pago/:method/qr', async (req, res, next) => {
  try {
    const method = normalizeQrMethod(req.params.method);
    const image = parseQrData(req.body?.data, req.body?.mimeType);
    if (!method || !image) return res.status(422).json({ ok: false, message: 'Imagen QR no válida' });
    await fs.mkdir(qrStorageDir, { recursive: true });
    const fileName = `${method}-${Date.now()}.${image.extension}`;
    await fs.writeFile(path.join(qrStorageDir, fileName), image.buffer);
    const previous = await pool.query('SELECT file_name FROM payment_qr_config WHERE method=$1', [method]);
    const version = Date.now();
    try {
      await pool.query(
        `INSERT INTO payment_qr_config(method,file_name,mime_type,version,updated_at)
         VALUES($1,$2,$3,$4,CURRENT_TIMESTAMP)
         ON CONFLICT(method) DO UPDATE SET file_name=EXCLUDED.file_name,
           mime_type=EXCLUDED.mime_type, version=EXCLUDED.version, updated_at=CURRENT_TIMESTAMP`,
        [method, fileName, image.mime, version],
      );
    } catch (error) {
      await removeStoredQr(fileName);
      throw error;
    }
    if (previous.rows[0]?.file_name && previous.rows[0].file_name !== fileName) await removeStoredQr(previous.rows[0].file_name);
    res.json({ ok: true, method, version: String(version), url: `/api/config/medios-pago/${method}/qr` });
  } catch (error) { next(error); }
});

app.delete('/api/config/medios-pago/:method/qr', async (req, res, next) => {
  try {
    const method = normalizeQrMethod(req.params.method);
    if (!method) return res.status(400).json({ ok: false, message: 'Medio de pago no válido' });
    const result = await pool.query('DELETE FROM payment_qr_config WHERE method=$1 RETURNING file_name', [method]);
    if (result.rows[0]?.file_name) await removeStoredQr(result.rows[0].file_name);
    res.json({ ok: true, removed: Boolean(result.rowCount) });
  } catch (error) { next(error); }
});

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
  const desde = String(_req.query.desde || '').trim();
  const hasta = String(_req.query.hasta || '').trim();
  const filters = [];
  const values = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) { values.push(desde); filters.push(`s.sale_date >= $${values.length}::date`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) { values.push(hasta); filters.push(`s.sale_date < ($${values.length}::date + INTERVAL '1 day')`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = desde || hasta ? 5000 : 100;
  values.push(limit);
  const result = await pool.query(`
    SELECT s.sale_uuid AS uuid, s.legacy_cpe_id, s.document_type, s.series, s.document_number, s.status,
           COALESCE(s.original_payload->>'seller', s.customer_name) AS customer_name, s.sold_at, s.total,
           COALESCE((SELECT pm.code FROM sale_payments sp JOIN payment_methods pm ON pm.id=sp.payment_method_id WHERE sp.sale_id=s.id LIMIT 1), 'legacy_11') AS payment_method,
           COALESCE((SELECT json_agg(json_build_object('name', si.product_name, 'quantity', si.quantity, 'price', si.unit_price))
                     FROM sale_items si WHERE si.sale_id=s.id), '[]'::json) AS items
    FROM sales s
    ${where}
    ORDER BY s.sold_at DESC
    LIMIT $${values.length}
  `, values);
  res.json({ ok: true, sales: result.rows });
});

app.get('/api/ventas/dias', async (_req, res) => {
  const result = await pool.query(`
    SELECT sale_date::date AS date, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::float AS total
    FROM sales
    WHERE status = 'completed'
    GROUP BY sale_date::date
    ORDER BY date DESC
  `);
  res.json({ ok: true, days: result.rows });
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
  const sellers = await pool.query(
    `SELECT COALESCE(NULLIF(s.original_payload->>'seller',''), NULLIF(s.customer_name,''), 'Sin nombre') AS label,
            COUNT(*)::int AS count, COALESCE(SUM(s.total),0)::float AS total
     FROM sales s
     WHERE s.status='completed' AND s.sale_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY total DESC LIMIT 10`, [from, to],
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
    sellers: sellers.rows,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, message: 'Error interno de API' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Papachito Node API en http://0.0.0.0:${PORT}`);
});
