# Arquitectura y diagnóstico

## Situación actual

La operación real es una PWA servida por PHP en `0.0.0.0:8088`. La API usa PDO MySQL y conserva compatibilidad con Laravel. El móvil no accede directamente a la base.

## Objetivo aprobado por el prompt maestro

```text
Expo + React Native + TypeScript + SQLite
             ↓
API propia (autenticación, ventas, sync, reportes)
             ↓
Repositorios y servicios backend
             ↓
PostgreSQL papachito_app
```

## PostgreSQL

Existe un esquema preparado en `postgresql-migration/sql/01-schema.sql` para categorías, productos, stock, medios de pago, ventas, detalles, pagos, movimientos y auditoría. PostgreSQL no está instalado o conectado según la auditoría actual; no se ejecutó ningún script de instalación.

## Riesgos

1. Cambiar la fuente activa antes de comparar conteos, totales, pagos, stock y anulaciones.
2. Romper el contrato de la PWA al dividir `app.js` o mover `api.php`.
3. Perder ventas offline si se cambia IndexedDB sin migración local.
4. Exponer secretos en Markdown, `.env`, commits o respuestas.

## Primer cambio seguro

Crear un adaptador de persistencia detrás de `DB_DRIVER=mysql|pgsql`, sin cambiar la fuente por defecto; probar primero lectura de catálogo y reporte sobre una base PostgreSQL nueva y reversible.

## Reversión

Mantener el legado intacto, conservar backups SQL y volver `DB_DRIVER=mysql`. No borrar tablas ni carpetas durante la migración.
