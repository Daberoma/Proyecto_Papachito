import pg from 'pg';
import { DB_CONFIG, DB_PASSWORD } from '../config.js';

const { Pool } = pg;
if (!DB_PASSWORD) {
  console.error('Falta PAPACHITO_PG_PASSWORD');
  process.exit(1);
}

/** Pool único compartido por las rutas. Centralizarlo evita conexiones duplicadas. */
export const pool = new Pool(DB_CONFIG);
