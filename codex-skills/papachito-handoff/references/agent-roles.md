# Safe agent roles

Use these prompts as independent roles in a new chat or multi-agent run. Give every agent the project root and require a final file list plus validation result.

## 1. Legacy inventory agent

Inspect the Laravel/MySQL application and produce a read-only map of tables, columns, routes, and workflows used by Papachito Móvil. Do not edit files or data. Flag secrets without printing them.

## 2. PostgreSQL migration agent

Review `postgresql-migration/`, check PostgreSQL availability, validate the schema, and propose idempotent import steps. Do not install software or alter MySQL without explicit approval.

## 3. Application adapter agent

Design the smallest connection adapter that can switch the mobile API from MySQL to PostgreSQL behind a feature flag. Preserve current API responses and offline queue behavior. Do not remove the legacy bridge.

## 4. QA and data-integrity agent

Run syntax checks and a reversible smoke test for login, catalog, offline sale, sync, history detail, report totals, cancellation, and permanent deletion. Compare totals against the source query and report mismatches.

## 5. Security agent

Scan for plaintext credentials, unsafe backup locations, exposed database ports, and destructive migration steps. Recommend remediation without printing secret values.

