# Papachito Mobile (Expo)

Aplicación móvil independiente en preparación. Conserva el diseño de la PWA mediante el sistema visual documentado en `docs/DESIGN-MAP.md`.

Flujo: sesión local → catálogo SQLite → venta online/offline → cola idempotente → API propia → PostgreSQL.

No contiene credenciales ni acceso directo a PostgreSQL. La URL de prueba actual apunta a `http://10.61.167.9:8090`.

Arranque:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\e\OneDrive\Documentos\Sistema Papachito\mobile\start-expo.ps1"
```
