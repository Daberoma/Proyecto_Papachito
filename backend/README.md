# API propia PostgreSQL

Arranque de prueba:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\e\OneDrive\Documentos\Sistema Papachito\backend\start-api.ps1"
```

Endpoints implementados: `GET /api/catalogo`, `POST/DELETE /api/config/productos`, `POST /api/ventas/sincronizar`, `GET /api/ventas` y `GET /api/reportes`. La API no contiene credenciales ni acceso a MySQL/Laravel.
