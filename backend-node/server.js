import express from 'express';
import cors from 'cors';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT } from './src/config.js';
import { pool } from './src/db/pool.js';
import { stableUuid } from './src/utils/stableUuid.js';
import { healthRouter } from './src/routes/health.routes.js';
import { catalogRouter } from './src/routes/catalog.routes.js';
import QRCode from 'qrcode';

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(healthRouter());
app.use(catalogRouter());

const qrMethods = new Set(['yape', 'plin', 'bbva']);
const paymentMethodNames = { yape: 'YAPE', plin: 'PLIN', bbva: 'BBVA' };
const qrStorageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'storage', 'payment-qr');
const productImageStorageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'storage', 'product-images');
const mobileConnections = new Map();
const qrMimeExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
app.use('/media/product-images', express.static(productImageStorageDir));

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

function limaDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function reportOriginPredicate(origin, alias = 's') {
  const imported = `(${alias}.legacy_cpe_id IS NOT NULL OR COALESCE(${alias}.original_payload->>'legacy_id', '') <> '')`;
  if (origin === 'historical') return imported;
  if (origin === 'current') return `NOT ${imported}`;
  return 'TRUE';
}

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  let fallback = '';
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== 'IPv4' || entry.internal || entry.address.startsWith('169.254.')) continue;
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(entry.address)) return entry.address;
      if (!fallback) fallback = entry.address;
    }
  }
  return fallback;
}

app.get('/api/conexion/qr', async (req, res, next) => {
  try {
    const host = getLanAddress() || req.hostname || '127.0.0.1';
    const apiBase = `http://${host}:${PORT}`;
    const webPort = Number(process.env.PAPACHITO_WEB_PORT || 8091);
    const webUrl = `http://${host}:${webPort}`;
    const connectionUrl = `papachito://connect?api=${encodeURIComponent(apiBase)}&web=${encodeURIComponent(webUrl)}`;
    const qrDataUrl = await QRCode.toDataURL(connectionUrl, { width: 360, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ ok: true, apiBase, webUrl, connectionUrl, qrDataUrl });
  } catch (error) { next(error); }
});

app.post('/api/conexion/registrar', (req, res) => {
  const id = String(req.body?.deviceId || req.ip || 'app-movil').slice(0, 120);
  mobileConnections.set(id, { id, device: String(req.body?.device || 'App móvil').slice(0, 80), ip: String(req.ip || '').replace('::ffff:', ''), lastSeenAt: Date.now() });
  res.json({ ok: true, connected: true, deviceId: id });
});

app.get('/api/conexion/estado', (_req, res) => {
  const now = Date.now();
  for (const [id, connection] of mobileConnections) if (now - connection.lastSeenAt >= 180000) mobileConnections.delete(id);
  const devices = [...mobileConnections.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  res.json({ ok: true, connected: devices.length > 0, devices });
});

async function removeStoredQr(fileName) {
  if (!fileName) return;
  await fs.unlink(path.join(qrStorageDir, path.basename(fileName))).catch(() => {});
}

app.get('/api/config/medios-pago', async (_req, res, next) => {
  try {
    const [result, methods] = await Promise.all([pool.query(
      `SELECT method, mime_type, version, updated_at
       FROM payment_qr_config ORDER BY method`,
    ), pool.query(
      `SELECT code, active FROM payment_methods WHERE code = ANY($1::text[])`,
      [['yape', 'plin', 'bbva']],
    )]);
    res.json({
      ok: true,
      methods: ['yape', 'plin', 'bbva'].map((method) => ({
        method,
        enabled: methods.rows.find((row) => row.code === method)?.active ?? (method === 'yape'),
      })),
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

app.put('/api/config/medios-pago/:method', async (req, res, next) => {
  try {
    const method = normalizeQrMethod(req.params.method);
    if (!method || typeof req.body?.enabled !== 'boolean') return res.status(422).json({ ok: false, message: 'Configuración de medio no válida' });
    const result = await pool.query(
      `INSERT INTO payment_methods(code,name,active) VALUES($1,$2,$3)
       ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, active=EXCLUDED.active
       RETURNING code, active`,
      [method, paymentMethodNames[method], req.body.enabled],
    );
    res.json({ ok: true, method: result.rows[0].code, enabled: result.rows[0].active });
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
  const presentationType = String(req.body.presentationType || 'unit').trim().toLowerCase() || 'unit';
  const presentationQuantity = Math.max(1, Math.floor(Number(req.body.presentationQuantity || 1)));
  const presentationLabel = String(req.body.presentationLabel || (presentationType === 'unit' ? 'Unidad' : `${presentationType} x${presentationQuantity}`)).trim();
  const presentationColor = String(req.body.presentationColor || presentationType).trim().toLowerCase();
  const image = req.body.imageData ? parseQrData(req.body.imageData, req.body.imageMimeType) : null;
  if (!name || !Number.isFinite(price) || price < 0) return res.status(422).json({ ok: false, message: 'Se requieren nombre y precio válidos' });
  if (req.body.imageData && !image) return res.status(422).json({ ok: false, message: 'La imagen del producto no es válida' });

  const client = await pool.connect();
  let imageFileName = '';
  try {
    await client.query('begin');
    const cat = await client.query(
      `INSERT INTO categories(name) VALUES($1)
       ON CONFLICT(name) DO UPDATE SET active=TRUE
       RETURNING id`,
      [category],
    );
    if (image) {
      await fs.mkdir(productImageStorageDir, { recursive: true });
      imageFileName = `product-${Date.now()}-${Math.random().toString(16).slice(2)}.${image.extension}`;
      await fs.writeFile(path.join(productImageStorageDir, imageFileName), image.buffer);
    }
    const product = await client.query(
      `INSERT INTO products(category_id,name,description,unit_code,sale_price,active)
       VALUES($1,$2,$3,'NIU',$4,TRUE)
       RETURNING id`,
      [cat.rows[0].id, name, description, price],
    );
    if (imageFileName) await client.query(
      `INSERT INTO product_images(product_id,image_url,updated_at)
       VALUES($1,$2,CURRENT_TIMESTAMP)
       ON CONFLICT(product_id) DO UPDATE SET image_url=EXCLUDED.image_url, updated_at=CURRENT_TIMESTAMP`,
      [product.rows[0].id, `/media/product-images/${imageFileName}`],
    );
    await client.query(
      `INSERT INTO product_stock(product_id,warehouse_id,quantity)
       VALUES($1,20,0)
       ON CONFLICT(product_id,warehouse_id) DO NOTHING`,
      [product.rows[0].id],
    );
    await client.query(
      `INSERT INTO product_presentations(product_id,presentation_type,quantity,label,color_key,updated_at)
       VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
       ON CONFLICT(product_id) DO UPDATE SET presentation_type=EXCLUDED.presentation_type, quantity=EXCLUDED.quantity, label=EXCLUDED.label, color_key=EXCLUDED.color_key, updated_at=CURRENT_TIMESTAMP`,
      [product.rows[0].id, presentationType, presentationQuantity, presentationLabel, presentationColor],
    );
    await client.query('commit');
    res.json({ ok: true, id: product.rows[0].id });
  } catch (error) {
    await client.query('rollback');
    if (imageFileName) await fs.unlink(path.join(productImageStorageDir, imageFileName)).catch(() => {});
    res.status(500).json({ ok: false, message: 'No se pudo crear el producto' });
  } finally {
    client.release();
  }
});

app.put('/api/config/productos/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const price = Number(req.body.price);
    const category = String(req.body.category || 'Otros').trim() || 'Otros';
    const description = String(req.body.description || '').trim();
    const presentationType = String(req.body.presentationType || 'unit').trim().toLowerCase() || 'unit';
    const presentationQuantity = Math.max(1, Math.floor(Number(req.body.presentationQuantity || 1)));
    const presentationLabel = String(req.body.presentationLabel || (presentationType === 'unit' ? 'Unidad' : `${presentationType} x${presentationQuantity}`)).trim();
    const presentationColor = String(req.body.presentationColor || presentationType).trim().toLowerCase();
    if (!Number.isInteger(id) || id <= 0 || !name || !Number.isFinite(price) || price < 0) {
      return res.status(422).json({ ok: false, message: 'Datos de producto no válidos' });
    }
    const client = await pool.connect();
    try {
      await client.query('begin');
      const cat = await client.query(
        `INSERT INTO categories(name) VALUES($1)
         ON CONFLICT(name) DO UPDATE SET active=TRUE
         RETURNING id`,
        [category],
      );
      const updated = await client.query(
        `UPDATE products SET category_id=$1, name=$2, description=$3, sale_price=$4, updated_at=CURRENT_TIMESTAMP
         WHERE id=$5 AND active RETURNING id, name, description, sale_price AS price`,
        [cat.rows[0].id, name, description, price, id],
      );
      if (!updated.rowCount) {
        await client.query('rollback');
        return res.status(404).json({ ok: false, message: 'Producto no encontrado' });
      }
      await client.query(
        `INSERT INTO product_presentations(product_id,presentation_type,quantity,label,color_key,updated_at)
         VALUES($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
         ON CONFLICT(product_id) DO UPDATE SET presentation_type=EXCLUDED.presentation_type, quantity=EXCLUDED.quantity, label=EXCLUDED.label, color_key=EXCLUDED.color_key, updated_at=CURRENT_TIMESTAMP`,
        [id, presentationType, presentationQuantity, presentationLabel, presentationColor],
      );
      await client.query('commit');
      return res.json({ ok: true, product: updated.rows[0] });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) { return next(error); }
});

app.delete('/api/config/productos/:id/permanente', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(422).json({ ok: false, message: 'Producto no válido' });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const target = await client.query(
      `SELECT p.id, p.name, COALESCE(c.name,'Otros') AS category, COALESCE(pp.group_id, g.id) AS group_id
       FROM products p
       LEFT JOIN categories c ON c.id=p.category_id
       LEFT JOIN product_presentations pp ON pp.product_id=p.id
       LEFT JOIN product_groups g ON lower(g.name)=lower(p.name) AND lower(g.category_name)=lower(COALESCE(c.name,'Otros'))
       WHERE p.id=$1 AND p.active`, [id],
    );
    if (!target.rowCount) { await client.query('rollback'); return res.status(404).json({ ok: false, message: 'Producto no encontrado' }); }
    const product = target.rows[0];
    const ids = product.group_id
      ? await client.query(`SELECT p.id FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN product_groups g ON lower(g.name)=lower(p.name) AND lower(g.category_name)=lower(COALESCE(c.name,'Otros')) WHERE p.active AND g.id=$1`, [product.group_id])
      : { rows: [{ id }] };
    const productIds = ids.rows.map((row) => row.id);
    await client.query('DELETE FROM product_images WHERE product_id = ANY($1::bigint[])', [productIds]);
    await client.query('DELETE FROM product_presentations WHERE product_id = ANY($1::bigint[])', [productIds]);
    await client.query('DELETE FROM product_stock WHERE product_id = ANY($1::bigint[])', [productIds]);
    const removed = await client.query('DELETE FROM products WHERE id = ANY($1::bigint[]) RETURNING id', [productIds]);
    if (product.group_id) await client.query('DELETE FROM product_groups WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM products p JOIN product_presentations pp ON pp.product_id=p.id WHERE pp.group_id=$1)', [product.group_id]);
    await client.query('INSERT INTO audit_log(action, details) VALUES($1,$2::jsonb)', ['product_permanently_deleted', JSON.stringify({ productIds, groupId: product.group_id || null, name: product.name })]);
    await client.query('commit');
    return res.json({ ok: true, removed: removed.rowCount, productIds });
  } catch (error) {
    await client.query('rollback');
    return next(error);
  } finally { client.release(); }
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
  const saleDate = limaDate(createdAt);
  // Conserva el proveedor elegido para que Reportes pueda separar Yape, Plin y BBVA.
  // Las ventas antiguas siguen usando digital_wallet y se muestran como histórico combinado.
  const requestedProvider = String(sale.paymentProvider || '').toLowerCase();
  const paymentCode = sale.paymentMethod === 'digital'
    ? (['yape', 'plin', 'bbva'].includes(requestedProvider) ? requestedProvider : 'digital_wallet')
    : 'cash';
  const paymentName = ({ cash: 'EFECTIVO', yape: 'YAPE', plin: 'PLIN', bbva: 'BBVA', digital_wallet: 'YAPE / PLIN' }[paymentCode] || 'YAPE / PLIN');
  const client = await pool.connect();
  const warnings = [];
  try {
    await client.query('begin');
    const inserted = await client.query(
      `INSERT INTO sales(sale_uuid,document_type,status,customer_document,customer_name,currency,sale_date,sold_at,total,amount_received,change_amount,original_payload)
       VALUES($1,'03','completed','00000000',$5,'PEN',$2,$3,$4,$4,0,$6::jsonb)
       ON CONFLICT (sale_uuid) DO NOTHING
       RETURNING id`,
      [uuid, saleDate, createdAt.toISOString(), total, seller, JSON.stringify(sale)],
    );
    if (!inserted.rowCount) {
      await client.query('commit');
      return res.json({ ok: true, uuid, duplicate: true, warnings: [] });
    }
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
      if (productId) {
        const stock = await client.query('UPDATE product_stock SET quantity=quantity-$1, updated_at=CURRENT_TIMESTAMP WHERE product_id=$2 AND warehouse_id=20 RETURNING quantity', [qty, productId]);
        if (!stock.rowCount) warnings.push({ code: 'stock_missing', productId, quantity: qty });
        else if (Number(stock.rows[0].quantity) < 0) warnings.push({ code: 'stock_negative', productId, productName: String(item.name || 'Producto').trim(), quantity: qty, stock: Number(stock.rows[0].quantity), resultingStock: Number(stock.rows[0].quantity) });
        await client.query('INSERT INTO inventory_movements(product_id,sale_id,warehouse_id,movement_type,quantity_delta) VALUES($1,$2,20,\'sale\',$3)', [productId, saleId, -qty]);
      }
    }
    let method = await client.query(
      'SELECT id FROM payment_methods WHERE code=$1 OR UPPER(name)=UPPER($2) ORDER BY CASE WHEN code=$1 THEN 0 ELSE 1 END LIMIT 1',
      [paymentCode, paymentName],
    );
    if (!method.rowCount) {
      method = await client.query(
        'INSERT INTO payment_methods(code,name,active) VALUES($1,$2,TRUE) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, active=TRUE RETURNING id',
        [paymentCode, paymentName],
      );
    }
    await client.query('INSERT INTO sale_payments(sale_id,payment_method_id,amount) VALUES($1,$2,$3)', [saleId, method.rows[0]?.id || 1, total]);
    await client.query(`INSERT INTO audit_log(sale_uuid,action,details) VALUES($1,'mobile_sync',$2::jsonb)`, [uuid, JSON.stringify({ seller, local_id: localId })]);
    await client.query('commit');
    res.json({ ok: true, uuid, total, warnings });
  } catch (error) {
    await client.query('rollback');
    res.status(500).json({ ok: false, message: 'No se pudo sincronizar' });
  } finally {
    client.release();
  }
});

app.put('/api/ventas/:uuid', async (req, res) => {
  const uuid = String(req.params.uuid || '').trim();
  const seller = String(req.body?.seller || '').trim();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const normalizedItems = items.map((item) => ({
    id: Number.isFinite(Number(item?.id)) ? Number(item.id) : null,
    name: String(item?.name || '').trim(),
    quantity: Number(item?.quantity),
    price: Number(item?.price ?? item?.unitPrice),
  }));
  if (!uuid || !seller || !normalizedItems.length || normalizedItems.some((item) => !item.name || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.price) || item.price < 0)) {
    return res.status(422).json({ ok: false, message: 'Vendedor y productos válidos son obligatorios' });
  }
  const total = normalizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  if (!Number.isFinite(total) || total <= 0) return res.status(422).json({ ok: false, message: 'El total de la venta debe ser mayor que cero' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id, customer_name, original_payload FROM sales WHERE sale_uuid=$1 AND status=\'completed\' FOR UPDATE', [uuid]);
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ ok: false, message: 'Solo se pueden editar ventas completadas existentes' });
    }
    const oldItems = await client.query('SELECT product_id, quantity FROM sale_items WHERE sale_id=$1', [current.rows[0].id]);
    for (const item of oldItems.rows) {
      if (item.product_id) {
        await client.query('UPDATE product_stock SET quantity=quantity+$1, updated_at=CURRENT_TIMESTAMP WHERE product_id=$2 AND warehouse_id=20', [item.quantity, item.product_id]);
        await client.query('INSERT INTO inventory_movements(product_id,sale_id,warehouse_id,movement_type,quantity_delta) VALUES($1,$2,20,\'adjustment\',$3)', [item.product_id, current.rows[0].id, item.quantity]);
      }
    }
    await client.query('DELETE FROM sale_items WHERE sale_id=$1', [current.rows[0].id]);
    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO sale_items(sale_id,product_id,product_name,quantity,unit_price,line_total) VALUES($1,$2,$3,$4,$5,$6)`,
        [current.rows[0].id, item.id, item.name, item.quantity, item.price, item.quantity * item.price],
      );
      if (item.id) {
        await client.query('UPDATE product_stock SET quantity=quantity-$1, updated_at=CURRENT_TIMESTAMP WHERE product_id=$2 AND warehouse_id=20', [item.quantity, item.id]);
        await client.query('INSERT INTO inventory_movements(product_id,sale_id,warehouse_id,movement_type,quantity_delta) VALUES($1,$2,20,\'adjustment\',$3)', [item.id, current.rows[0].id, -item.quantity]);
      }
    }
    const payload = { ...(current.rows[0].original_payload || {}), seller, items: normalizedItems, total };
    await client.query('UPDATE sales SET customer_name=$2,total=$3,original_payload=$4::jsonb,updated_at=CURRENT_TIMESTAMP WHERE id=$1', [current.rows[0].id, seller, total, JSON.stringify(payload)]);
    await client.query('UPDATE sale_payments SET amount=$1 WHERE id=(SELECT id FROM sale_payments WHERE sale_id=$2 ORDER BY id LIMIT 1)', [total, current.rows[0].id]);
    await client.query(
      `INSERT INTO audit_log(sale_uuid, action, details) VALUES($1,'updated',$2::jsonb)`,
      [uuid, JSON.stringify({ previousSeller: current.rows[0].customer_name, seller, items: normalizedItems, total })],
    );
    await client.query('COMMIT');
    res.json({ ok: true, uuid, seller, items: normalizedItems, total });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ ok: false, message: 'No se pudo actualizar la venta' });
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
    const current = await client.query(`SELECT id FROM sales WHERE sale_uuid=$1 AND status <> 'cancelled' FOR UPDATE`, [uuid]);
    if (!current.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Venta no encontrada o ya anulada' });
    }
    const items = await client.query('SELECT product_id, quantity FROM sale_items WHERE sale_id=$1', [current.rows[0].id]);
    for (const item of items.rows) {
      if (!item.product_id) continue;
      await client.query('UPDATE product_stock SET quantity=quantity+$1, updated_at=CURRENT_TIMESTAMP WHERE product_id=$2 AND warehouse_id=20', [item.quantity, item.product_id]);
      await client.query('INSERT INTO inventory_movements(product_id,sale_id,warehouse_id,movement_type,quantity_delta) VALUES($1,$2,20,\'cancellation\',$3)', [item.product_id, current.rows[0].id, item.quantity]);
    }
    await client.query(`UPDATE sales SET status='cancelled', cancelled_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [current.rows[0].id]);
    await client.query(
      `INSERT INTO audit_log(sale_uuid, action, details) VALUES($1,'cancelled',$2::jsonb)`,
      [uuid, JSON.stringify({ source: 'mobile', reason: 'Anulación manual' })],
    );
    await client.query('COMMIT');
    res.json({ ok: true, uuid, status: 'cancelled', warnings: [] });
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
  const origin = ['current', 'historical', 'all'].includes(String(_req.query.origen || '')) ? String(_req.query.origen) : 'all';
  const completedOnly = String(_req.query.estado || '') === 'completed';
  const filters = [];
  const values = [];
  if (completedOnly) filters.push(`s.status = 'completed'`);
  if (origin !== 'all') filters.push(reportOriginPredicate(origin, 's'));
  if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) { values.push(desde); filters.push(`s.sale_date >= $${values.length}::date`); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) { values.push(hasta); filters.push(`s.sale_date < ($${values.length}::date + INTERVAL '1 day')`); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = desde || hasta ? 5000 : 100;
  values.push(limit);
  const result = await pool.query(`
    SELECT s.sale_uuid AS uuid, s.legacy_cpe_id, s.document_type, s.series, s.document_number, s.status,
           COALESCE(s.original_payload->>'seller', s.customer_name) AS customer_name, s.sold_at, s.total,
           COALESCE((SELECT pm.code FROM sale_payments sp JOIN payment_methods pm ON pm.id=sp.payment_method_id WHERE sp.sale_id=s.id LIMIT 1), 'cash') AS payment_provider,
           COALESCE((SELECT pm.name FROM sale_payments sp JOIN payment_methods pm ON pm.id=sp.payment_method_id WHERE sp.sale_id=s.id LIMIT 1), 'EFECTIVO') AS payment_method_name,
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
  const origin = ['current', 'historical', 'all'].includes(String(_req.query.origen || '')) ? String(_req.query.origen) : 'all';
  const result = await pool.query(`
    SELECT sale_date::date AS date, COUNT(*)::int AS count, COALESCE(SUM(total), 0)::float AS total
    FROM sales
    WHERE status = 'completed' AND ${reportOriginPredicate(origin, 'sales')}
    GROUP BY sale_date::date
    ORDER BY date DESC
  `);
  res.json({ ok: true, days: result.rows });
});

app.get('/api/reportes', async (req, res) => {
  const period = ['dia', 'mes', 'ano', 'historico'].includes(String(req.query.periodo || '')) ? String(req.query.periodo) : 'mes';
  const origin = ['current', 'historical', 'all'].includes(String(req.query.origen || '')) ? String(req.query.origen) : 'current';
  const now = new Date();
  const today = limaDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const from = String(req.query.desde || (period === 'dia'
    ? new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10)
    : period === 'ano' ? yearStart : period === 'historico' ? '1900-01-01' : monthStart));
  const to = String(req.query.hasta || today);
  const grouping = period === 'ano' || period === 'historico' ? 'month' : 'day';
  const trunc = grouping === 'month' ? 'month' : 'day';
  const currentOrigin = reportOriginPredicate(origin, 's');
  const summary = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total
     FROM sales s WHERE status='completed' AND ${currentOrigin} AND sale_date BETWEEN $1 AND $2`,
    [from, to],
  );
  const series = await pool.query(
    `SELECT date_trunc('${trunc}', sale_date::timestamp)::date AS date, COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total
     FROM sales s WHERE status='completed' AND ${currentOrigin} AND sale_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY 1`,
    [from, to],
  );
  const historicalImported = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total),0)::float AS total,
            MIN(sale_date) AS first_date, MAX(sale_date) AS last_date
     FROM sales s WHERE status='completed' AND ${reportOriginPredicate('historical', 's')}`,
  );
  const topProducts = await pool.query(
    `SELECT product_name AS name, COALESCE(SUM(quantity),0)::float AS quantity, COALESCE(SUM(quantity * unit_price),0)::float AS total
     FROM sale_items si JOIN sales s ON s.id=si.sale_id
     WHERE s.status='completed' AND ${currentOrigin} AND s.sale_date BETWEEN $1 AND $2
     GROUP BY product_name ORDER BY total DESC LIMIT 5`, [from, to],
  );
  const payments = await pool.query(
    `SELECT COALESCE(pm.code,'cash') AS code, COALESCE(pm.name,'Otro') AS label, COALESCE(SUM(sp.amount),0)::float AS total
     FROM sale_payments sp JOIN sales s ON s.id=sp.sale_id
     LEFT JOIN payment_methods pm ON pm.id=sp.payment_method_id
     WHERE s.status='completed' AND ${currentOrigin} AND s.sale_date BETWEEN $1 AND $2
     GROUP BY pm.code, pm.name ORDER BY total DESC`, [from, to],
  );
  const sellers = await pool.query(
    `SELECT COALESCE(NULLIF(s.original_payload->>'seller',''), NULLIF(s.customer_name,''), 'Sin nombre') AS label,
            COUNT(*)::int AS count, COALESCE(SUM(s.total),0)::float AS total
     FROM sales s
     WHERE s.status='completed' AND ${currentOrigin} AND s.sale_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY total DESC LIMIT 10`, [from, to],
  );
  const s = summary.rows[0];
  const h = historicalImported.rows[0];
  res.json({
    ok: true,
    period,
    origin,
    readOnly: origin === 'historical',
    from,
    to,
    summary: { count: s.count, total: s.total, average: s.count ? s.total / s.count : 0 },
    series: series.rows,
    historical: { count: h.count, total: h.total, firstDate: h.first_date, lastDate: h.last_date, source: 'Sistema anterior', readOnly: true },
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
