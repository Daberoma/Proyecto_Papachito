import { Router } from 'express';
import { pool } from '../db/pool.js';

export function catalogRouter() {
  const router = Router();
  router.get('/api/catalogo', async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT p.id, p.legacy_id, p.sku, p.barcode, p.name, p.description,
               p.sale_price AS price, p.unit_code AS unit,
               COALESCE(c.name,'Otros') AS category,
               COALESCE(s.quantity,0) AS stock
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_stock s ON s.product_id = p.id AND s.warehouse_id = 20
        WHERE p.active
        ORDER BY p.name
      `);
      res.json({ ok: true, products: result.rows });
    } catch (error) { next(error); }
  });
  return router;
}
