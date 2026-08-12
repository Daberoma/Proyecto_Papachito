# Base de datos de Donde Papachito

Esta carpeta contiene únicamente el esquema y material reproducible de la base PostgreSQL. No contiene credenciales ni datos productivos.

## Inicialización

1. Instalar PostgreSQL 15+.
2. Crear una base local, por ejemplo `papachito`.
3. Ejecutar los scripts de `postgresql-migration/sql/` en orden:
   - `01-schema.sql`
   - `02-reference-data.sql`
   - `03-product-description.sql`
4. Configurar las variables locales en un archivo `.env` (que no se sube): `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.

El backend Node utiliza PostgreSQL como fuente de datos del catálogo, ventas, reportes y sincronización offline. La app móvil conserva una caché local y envía las ventas pendientes cuando vuelve la conexión.

## Datos reales

Los volcados con ventas/productos reales deben mantenerse fuera de GitHub, en una copia cifrada o en un almacenamiento privado con control de acceso. Para compartir una muestra de desarrollo, usar datos ficticios y eliminar nombres, teléfonos, usuarios y credenciales.
