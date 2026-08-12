# Sesion Expo y API independiente

Fecha: 2026-08-09

## Hechos comprobados

- La app independiente vive en `mobile/`.
- La API PostgreSQL propia vive en `backend/`.
- El sistema antiguo queda separado en `C:\laragon\www\papachito_movil` y `C:\laragon\www\wilcatsystems_papachito`.
- Expo se actualizo a SDK 57 y `expo-doctor` quedo en 20/20.
- TypeScript compila con `npx tsc --noEmit`.
- Expo esta escuchando en LAN por `10.61.167.9:8081`.
- La URL actual para Expo Go es `exp://10.61.167.9:8081`.
- La app deriva la URL de la API desde el host LAN de Expo; si cambia el Wi-Fi, relanza Expo y tomara el nuevo host.
- El puerto `80` pertenece al servidor viejo/Laragon; si se abre `http://10.61.167.9` sin puerto puede salir EasyPOS.
- Para revisar nuestra app en navegador se usa el puerto `8091`.
- La API que estaba en `8090` estaba mal arrancada desde una carpeta incorrecta y se detuvo.

## Cambios aplicados

- Se quito `expo-router` porque la app actual es de una sola pantalla y no lo necesita.
- Se creo `mobile/App.tsx` con venta movil, vendedor obligatorio, busqueda, carrito, producto rapido, estado online/offline y pendientes.
- Se creo `mobile/src/offline.ts` con cola local y sincronizacion.
- Se agrego `POST /api/ventas/sincronizar` en `backend/public/api.php`.
- Se agregaron scripts:
  - `mobile/start-expo.ps1`
  - `mobile/start-web-8091.ps1`
  - `backend/start-api.ps1`
  - `postgresql-migration/reset-app-password.ps1`
- `mobile/start-expo.ps1` ya no fija una IP manual.
- Se reemplazo la pantalla Expo basica por un mini sistema estilo PWA: Vender, Historial, Reporte y Ajustes.
- Se rediseño la UI/UX principal: primer ingreso con nombre persistente, encabezado con vendedor, buscador global, resultados accionables, estados vacios, layout responsive y ajustes para cambiar nombre.
- El nombre se guarda en AsyncStorage con la clave `papachito.seller`.
- La cola offline sigue en AsyncStorage con la clave `papachito.offline.sales`.
- Para APK se agregaron permisos Android de red y un plugin local `plugins/with-cleartext-traffic.js` para permitir HTTP local al backend dentro del Wi-Fi.
- Verificacion: `npx tsc --noEmit` sin errores y `npx expo-doctor` 20/20.
- Tiempo real actual: NetInfo detecta conectividad y la app reintenta sincronizar cada 15 segundos. WebSocket real queda pendiente para cuando exista un servicio backend socket dedicado.
- Se mejoro Reporte con KPIs, barras por dia con soles completos, mejor dia, top productos, medios de pago y ultimas ventas.
- Se amplio catalogo para `description` y `barcode`; la descripcion se construye desde marca, modelo, unidad, ubicacion, lote y vencimiento cuando existan en MySQL.
- Se creo `postgresql-migration/run-catalog-migration.ps1` para aplicar columnas nuevas y recargar productos desde el sistema antiguo hacia PostgreSQL.
- Se quito el codigo visible de las tarjetas de producto; la descripcion queda limpia.
- Se ejecuto migracion real a PostgreSQL: 340 productos, 340 con descripcion, 124 stocks, 1072 ventas, 2227 items de venta y 1072 pagos.
- Se corrigio `migrate-sales.php` para que sea idempotente: antes de reinsertar items y pagos legacy limpia solo dependientes de ventas migradas, sin tocar ventas moviles nuevas.
- Decision tecnica: PHP queda solo para extraccion/migracion y servidor estatico temporal; la API propia de la app pasa a Node.js en `backend-node/`.
- Se creo `backend-node/server.js` con endpoints `catalogo`, `ventas/sincronizar`, `ventas`, `reportes` y `salud` usando PostgreSQL.
- Se mejoro deteccion de conexion en la app: prueba varias API candidatas, guarda la ultima API buena y muestra la API detectada en Ajustes.
- Reportes ampliados: selector Diario (últimos 7 días), Mensual (mes actual), Anual (año actual) e Histórico (todo el acumulado). El periodo actual se reinicia naturalmente al cambiar de mes, mientras que el histórico conserva las ventas completadas anteriores.
- `GET /api/reportes` ahora devuelve `summary`, serie agrupada según periodo e `historical` con total, cantidad y fechas extremas. La app consulta PostgreSQL cuando hay conexión y mantiene el resumen local como respaldo offline.
- El gráfico muestra soles completos y el reporte incluye acumulado histórico separado para no mezclar contabilidad histórica con el mes en curso.
- Corrección de Reportes: la UI ahora tolera respuestas de la API anterior que no incluyen `historical`, `topProducts` o `payments`; usa datos locales como respaldo sin cerrar la pantalla. También se corrigieron las fechas del gráfico offline para usar valores ISO válidos.
- Identidad móvil: nombre Expo `Donde Papachito`, logo adjunto convertido a `mobile/icon.png`, categorías automáticas (Gaseosas, Aguas, Cervezas, Licores, Snacks, Abarrotes, Limpieza, Cuidado personal y Otros), encabezado separado y más bajo.
- Se reemplazó `SafeAreaView` por `View` para eliminar la advertencia mostrada por Expo Go.
- Conexión dinámica: `detectApiBase` prioriza el host actual detectado por Expo/navegador, deja la IP guardada como respaldo y aplica timeout de 1.2 s para descartar rápidamente el Wi‑Fi anterior.
- Se agregó anulación de ventas: botón `Eliminar` en Historial, borrado local de pendientes y anulación remota con auditoría en PostgreSQL para ventas ya sincronizadas.
- Se preparó inicio automático de Windows con `install-papachito-startup.ps1` y `start-papachito-background.ps1`; la contraseña se guarda cifrada para el usuario de Windows y el servidor Node/API y web se levantan al iniciar sesión.
- APK preview compilado correctamente por EAS con nombre `Donde Papachito` e icono del logo. Build ID: `7298eb7b-7dd4-4d64-a3c8-a7acc4a6d828`.
- APK final recompilado con servidor configurable y recurso Android válido. Build ID: `f8996ef2-5989-4a4d-8f21-6af0dac90dd2`.

## Pendiente para cerrar sincronizacion PostgreSQL

La API necesita la contrasena real del usuario PostgreSQL `papachito_app`.

Si la recuerdas:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\e\OneDrive\Documentos\Sistema Papachito\backend\start-api.ps1"
```

Si no la recuerdas, ejecuta en PowerShell como administrador:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\e\OneDrive\Documentos\Sistema Papachito\postgresql-migration\reset-app-password.ps1"
```

Luego levanta la API con `backend\start-api.ps1`.

No se guardaron contrasenas en este reporte.

## Cambios de conexiÃ³n y QR (2026-08-11)

- La detecciÃ³n prueba primero la API guardada y, si el Wi-Fi cambiÃ³, escanea automÃ¡ticamente la subred detectada por NetInfo. El catÃ¡logo se conserva en AsyncStorage (`papachito.catalog`) para seguir vendiendo sin conexiÃ³n.
- Ajustes incluye lector QR para payload `papachito://connect?api=...`; al leerlo guarda la API y comienza la sincronizaciÃ³n.
- `start-papachito-console.ps1` muestra la IP actual, URLs y un QR en CMD; actualiza el QR cuando cambia la red.
- Se normalizÃ³ el texto visible a `productos` y se agregÃ³ espaciado compacto para pantallas estrechas. `expo-camera` estÃ¡ incluido como plugin nativo.
- VerificaciÃ³n: TypeScript sin errores, configuraciÃ³n Expo resuelta con cÃ¡mara/permisos, scripts PowerShell sin errores de sintaxis y QR generado correctamente.
- Nueva compilaciÃ³n Android enviada a EAS con commit `c8a83b2e`; el Build ID se encuentra en el historial EAS y queda pendiente de finalizaciÃ³n.
- APK verificada y finalizada en EAS: Build `ba7a6cab-6683-4ef8-9a9d-4100044c2153`, artefacto `https://expo.dev/artifacts/eas/6rGXz3llOcVUOPz5pHISV6uFGEEt-oGxkkRXbi2tedI.apk`.
