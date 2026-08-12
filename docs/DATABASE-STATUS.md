# Estado de base de datos

- Fuente activa auditada: MySQL `db_papachito` mediante Laravel/PDO.
- PostgreSQL: no instalado, sin `psql` en PATH y sin servicio detectado.
- Scripts disponibles: `postgresql-migration/01-install-postgresql.ps1`, `02-verify-install.ps1`, `03-create-database.ps1`, `04-enable-php-driver.ps1`.
- Esquema previsto: `postgresql-migration/sql/01-schema.sql`.
- No se ejecutó instalación ni creación de base en esta auditoría.
- Antes de instalar: respaldo de `db_papachito`, confirmación de espacio y ejecución elevada por el usuario.
