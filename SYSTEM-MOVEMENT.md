# Registro de movimiento del proyecto

Formato compacto: fecha · movimiento · evidencia · siguiente acción.

## 2026-08-09

- Se creó este reporte técnico para continuidad en otro chat.
- Se creó la skill portátil `codex-skills/papachito-handoff` con roles de inventario, migración, adaptador, QA y seguridad.
- Se confirmó que el workspace no tiene repositorio Git; la trazabilidad queda en Markdown y copias de seguridad.
- Se detectó `bitacora.md` con credenciales en texto plano. No se copiaron al reporte; deben rotarse antes de compartir.
- Se validó la estructura de la skill manualmente; el validador oficial no pudo ejecutarse porque el Python disponible no tiene el módulo `yaml`.

## 2026-07-27

- PostgreSQL no estaba instalado: sin `psql`, servicio PostgreSQL ni puerto 5432.
- Windows 10 Pro 64 bits, aproximadamente 134.56 GB libres en C:, winget disponible, sesión sin administrador.
- Se prepararon scripts para instalar PostgreSQL 17, crear `papachito_app`, habilitar `pdo_pgsql` y aplicar el esquema mínimo.
- El esquema propio cubre categorías, productos, stock, ventas, detalles, pagos, movimientos y auditoría.

## 2026-07-21

- Se añadió Reporte en el cuarto botón inferior: fechas, total vendido, operaciones, promedio, gráfico lineal, pagos y productos.
- Se amplió Historial a últimas 100 operaciones y se añadió detalle con hora exacta, documento, productos, cantidad, precio y total original.
- Se validó reporte contra SQL directo y se corrigió conflicto de variable `document` en el detalle.
- Service worker actualizado a `papachito-mobile-v8`.

## 2026-07-20 → 2026-07-21

- Se creó Papachito Móvil PWA en `C:\laragon\www\papachito_movil`.
- Se conectó catálogo a Laravel/MySQL mediante `legacy_bridge`.
- Se implementaron PIN, CSRF, IndexedDB offline, sincronización, reintentos, auditoría, anulación y eliminación definitiva.
- Se corrigió `crypto.randomUUID` para navegadores antiguos.
- Se agregó QR BBVA y botón Cerrar para Yape/Plin.
- Se verificó una venta desconectada que luego sincronizó automáticamente.
- Se creó backup SQL `C:\laragon\backups\papachito_movil\db_papachito_before_mobile_20260720_224328.sql`.

## 2026-08-09 — auditoria maestro

- Se inspeccionaron los documentos principales y `postgresql-migration/` antes de modificar.
- Se verifico que la aplicacion activa es PWA PHP/HTML/JS; no existe Expo operativo en el proyecto auditado.
- Se verifico que `src/bootstrap.php` usa PDO MySQL y el puente `PuntoVentaController`; PostgreSQL y `psql` no estan disponibles.
- Se crearon `docs/AUDIT-2026-08-09.md`, `docs/FILE-MAP.md`, `docs/FLOW-MAP.md`, `docs/ARCHITECTURE.md` y `docs/DATABASE-STATUS.md`.
- No se instalaron paquetes, no se tocaron bases y no se movio ni elimino el legado.
- Siguiente paso seguro pendiente de aprobacion: adaptador reversible `DB_DRIVER=mysql|pgsql` y prueba de lectura sobre PostgreSQL nuevo.

## Reglas para nuevas entradas

- Registrar únicamente hechos comprobables: archivo, endpoint, consulta, prueba o bloqueo.
- No incluir contraseñas, PIN, tokens, cookies ni datos personales completos.
- No declarar una migración terminada si no se probó lectura, escritura, offline, cancelación y recuperación.
- Si se cambia una base o se elimina algo, registrar backup, alcance y forma de restauración.
