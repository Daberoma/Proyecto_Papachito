# PostgreSQL para Papachito Móvil

Esta carpeta prepara una base de datos nueva e independiente. Ningún script elimina, altera ni renombra tablas de `db_papachito` en MySQL.

## Decisiones preparadas

- PostgreSQL 17 (rama estable y conservadora para producción).
- Base nueva: `papachito_app`.
- Usuario de aplicación: `papachito_app`.
- Puerto local: `5432`.
- Codificación: UTF-8.
- Contraseñas fuera de archivos y del repositorio.
- Se migrarán únicamente catálogo, stock, ventas, detalle, medios de pago y auditoría usados por la aplicación móvil.

## Orden de instalación

1. Ejecutar PowerShell como administrador.
2. Ejecutar `01-install-postgresql.ps1`. El instalador solicitará la contraseña del administrador `postgres`; no guardarla en esta carpeta.
3. Ejecutar `02-verify-install.ps1` en una terminal normal.
4. Crear la base y el usuario con `03-create-database.ps1` desde una terminal normal. El script pedirá las contraseñas de forma interactiva.
5. Ejecutar `04-enable-php-driver.ps1` como administrador para habilitar `pdo_pgsql` y `pgsql`. El script crea una copia de seguridad del `php.ini`.
6. Reiniciar Papachito Móvil y comprobar la conexión.

## Esquema

`sql/01-schema.sql` contiene el modelo mínimo propio. No replica las más de cien columnas de las tablas antiguas; conserva solamente los datos utilizados por ventas móviles, reportes, stock, anulaciones y auditoría.

La migración de datos y el cambio de conexión de la aplicación se harán en una fase posterior, después de validar una copia completa. Hasta ese momento MySQL seguirá siendo la fuente activa.

