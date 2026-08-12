# Papachito — reporte técnico para continuar en otro chat

**Fecha del reporte:** 2026-08-09  
**Audiencia:** otra IA o desarrollador que continuará la migración  
**Objetivo:** conservar la operación útil de Papachito en un sistema móvil propio y migrar gradualmente de MySQL/Laragon a PostgreSQL sin perder ventas, detalle, stock ni auditoría.

## Resumen ejecutivo

Existe una aplicación móvil PWA funcional en `C:\laragon\www\papachito_movil` que se conecta por Wi‑Fi a una laptop con PHP en `0.0.0.0:8088`. El sistema antiguo Laravel está en `C:\laragon\www\wilcatsystems_papachito` y usa la base MySQL `db_papachito`.

La aplicación móvil ya resuelve venta rápida, catálogo, carrito, efectivo/Yape-Plin, cola offline, sincronización, historial, anulación, eliminación definitiva de anuladas, QR BBVA, reporte por fechas y detalle de compra. La sincronización real todavía pasa por `PuntoVentaController::registrar_venta_directa`; PostgreSQL aún no está instalado ni conectado.

**Regla principal:** no borrar ni alterar el Laravel/MySQL original hasta que PostgreSQL pase pruebas de lectura, venta, desconexión, sincronización, reporte, anulación y recuperación.

## Ubicaciones y runtime

| Elemento | Ubicación/valor |
|---|---|
| Workspace | `C:\Users\e\OneDrive\Documentos\Sistema Papachito` |
| PWA móvil | `C:\laragon\www\papachito_movil` |
| Laravel original | `C:\laragon\www\wilcatsystems_papachito` |
| Servidor móvil | PHP built-in `0.0.0.0:8088` |
| URL Wi‑Fi observada | `http://192.168.84.9:8088/` (puede cambiar) |
| DB actual | MySQL `db_papachito` |
| Backup SQL existente | `C:\laragon\backups\papachito_movil\db_papachito_before_mobile_20260720_224328.sql` |
| PostgreSQL preparado | `postgresql-migration/` |
| Base PostgreSQL prevista | `papachito_app` |
| Rol PostgreSQL previsto | `papachito_app` |

No hay repositorio Git en el workspace; el historial se conserva en estos Markdown y en las copias indicadas.

## Funcionalidad implementada

- PIN local con hash; la sesión se conserva para uso offline después del primer acceso.
- Catálogo desde MySQL, caché IndexedDB y categorías simplificadas.
- Carrito con `+`, `−` y botón visible `🗑 Quitar`.
- Soles con dos decimales; recibido se completa automáticamente al total.
- Efectivo y Yape/Plin.
- UUID compatible con navegadores sin `crypto.randomUUID`.
- Cola offline en IndexedDB `papachito-mobile-v1`.
- Reintento periódico cada 10 segundos; recupera estados `pending`, `error` y `syncing`.
- Idempotencia y auditoría en `mobile_sales`/`mobile_audit` mientras MySQL siga activo.
- Historial de últimas 100 operaciones, fecha/hora/segundos y ficha detallada por compra.
- Anulación con reversión mediante el controlador legado.
- Eliminación definitiva solo después de anular, con confirmación y auditoría.
- QR BBVA estático en `public/payment-qr.jpg`; aparece después de confirmar Yape/Plin y tiene botón Cerrar.
- Reporte con fechas, presets Hoy/7 días/30 días/Este mes, total vendido, operaciones, promedio, gráfico lineal, medios de pago y productos más vendidos.
- Importes siempre completos (`S/ 2000.00`), nunca abreviados como `2K`.
- PWA cache actual: `papachito-mobile-v8`.

## Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `public/index.html` | Pantallas Venta, Historial, Reporte, Ajustes, carrito y modales |
| `public/assets/app.js` | Estado, IndexedDB, API, sincronización, historial, reportes y detalle |
| `public/assets/styles.css` | Estilo base móvil |
| `public/assets/report.css` | Reporte, gráfico, detalle y navegación de cuatro botones |
| `public/api.php` | API PHP autenticada y endpoints de catálogo, ventas, reportes y detalle |
| `src/bootstrap.php` | PDO MySQL, sesión, CSRF, auditoría y puente Laravel |
| `public/sw.js` | Caché PWA y recuperación offline |
| `start-mobile.ps1` | Arranque del servidor PHP |
| `postgresql-migration/` | Instalación, esquema mínimo, mapeo y habilitación PHP PostgreSQL |

## API actual

- `GET /api/estado`
- `POST /api/auth/pin`
- `GET /api/catalogo`
- `GET /api/ventas/hoy` — nombre histórico del endpoint; devuelve últimas 100 operaciones móviles.
- `POST /api/ventas/sincronizar`
- `GET /api/ventas/{uuid}/detalle`
- `POST /api/ventas/{uuid}/anular`
- `DELETE /api/ventas/{uuid}` — solo venta móvil ya anulada.
- `GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`
- `GET /api/red` y `GET /api/red/qr`

## Datos que realmente se usan

La aplicación móvil consulta o usa actualmente:

| MySQL | Uso |
|---|---|
| `productos` | id, nombre, precio, unidad, activo |
| `categorias` | nombre de categoría |
| `producto_stock` | stock por almacén |
| `cpe_cabecera` | documento, fecha, total, estado/anulación |
| `cpe_detalle` | productos, cantidades y subtotales |
| `medios_pagos` | nombre de medio |
| `venta_medio_pago` | monto por medio |
| `mobile_sales` | UUID, payload, idempotencia y estado móvil |
| `mobile_audit` | trazabilidad técnica |

En la última inspección había aproximadamente 340 productos, 124 filas de stock, 1,071 cabeceras, 2,226 detalles y 1,071 registros de pago. La cifra cambia con el sistema; revalidarla antes de migrar.

## PostgreSQL preparado

`postgresql-migration/sql/01-schema.sql` define un modelo propio mínimo:

`categories`, `products`, `product_stock`, `payment_methods`, `sales`, `sale_items`, `sale_payments`, `inventory_movements`, `audit_log` y vista `daily_sales`.

Scripts:

1. `01-install-postgresql.ps1` — requiere PowerShell elevado; instala PostgreSQL 17 con winget.
2. `02-verify-install.ps1` — comprueba servicio, `psql` y puerto 5432.
3. `03-create-database.ps1` — crea rol/base y aplica SQL; solicita contraseñas sin escribirlas en archivos.
4. `04-enable-php-driver.ps1` — habilita `pdo_pgsql`/`pgsql` y respalda `php.ini`; requiere elevación.

PostgreSQL no estaba instalado en la última verificación; PHP 7.2 sí contiene los DLL PostgreSQL, pero están desactivados. Recomendación: PostgreSQL 17, puerto local 5432, base `papachito_app`, rol `papachito_app`.

## Pruebas ya realizadas

- Login, catálogo y acceso por Wi‑Fi.
- Venta de prueba sin afectar MySQL.
- Venta real desconectada: quedó pendiente, servidor volvió, sincronizó automáticamente.
- Anulación real y eliminación definitiva de una operación creada expresamente para probar; se verificaron cero filas restantes en cabecera, detalle, movimiento, pago y `mobile_sales`.
- Compatibilidad UUID sin `crypto.randomUUID`.
- QR BBVA abre y cierra en viewport móvil.
- Reporte contrastado contra consulta SQL directa: total y cantidad coincidieron.
- Detalle de una boleta anulada mostró documento, hora exacta, producto, cantidad, precio y total original.

## Riesgos y límites

- `bitacora.md` contiene credenciales en texto plano. No copiarlas a reportes, skills, prompts ni commits; rotarlas antes de compartir el equipo.
- El secreto del PIN se conserva como hash en `config/app.php`; no trasladarlo a PostgreSQL como texto.
- La utilidad/ganancia real no está definida por costos confiables; reportar “total vendido”, no “ganancia”, hasta modelar costos.
- Los documentos y movimientos SUNAT complejos del sistema legado no están en el modelo mínimo; validar si se requieren antes de retirar Laravel.
- La fecha/hora debe normalizarse a `America/Lima` en PostgreSQL y en la aplicación.
- No usar el directorio completo `C:\laragon\data\mysql` como respaldo del proyecto: puede contener bases ajenas. Exportar solo `db_papachito`.

## Próxima ruta segura

1. Respaldar `db_papachito` y el código sin mover ni borrar el legado.
2. Instalar PostgreSQL 17 con elevación manual del usuario.
3. Crear `papachito_app`, aplicar esquema y cargar catálogos.
4. Crear adaptador de persistencia con feature flag `DB_DRIVER=mysql|pgsql`.
5. Migrar un rango pequeño y comparar conteos, totales, productos y pagos.
6. Probar venta offline, sync, reporte, anulación y restauración en PostgreSQL.
7. Hacer PostgreSQL la fuente activa solo después de una prueba de aceptación.
8. Mantener el legado intacto hasta completar la ventana de recuperación.

## Prompt para otra IA

```text
Trabaja en el proyecto Papachito descrito en PROJECT-HANDOFF.md. Lee primero PROJECT-HANDOFF.md, SYSTEM-MOVEMENT.md y codex-skills/papachito-handoff/SKILL.md. El sistema legado Laravel está en C:\laragon\www\wilcatsystems_papachito y la PWA en C:\laragon\www\papachito_movil. No borres ni alteres MySQL/Laragon. PostgreSQL debe ser una base nueva llamada papachito_app, usando el esquema de postgresql-migration/sql/01-schema.sql. Conserva venta offline, sincronización, historial detallado, reportes, anulación y auditoría. Nunca imprimas, copies ni guardes credenciales. Antes de cada cambio reporta archivos afectados, riesgo, prueba y reversión. Implementa solo el siguiente paso solicitado y termina con validaciones reproducibles.
```

