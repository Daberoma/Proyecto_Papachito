import { Router } from 'express';
import { pool } from '../db/pool.js';

export function catalogRouter() {
  const router = Router();
  router.get('/api/catalogo', async (_req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT p.id, p.legacy_id, p.sku, p.barcode, p.name, p.description, pi.image_url AS "imageUrl",
               p.sale_price AS price, p.unit_code AS unit,
               COALESCE(c.name,'Otros') AS category,
               COALESCE(s.quantity,0) AS stock,
               pp.presentation_type AS "presentationType",
               pp.quantity AS "presentationQuantity",
               pp.label AS "presentationLabel",
               pp.color_key AS "presentationColor",
               COALESCE(pp.group_id, g.id) AS "presentationGroupId"
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_stock s ON s.product_id = p.id AND s.warehouse_id = 20
        LEFT JOIN product_images pi ON pi.product_id = p.id
        LEFT JOIN product_presentations pp ON pp.product_id = p.id
        LEFT JOIN product_groups g ON lower(g.name) = lower(p.name)
          AND lower(g.category_name) = lower(COALESCE(c.name, 'Otros'))
        WHERE p.active
        ORDER BY p.name
      `);
      res.json({ ok: true, products: result.rows });
    } catch (error) { next(error); }
  });
  return router;
}
