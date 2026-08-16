/** Configuración central de la API. No contiene secretos; la contraseña se inyecta por entorno. */
export const PORT = Number(process.env.PORT || 8090);
export const DB_PASSWORD = process.env.PAPACHITO_PG_PASSWORD;
export const DB_CONFIG = {
  host: process.env.PAPACHITO_PG_HOST || '127.0.0.1',
  port: Number(process.env.PAPACHITO_PG_PORT || 5432),
  database: process.env.PAPACHITO_PG_DATABASE || 'papachito_app',
  user: process.env.PAPACHITO_PG_USER || 'papachito_app',
  password: DB_PASSWORD,
  max: Number(process.env.PAPACHITO_PG_POOL_MAX || 8),
};
