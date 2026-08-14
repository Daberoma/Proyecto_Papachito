import { Router } from 'express';
import { pool } from '../db/pool.js';

export function healthRouter() {
  const router = Router();
  router.get('/api/salud', async (_req, res, next) => {
    try {
      const result = await pool.query('select now() as now');
      res.json({ ok: true, now: result.rows[0].now });
    } catch (error) { next(error); }
  });
  return router;
}
