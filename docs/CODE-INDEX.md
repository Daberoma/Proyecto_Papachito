# Índice rápido de código

Lee este mapa antes de editar. Modifica el módulo más pequeño posible y conserva los contratos API.

## App móvil (`mobile/`)

| Necesidad | Ubicación |
|---|---|
| Arranque y composición | `App.tsx` / `src/AppShell.tsx` |
| Pantallas | `src/screens/` |
| Componentes visuales | `src/components/` |
| API y conexión | `src/services/` |
| Caché y cola offline | `src/storage/` y `src/offline.ts` |
| Tipos | `src/types/` |
| Tema y estilos | `src/theme/` |

## Backend (`backend-node/`)

| Necesidad | Ubicación |
|---|---|
| Arranque Express | `src/server.js` |
| Rutas HTTP | `src/routes/` |
| Casos de uso | `src/services/` |
| PostgreSQL | `src/db/` |
| Validaciones y utilidades | `src/utils/` |

No colocar consultas SQL nuevas directamente en rutas. Mantener las respuestas existentes (`ok`, `products`, `sales`, `summary`).

## Base de datos

- Esquema: `postgresql-migration/sql/01-schema.sql`.
- Datos de referencia: `02-reference-data.sql`.
- Migraciones: `postgresql-migration/`.
- Credenciales y volcados reales: solo localmente, nunca en Git.

## Flujo de una venta

`screen sale` → carrito → `queueSale` local → `syncPendingSales` → API `/api/ventas/sincronizar` → PostgreSQL → historial/reportes.

## Validación mínima

App: `tsc --noEmit`, `npx expo-doctor`.

Backend: `GET /api/salud`, catálogo, sincronización idempotente, anulación y reporte.
