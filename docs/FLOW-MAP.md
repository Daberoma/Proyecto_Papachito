# Mapa de flujo auditado

## Arranque

`index.html` → `app.js` → `/api/estado` → sesión local → `/api/catalogo` → caché IndexedDB → pantalla Venta.

## Venta online

Producto → carrito local → total/pago → UUID → `/api/ventas/sincronizar` → `api.php` → `bootstrap.php` → MySQL/Laravel (`PuntoVentaController`) → historial y auditoría.

## Venta offline

Producto → UUID → IndexedDB (`pending`) → detector de red/reintento → `syncing` → API → `synced` o `error`. La idempotencia depende del UUID y de `mobile_sales`.

## Historial, detalle y anulación

Historial → `/api/ventas/hoy`; detalle → `/api/ventas/{uuid}/detalle`; anulación → `/api/ventas/{uuid}/anular`; eliminación definitiva solo después de anular → `DELETE /api/ventas/{uuid}`. El cambio a PostgreSQL debe conservar auditoría y reversión de stock.

## Reportes y QR

Reporte → `/api/reportes?desde=&hasta=` → agregados de ventas no anuladas. QR → confirmación Yape/Plin → `public/payment-qr.jpg` → cerrar modal.

## Flujo objetivo

Expo/SQLite → cliente HTTP/API propia → servicios y repositorios backend → PostgreSQL. Laravel/MySQL queda como fuente temporal de comparación.
