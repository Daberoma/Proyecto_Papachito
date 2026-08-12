# Proyecto Papachito — guía para continuar

## Qué contiene

- `backend-node/`: API independiente en Node.js para catálogo, ventas, sincronización offline, reportes y configuración de productos.
- `mobile/`: aplicación Expo/React Native **Donde Papachito** para Android. Incluye caché local, modo offline, sincronización, historial, reportes y conexión por IP/QR.
- `database/` y `postgresql-migration/`: esquema y migraciones reproducibles de PostgreSQL. No se incluyen contraseñas ni volcados productivos.
- `docs/`: documentación funcional y de despliegue.
- `start-papachito-background.ps1`: arranque local del servidor en el puerto 8090.

## Flujo funcional

1. Primer arranque: la app solicita el nombre del vendedor y lo guarda localmente.
2. Catálogo: primero muestra la copia local; luego intenta la API guardada o detecta la laptop en la red.
3. Venta: se puede confirmar en efectivo o Yape/Plin. Sin conexión, queda pendiente en almacenamiento local.
4. Reconexión: la cola se sincroniza automáticamente y conserva el nombre del vendedor.
5. Historial y reporte: muestran ventas sincronizadas, pendientes, anulaciones, totales diarios/mensuales/anuales e histórico.
6. Ajustes: editar nombre, servidor, escanear QR y agregar productos.

## Desarrollo

### API

```powershell
Set-Location backend-node
npm install
npm start
```

La API escucha en `0.0.0.0:8090`. No hardcodear credenciales; usar variables de entorno o un gestor de secretos local.

### App móvil

```powershell
Set-Location mobile
npm install
npx expo start --lan
```

Para un APK interno, usar el perfil `preview` de EAS. El icono y el nombre están configurados en `mobile/app.json`.

## Seguridad obligatoria

- Nunca subir `.secrets/`, `.env`, contraseñas, tokens, claves privadas, QR de pago ni volcados reales.
- Cambiar cualquier contraseña que haya sido compartida en chats o archivos locales.
- Mantener el repositorio privado y limitar colaboradores.
- Antes de publicar, revisar `git diff --cached` y el historial para evitar secretos.
