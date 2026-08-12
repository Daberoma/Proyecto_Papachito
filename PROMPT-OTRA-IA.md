# Prompt compacto para continuar Papachito

Copia este bloque en el otro chat:

```text
Continúa el proyecto Papachito usando PROJECT-HANDOFF.md, SYSTEM-MOVEMENT.md y codex-skills/papachito-handoff/SKILL.md como contexto principal. Lee esos archivos antes de actuar.

Sistema legado: C:\laragon\www\wilcatsystems_papachito (Laravel + MySQL db_papachito). PWA móvil: C:\laragon\www\papachito_movil, servidor PHP local 0.0.0.0:8088. No borres ni alteres el legado. PostgreSQL aún debe instalarse y la base nueva será papachito_app con rol papachito_app; usa postgresql-migration/sql/01-schema.sql.

La PWA ya tiene catálogo, carrito, efectivo/Yape-Plin, offline queue, sincronización, historial detallado, reportes, QR BBVA, anulación y eliminación definitiva auditada. El siguiente objetivo es migrar gradualmente la persistencia a PostgreSQL con un feature flag, comparando conteos, totales, productos, pagos, stock, offline/sync y anulaciones antes de cambiar la fuente activa.

No copies, muestres ni guardes credenciales. No hagas cambios destructivos sin backup y confirmación. Trabaja en pasos pequeños; al terminar indica archivos cambiados, pruebas ejecutadas, riesgos y reversión.
```

