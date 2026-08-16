# Base de datos Papachito

Este directorio contiene un volcado completo de la base PostgreSQL `papachito_app`:

- `papachito-full-data.sql`: formato SQL legible y portable.
- `papachito-full-data.dump`: formato PostgreSQL custom para `pg_restore`.

Los volcados incluyen esquema, productos, ventas, historial y datos registrados. No incluyen contraseñas de roles ni archivos de credenciales del equipo.

## Restaurar

```powershell
createdb -U papachito_app papachito_app_restored
psql -U papachito_app -d papachito_app_restored -f .\papachito-full-data.sql
```

O con el formato custom:

```powershell
createdb -U papachito_app papachito_app_restored
pg_restore -U papachito_app -d papachito_app_restored .\papachito-full-data.dump
```
