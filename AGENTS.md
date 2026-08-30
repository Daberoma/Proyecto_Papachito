# AGENTS — Donde Papachito

## Continuidad actual

- Proyecto principal: `mobile/` con Expo/React Native y `backend-node/` con Node/PostgreSQL.
- Rama de trabajo y publicación: `main` en el repositorio público `Daberoma/Proyecto_Papachito`.
- APK publicado comprobado: `v0.1.2`.
- La base de datos privada no debe volver a entrar al repositorio ni a sus commits.
- Memoria detallada: `C:\Datos\Escritorio\codex\papachito-project-memory.md`.
- Registro de cambios y verificaciones: `SYSTEM-MOVEMENT.md`.
- Skill de continuidad: `codex-skills/papachito-handoff/SKILL.md`.

## Flujo de trabajo

1. Leer `PROJECT-HANDOFF.md`, `SYSTEM-MOVEMENT.md` y la memoria local antes de modificar.
2. Revisar `git status`; conservar cambios y capturas no relacionados.
3. No leer, imprimir ni guardar contraseñas, tokens, cookies, dumps o datos privados.
4. Hacer cambios pequeños y reversibles.
5. Validar móvil con `npx tsc --noEmit` desde `mobile`.
6. Validar backend con `node --check backend-node/server.js`.
7. Para PC ejecutar `mobile/start-web-8091.ps1` y abrir `http://127.0.0.1:8091`.
8. Para datos separados por medio de pago, reiniciar la API del puerto 8090 antes de validar en vivo.
9. No generar otro APK ni publicar una release sin comprobar primero cambios y versión.

## Regla de continuidad y ahorro de tokens

- Cada agente debe revisar primero la memoria y los handoffs relevantes antes de investigar de nuevo.
- Al terminar, debe dejar un resumen breve de lo que hizo, archivos revisados o modificados, pruebas realizadas, errores encontrados y siguiente decisión.
- Si el hallazgo es duradero, debe actualizar la memoria del proyecto o la skill correspondiente; nunca guardar credenciales, tokens, cookies ni datos privados.
- El agente coordinador debe informar al equipo de esta regla y reutilizar la memoria para evitar búsquedas y trabajo repetidos.

## Flujo de demostración remota — Expo Go y Cloudflare

- Expo Go local funciona con `npx expo start --lan --port 8081` y entrega un enlace `exp://IP:8081`; solo sirve dentro de la misma Wi‑Fi.
- Para Expo Go desde otra red se usa `npx expo start --tunnel --port 8081`; el proyecto incluye `@expo/ngrok` como dependencia de desarrollo para que Expo CLI reconozca el túnel.
- La app necesita API remota. Para una demo temporal: levantar PostgreSQL/API local, servir `mobile/dist` con `backend-node/preview-server.js` en 8091, crear un Quick Tunnel de Cloudflare hacia 8091 y exportar web/Expo con `EXPO_PUBLIC_API_URL` apuntando al dominio temporal.
- El preview remoto es solo lectura mediante `preview-server.js`: las peticiones no-GET a `/api` responden 405.
- Los dominios `trycloudflare.com` y `exp.direct` son temporales; no guardarlos como enlaces permanentes ni tratarlos como producción.
- Si el túnel Expo falla con “Install @expo/ngrok”, revisar primero la dependencia local en `mobile/package.json` y volver a ejecutar el comando.

## Instalación en una computadora cliente

- La computadora que aloja los datos debe tener PostgreSQL, la base `papachito_app`, Node.js, el API en 8090 y el preview/web en 8091.
- El teléfono y esa computadora deben estar en la misma Wi‑Fi para usar un QR LAN. La app no puede conectarse a una computadora vacía ni a un QR generado para otra red.
- `backend-node/show-connection-qr.cmd` detecta la IP privada actual de Wi‑Fi/Ethernet y prioriza rangos LAN (`10.x`, `192.168.x`, `172.16–31.x`); ya no depende de una IP fija.
- Si el cliente cambia de router, se vuelve a abrir el QR. Si Windows bloquea el acceso, debe permitirse Node en la red privada mediante la regla de firewall correspondiente; no se deben desactivar todas las protecciones.
- Para trabajar desde otra red no basta el QR LAN: se necesita un túnel o servidor publicado con autenticación. Los túneles temporales son solo para demostración.
- El conector de escritorio vive en `desktop-connector/` y se inicia con `start-connector.vbs`, ocultando la consola; su ventana solo informa estado y QR.
- El botón de prueba completo del Escritorio ejecuta `start-papachito-all.ps1`: prepara PostgreSQL, API, web y luego abre el conector; al cerrar el conector detiene únicamente los servicios que ese botón inició.

## Estado funcional guardado

- Reportes muestra siempre Efectivo, Yape, Plin y BBVA; los inactivos se atenúan.
- Cada medio abre un modal con ventas, vendedor, fecha, hora, productos y total.
- Ventas nuevas guardan `paymentProvider`; ventas antiguas sin detalle quedan como `Digital histórico`.
- El flujo de actualización APK tiene progreso real y elimina temporales al cancelar o terminar el instalador.
- La vista PC fue verificada con catálogo de 340 productos y modal de ventas históricas.
- La configuración de activación de Yape, Plin y BBVA se sincroniza por API cada 5 segundos; los detalles de vendedor también son ampliables.
