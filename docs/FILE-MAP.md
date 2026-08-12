# Mapa real de archivos — Papachito

## Estado auditado 2026-08-09

| Archivo/carpeta | Responsabilidad actual | Dependencia | Acción prevista |
|---|---|---|---|
| `C:\laragon\www\papachito_movil\public\index.html` | Pantallas móviles y modales | PWA | Reutilizar visualmente; separar por pantallas en Expo después |
| `public/assets/app.js` | Estado, carrito, API, IndexedDB, sincronización, historial y reportes | MySQL/API PHP | Dividir progresivamente por dominio |
| `public/assets/styles.css`, `report.css` | Diseño móvil y reporte | Ninguna | Fuente del sistema visual |
| `public/api.php` | Endpoints HTTP y reglas de entrada | `src/bootstrap.php` | Conservar contratos; extraer servicios |
| `src/bootstrap.php` | PDO MySQL, sesión, CSRF, puente legado | MySQL/Laravel | Adaptador `mysql|pgsql` con feature flag |
| `public/sw.js` | Caché PWA/offline | Navegador | Sustituir por SQLite/NetInfo en Expo |
| `postgresql-migration/` | Esquema y scripts de preparación | PostgreSQL aún no instalado | Base para migración reversible |
| `C:\laragon\www\wilcatsystems_papachito` | Sistema legado Laravel | MySQL `db_papachito` | Solo fuente histórica hasta validación |

## Hallazgos

- No existe una aplicación Expo/React Native en el workspace auditado.
- `package.json` corresponde a Next/Vinext y no declara Expo.
- La API móvil usa PDO MySQL y llama al controlador legado `PuntoVentaController`.
- El esquema Drizzle está vacío; no es la base operativa actual.
- No se detectaron carpetas `backend/` o `mobile/` independientes en el proyecto activo.
- No se eliminará ni moverá el legado durante esta fase.

## Regla de lectura

Para cambios de interfaz leer primero `index.html`, el módulo de evento correspondiente y su CSS. Para datos leer `api.php`, `bootstrap.php` y el contrato de migración; no leer el legado completo salvo una tabla o flujo concreto.
