---
name: papachito-handoff
description: Use when continuing, rebuilding, migrating, or reviewing the Papachito Móvil system from a separate chat. Read the project handoff and movement log first, preserve the legacy Laravel/MySQL system, never expose credentials, and implement only the next verified migration step.
---

# Papachito Handoff

Use this skill to resume work on Papachito Móvil without reconstructing the history from chat. It is a portable workspace skill: its source of truth is the Markdown handoff in the project root, not hidden assistant memory.

## Required workflow

1. Read `../../PROJECT-HANDOFF.md` and `../../SYSTEM-MOVEMENT.md` before changing code.
2. Inspect the current files and runtime before trusting the handoff; dates and process state may have changed.
3. Keep `C:\laragon\www\wilcatsystems_papachito` and its MySQL database intact until PostgreSQL has passed a read/write/cancellation test.
4. Treat `bitacora.md` as sensitive. Do not copy, quote, or print credentials. Recommend rotation if they appear in plaintext.
5. Work in small reversible steps. Back up before schema or data changes, and never delete the legacy source as part of migration preparation.
6. Validate each change with syntax checks, database checks, and a mobile UI smoke test when applicable.
7. Append a concise entry to `SYSTEM-MOVEMENT.md` describing files changed, checks run, and remaining risks.

## Mapa de edición rápida

Antes de editar, leer `docs/CODE-INDEX.md`. La lógica nueva debe ir en el módulo de su capa:

- UI móvil: `mobile/src/screens/` y `mobile/src/components/`.
- API móvil: `mobile/src/services/`.
- Offline: `mobile/src/storage/` y `mobile/src/offline.ts`.
- Rutas backend: `backend-node/src/routes/`.
- Casos de negocio: `backend-node/src/services/`.
- PostgreSQL: `backend-node/src/db/` y `postgresql-migration/sql/`.

No añadir funcionalidad nueva a los archivos raíz si existe un módulo apropiado. Actualizar el índice cuando cambie el flujo y ejecutar la validación de la capa afectada.

## Migration rules

- The target is a new PostgreSQL database named `papachito_app` with application role `papachito_app`.
- Use the minimal normalized model in `postgresql-migration/sql/01-schema.sql`.
- Preserve product-name snapshots and original sale payloads so historical detail remains available after product edits.
- Keep cancelled sales auditable; exclude them from totals. Permanent deletion requires an explicit user action and a database audit record.
- Do not invent profit: the reliable metric is total sold unless validated cost data is available.
- Do not place passwords in Markdown, source code, SQL files, shell history, or generated reports.

## Agent roles

Read `references/agent-roles.md` when parallel work is useful. Agents may inspect independently, but only one agent should mutate a given migration file at a time.
