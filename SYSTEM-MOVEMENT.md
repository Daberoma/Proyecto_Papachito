# Registro de movimiento del proyecto

Formato compacto: fecha · movimiento · evidencia · siguiente acción.

## 2026-08-09

- Se creó este reporte técnico para continuidad en otro chat.
- Se creó la skill portátil `codex-skills/papachito-handoff` con roles de inventario, migración, adaptador, QA y seguridad.
- Se confirmó que el workspace no tiene repositorio Git; la trazabilidad queda en Markdown y copias de seguridad.
- Se detectó `bitacora.md` con credenciales en texto plano. No se copiaron al reporte; deben rotarse antes de compartir.
- Se validó la estructura de la skill manualmente; el validador oficial no pudo ejecutarse porque el Python disponible no tiene el módulo `yaml`.

## 2026-07-27

- PostgreSQL no estaba instalado: sin `psql`, servicio PostgreSQL ni puerto 5432.
- Windows 10 Pro 64 bits, aproximadamente 134.56 GB libres en C:, winget disponible, sesión sin administrador.
- Se prepararon scripts para instalar PostgreSQL 17, crear `papachito_app`, habilitar `pdo_pgsql` y aplicar el esquema mínimo.
- El esquema propio cubre categorías, productos, stock, ventas, detalles, pagos, movimientos y auditoría.

## 2026-07-21

- Se añadió Reporte en el cuarto botón inferior: fechas, total vendido, operaciones, promedio, gráfico lineal, pagos y productos.
- Se amplió Historial a últimas 100 operaciones y se añadió detalle con hora exacta, documento, productos, cantidad, precio y total original.
- Se validó reporte contra SQL directo y se corrigió conflicto de variable `document` en el detalle.
- Service worker actualizado a `papachito-mobile-v8`.

## 2026-07-20 → 2026-07-21

- Se creó Papachito Móvil PWA en `C:\laragon\www\papachito_movil`.
- Se conectó catálogo a Laravel/MySQL mediante `legacy_bridge`.
- Se implementaron PIN, CSRF, IndexedDB offline, sincronización, reintentos, auditoría, anulación y eliminación definitiva.
- Se corrigió `crypto.randomUUID` para navegadores antiguos.
- Se agregó QR BBVA y botón Cerrar para Yape/Plin.
- Se verificó una venta desconectada que luego sincronizó automáticamente.
- Se creó backup SQL `C:\laragon\backups\papachito_movil\db_papachito_before_mobile_20260720_224328.sql`.

## 2026-08-09 — auditoria maestro

- Se inspeccionaron los documentos principales y `postgresql-migration/` antes de modificar.
- Se verifico que la aplicacion activa es PWA PHP/HTML/JS; no existe Expo operativo en el proyecto auditado.
- Se verifico que `src/bootstrap.php` usa PDO MySQL y el puente `PuntoVentaController`; PostgreSQL y `psql` no estan disponibles.
- Se crearon `docs/AUDIT-2026-08-09.md`, `docs/FILE-MAP.md`, `docs/FLOW-MAP.md`, `docs/ARCHITECTURE.md` y `docs/DATABASE-STATUS.md`.
- No se instalaron paquetes, no se tocaron bases y no se movio ni elimino el legado.
- Siguiente paso seguro pendiente de aprobacion: adaptador reversible `DB_DRIVER=mysql|pgsql` y prueba de lectura sobre PostgreSQL nuevo.

## Reglas para nuevas entradas

- Registrar únicamente hechos comprobables: archivo, endpoint, consulta, prueba o bloqueo.
- No incluir contraseñas, PIN, tokens, cookies ni datos personales completos.
- No declarar una migración terminada si no se probó lectura, escritura, offline, cancelación y recuperación.
- Si se cambia una base o se elimina algo, registrar backup, alcance y forma de restauración.

## 2026-08-18 — actualización APK y vista PC

- Se verificó en el teléfono conectado la actualización desde `0.1.1` a `0.1.2`; el instalador Android abrió correctamente y la cancelación devolvió el control a la app.
- Se mejoró el flujo de descarga en `mobile/src/githubApkUpdate.ts`, `mobile/src/usePapachitoApp.ts`, `mobile/src/screens.tsx` y `mobile/src/ui.tsx` con progreso real, porcentaje, MB, indicador animado y limpieza de temporales.
- La limpieza elimina APK incompletos, descargas anteriores y el temporal cuando el instalador devuelve el control, incluso tras cancelar.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos; `git diff --check` sin errores de contenido.
- Se abrió la versión PC en `http://127.0.0.1:8091`; Ajustes y catálogo de 340 productos visibles correctamente.
- Riesgo restante: la animación nueva requiere un APK posterior a `0.1.2`; la versión instalada ya coincide con la última release y no puede detectar otra actualización hasta publicar una versión superior.

## 2026-08-18 — Reportes separados por medio de pago

- Se corrigió la agrupación que mostraba todo lo digital como `Yape / Plin`.
- Las ventas nuevas conservan `paymentProvider` (`yape`, `plin`, `bbva` o efectivo); la API devuelve proveedor y nombre del medio.
- Reportes muestra siempre Efectivo, Yape, Plin y BBVA; los activos aparecen primero y los desactivados se atenúan sin desaparecer.
- Las ventas antiguas sin proveedor se conservan como `Digital histórico`, sin inventar si fueron Yape o Plin.
- Cada tarjeta de medio de pago abre un modal con total, fecha, hora, vendedor, productos y monto de cada venta.
- Al entrar a Reportes se cargan resumen y ventas detalladas en paralelo para que los medios puedan ampliarse aunque el resumen remoto ya haya llegado.
- Archivos: `mobile/src/offline.ts`, `mobile/src/domain.ts`, `mobile/src/usePapachitoApp.ts`, `mobile/src/ui.tsx`, `mobile/src/screens.tsx`, `backend-node/server.js`.
- Verificación PC: reportes mostró 340 productos en catálogo, tarjetas separadas y modal de Efectivo con ventas históricas, vendedor, fecha, hora y total.
- Validación técnica: TypeScript, sintaxis Node y `git diff --check` correctos.

## 2026-08-18 — sincronización de configuración y detalle por vendedor

- Auditoría de continuidad: otros commits ya estaban integrados en `main`, incluyendo limpieza móvil, historial/calendario, rendimiento y optimización de EAS; no se revirtieron.
- Se detectó que QR ya sincronizaba, pero activar/desactivar medios solo quedaba en AsyncStorage del celular.
- Se añadió configuración de medios en la API: Yape, Plin y BBVA ahora guardan `active` en `payment_methods` y se consultan desde `/api/config/medios-pago`.
- La app envía cambios de activación al servidor y consulta configuración/QR cada 5 segundos cuando está conectada; PC y celular convergen sin recargar el catálogo.
- Reportes permite abrir el detalle de cada vendedor y ver sus operaciones, productos, fecha, hora y total.
- Validación: `npx tsc --noEmit` desde `mobile`, `node --check backend-node/server.js` y `git diff --check` correctos.
- Prueba viva completada: la API en `192.168.1.99:8090` aceptó desactivar Yape y el teléfono conectado mostró `Yape · Desactivado` tras la sincronización; la web en `192.168.1.99:8091` respondió `200`.
- Se corrigió la maquetación web en `mobile/src/ui.tsx`: columnas de reporte más estables, tarjetas menos comprimidas y modales con ancho adaptable para evitar cortes horizontales.
- QR de conexión probado: `papachito://connect?api=http%3A%2F%2F192.168.1.99%3A8090&web=http%3A%2F%2F192.168.1.99%3A8091`.

## 2026-08-18 — arranque PC sin consola, buscador de proyectos y edición de ventas

- Se añadieron `start-papachito-windowless.ps1` y `start-papachito-windowless.vbs`: API/web se ejecutan ocultos, se abre Papachito como ventana de Edge/Chrome y al cerrar esa ventana se detienen únicamente los procesos iniciados por el lanzador.
- `install-papachito-desktop.ps1` ahora crea `Donde Papachito.lnk` y `Buscar proyectos.lnk` en el escritorio. `project-search.ps1` permite filtrar y abrir carpetas de primer nivel de `C:\Datos\Trabajo` sin mostrar CMD.
- `backend-node/server.js`, `mobile/src/usePapachitoApp.ts` y `mobile/src/screens.tsx` permiten editar una venta existente: vendedor, productos, cantidades y precios. La API ajusta stock dentro de una transacción y registra auditoría.
- Validación: `npx tsc --noEmit`, `node --check backend-node/server.js`, parser PowerShell, `git diff --check` y export web completados sin errores reportados.
- Riesgo pendiente: no se hizo una edición contra la base viva porque la API/credencial PostgreSQL no estaban activas en esta sesión; debe probarse con una venta de prueba antes de editar históricos reales.

## 2026-08-22 — QR de conexión dentro de la PC

- La API añade `GET /api/conexion/qr`: detecta la IP LAN de la laptop y devuelve el enlace `papachito://connect`, la URL web y el QR como imagen.
- La vista de Ajustes en PC muestra el QR y actualiza su información automáticamente; el panel está limitado a web/pantallas anchas y no cambia la experiencia del teléfono.
- Se agregó la dependencia `qrcode` al backend. El lanzador del escritorio continúa usando `start-papachito-windowless.vbs`, por lo que no debe aparecer una consola CMD.
- Validación: `node --check backend-node/server.js`, `npx tsc --noEmit` y `git diff --check` correctos.
- Riesgo pendiente: la prueba visual/viva del QR requiere levantar API/PostgreSQL en la laptop y escanearlo desde un teléfono en la misma WiFi.

## 2026-08-22 — arranque PC probado y corregido

- La prueba real detectó tres causas: faltaba el archivo cifrado aunque la contraseña estaba configurada como variable de usuario, el build correcto era `mobile/dist` y esta laptop no tiene PHP/Laragon.
- El arranque ahora usa la contraseña de usuario sin imprimirla, inicia PostgreSQL 18 si está detenido, inicia `backend-node/server.js` y sirve `mobile/dist` mediante `backend-node/preview-server.js` en `8091`.
- Se actualizó el acceso del escritorio para usar `start-papachito-console.cmd`, con `cd` al proyecto, mensajes de estado y apertura de `http://127.0.0.1:8091/`; si no hay navegador detectado usa el navegador predeterminado.
- Riesgo reducido: API y vista web deben probarse con datos reales; la contraseña nunca se guarda ni se muestra por consola.

## 2026-08-22 — ajuste visual exclusivo para PC

- La captura de la ventana PC mostró que el catálogo estaba usando una escala demasiado grande para escritorio: tarjetas táctiles anchas, tres columnas y textos sobredimensionados.
- Se añadió una variante web de pantalla ancha sin modificar la distribución móvil: cuatro columnas, tarjetas compactas, búsqueda y encabezado con espaciado de escritorio.
- Archivos: `mobile/src/usePapachitoApp.ts`, `mobile/src/screens.tsx` y `mobile/src/ui.tsx`.
- Validación: `npx tsc --noEmit`, `npx expo export --platform web` y `git diff --check` correctos.

## 2026-08-22 — deduplicación segura y alta de productos en PC

- Se auditó el catálogo real: 340 productos activos y 119 duplicados seguros por nombre normalizado + categoría + precio. Se respaldó la base en `backups/papachito-before-product-dedup-20260822.dump` antes de cambiar datos.
- Se conservaron los registros con más ventas, se trasladaron referencias de `sale_items`, se acumularon existencias y se desactivaron 119 repetidos. El catálogo quedó en 221 productos activos.
- Verificación posterior: ventas `1076` y total `45471.52` sin cambio; líneas `2231` y suma `195661.72` sin cambio; ninguna línea de venta apunta a un producto inactivo. Los nombres y precios históricos de las ventas se conservaron.
- Se añadió en PC un panel separado de “Agregar producto”, con nombre, precio, categoría, descripción, imagen opcional, carga de imagen, actualización del catálogo y modal animado de “Producto cargado”. El móvil no muestra este panel.
- Se añadió almacenamiento de imágenes mediante `product_images` y `/media/product-images`; la API valida la imagen antes de guardar.
- Validación: `node --check`, `npx tsc --noEmit`, export web, catálogo HTTP `200` con 221 productos, validación de alta HTTP `422` para datos incompletos y `git diff --check` correctos.

## 2026-08-22 — acceso PC dedicado para agregar productos

- Se quitó el logo duplicado del encabezado de escritorio; la marca queda representada en la barra lateral.
- “Productos · Agregar al catálogo” ahora es una opción propia de la navegación PC, separada de Ajustes y al mismo nivel que Vender, Historial y Reporte.
- La nueva vista explica el flujo, conserva el estado conectado y abre el formulario animado de alta; después de guardar permite volver directamente a Vender.
- La opción no aparece en la navegación móvil.
- Validación: `npx tsc --noEmit`, sintaxis Node y `git diff --check` correctos; export web generado correctamente.

## 2026-08-22 — corrección de pantalla blanca en Productos

- La prueba visual detectó que el primer `dist` se había generado antes de incluir el import del icono `Package`; React lanzaba `ReferenceError: Package is not defined` y dejaba la ventana blanca.
- Se regeneró el bundle web después de corregirlo y se verificó en navegador: aparecen Vender, Productos, Historial, Reporte y Ajustes; Productos abre su dashboard y el formulario muestra nombre, precio, categoría, descripción, carga opcional de imagen y Guardar producto.
- Validación final: `npx tsc --noEmit`, export web, API/catálogo operativo y navegación PC comprobada sin error nuevo después de recargar.
- Riesgo pendiente: falta una nueva captura visual del usuario después de recargar el acceso de PC para confirmar que la escala coincide con su monitor.

## 2026-08-22 — dashboard PC amplio y modales de escritorio

- Se ajustó exclusivamente la rama web ancha: lienzo máximo de 1680px, navegación lateral de 250px, encabezado con mayor presencia y catálogo con tarjetas grandes en cuatro columnas.
- Los modales de detalle, historial, edición de venta, carrito y QR reciben tamaños amplios para trabajar con mouse; la rama móvil conserva sus estilos y dimensiones anteriores.
- Archivos: `mobile/src/usePapachitoApp.ts`, `mobile/src/screens.tsx` y `mobile/src/ui.tsx`.
- Validación: `npx tsc --noEmit`, `npx expo export --platform web` y `git diff --check` correctos.
- Requiere recargar la ventana PC para visualizar el nuevo bundle.

## 2026-08-22 — búsqueda PC y estado hover de productos

- Se quitó el borde negro nativo del navegador en el campo de búsqueda de escritorio mediante estilos web específicos; el campo mantiene el foco visual verde del sistema.
- Las tarjetas de productos de PC ahora responden al pasar el mouse con fondo verde suave, borde destacado y sombra; el móvil conserva el estado táctil existente.
- Archivos: `mobile/src/screens.tsx` y `mobile/src/ui.tsx`.
- Validación: `npx tsc --noEmit`, `npx expo export --platform web` y `git diff --check` correctos.

## 2026-08-22 — listado y edición del catálogo en PC

- Se mantuvo el carrito dentro de “Vender”: seleccionar un producto allí continúa agregándolo a la venta actual.
- La vista PC “Productos” ahora muestra debajo del alta los 221 productos activos, con nombre, imagen o iniciales, categoría, precio y descripción.
- Se añadió el botón “Editar” y un modal exclusivo para actualizar nombre, precio, categoría y descripción; el backend guarda los cambios y refresca el catálogo sin modificar ventas históricas.
- Se añadió `PUT /api/config/productos/:id` con validación y transacción para actualizar productos activos.
- Validación: `npx tsc --noEmit`, `node --check`, `npx expo export --platform web` y `git diff --check` correctos.

## 2026-08-22 — identificador visual de presentaciones

- Se añadió una etiqueta compacta y colorida para diferenciar automáticamente `Unidad`, `Pack xN` y `Caja xN` usando la relación de precios del mismo producto.
- La etiqueta aparece en las tarjetas de venta y en el listado de administración de productos; no cambia nombres, precios, ventas ni registros de la base de datos.
- Se reconocen relaciones aproximadas de paquetes de 6, 10, 12 y otras cantidades según los precios existentes, incluyendo las presentaciones de bebidas y cervezas.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — rediseño del modal de cobro en PC

- Se ajustó exclusivamente el carrito/modal de “Tu pedido” para escritorio: más ancho, centrado, con mayor espacio para los productos y controles de cantidad más legibles.
- Se mejoró visualmente el bloque de medio de pago, el total y el botón de confirmación; el modal QR ampliado conserva su funcionamiento.
- La versión móvil mantiene sus dimensiones y flujo anteriores.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — corrección del carrito flotante en PC

- Se corrigió la barra que aparece después de seleccionar un producto: ya no ocupa toda la parte inferior ni se cruza con el menú lateral.
- En escritorio ahora aparece como un botón compacto abajo a la derecha del contenido, con el total y la cantidad de productos.
- En móvil conserva su ubicación y tamaño anteriores.
- Validación: `npx tsc --noEmit`, exportación web y `git diff --check` correctos.

## 2026-08-22 — modal de cobro sobre el contenido completo de PC

- Se corrigió el recorte lateral del modal “Tu pedido”: el menú lateral y la búsqueda ya no quedan por encima del modal.
- El fondo oscurece toda la ventana y el modal queda completo, centrado dentro del área de trabajo, con todos los textos y controles visibles.
- Validación: `npx tsc --noEmit`, exportación web y `git diff --check` correctos.

## 2026-08-22 — modal de cobro independiente para PC

- Se dejó `CartSheet` exclusivamente para móvil, sin modificar su flujo ni diseño.
- Se creó `DesktopCartModal` como modal separado para PC, con productos seleccionados, cantidades, total, medios de pago y confirmación en una distribución de dos columnas.
- El pago digital conserva selección de Yape, Plin o BBVA y ampliación del QR.
- Validación: `npx tsc --noEmit`, exportación web y `git diff --check` correctos.

## 2026-08-22 — búsqueda propia para administración de productos

- Se quitó el buscador global al entrar a Productos en PC.
- Se añadió un buscador dentro del panel “Todos tus productos”, debajo del encabezado, para filtrar únicamente el catálogo editable por nombre, categoría, descripción o precio.
- Se añadió contador de resultados, botón para limpiar y estado amigable cuando no hay coincidencias.
- El buscador global se conserva en Vender, Historial y Reporte.
- Validación: `npx tsc --noEmit`, exportación web y `git diff --check` correctos.

## 2026-08-22 — presentaciones al agregar productos

- El modal de alta ahora permite elegir una presentación fija: Unidad, Pack, Caja, Bolsa o Docena.
- La cantidad se ingresa aparte y puede ser personalizada, por ejemplo x6, x10, x12, x20 o x24; Unidad queda automáticamente en cantidad 1.
- El color se asigna automáticamente por tipo de presentación y se conserva para todas sus cantidades; el usuario no elige colores.
- Se añadió persistencia en `product_presentations` para guardar tipo, cantidad, etiqueta y color sin alterar ventas históricas.
- El catálogo API ya devuelve la presentación guardada para mostrarla posteriormente en Vender y Productos.
- Validación: TypeScript, sintaxis Node, exportación web y `git diff --check` correctos.

## 2026-08-22 — categorías sugeridas y precios en soles

- El campo Categoría del modal de alta ahora muestra categorías existentes mientras se escribe.
- Si el texto no coincide con una categoría, aparece la opción visible “Crear categoría nueva”; al guardar, el backend crea esa categoría automáticamente.
- El campo Precio ahora muestra el prefijo visual `S/` y conserva el valor numérico para guardar el precio exacto indicado por el usuario.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — clasificación real de los 221 productos

- Se aplicó la clasificación a la base de datos activa, no solo a la interfaz.
- Resultado: Aguas 22, Bebidas 94, Cervezas 47, Cuidado personal 6, Licores 10, Promociones 5, Snacks 26, Tabacos 10 y Otros 1.
- Los 221 productos activos quedaron con categoría; no quedaron productos en GENERAL ni sin categoría.
- Se conservaron nombres, precios, presentaciones, inventario y ventas históricas.
- Validación: API de catálogo HTTP 200 y conteos de categorías coincidentes con la base de datos.

## 2026-08-22 — sugerencias dentro del modal de alta

- El nombre del producto ahora muestra coincidencias existentes mientras se escribe, con presentación y precio; también ofrece “Nuevo producto” cuando no hay coincidencia exacta.
- El selector de categoría se convirtió en un bloque interno visible: muestra categorías existentes y permite conservar una categoría nueva para que se cree al guardar.
- Se corrigió el solapamiento del selector sobre la tarjeta de imagen y se ocultó la barra visual del desplazamiento interno del modal.
- El precio mantiene el prefijo visual `S/`.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — desplegable de categoría sin desplazar el formulario

- El menú de categorías vuelve a mostrarse flotante debajo del campo, sin empujar precio, presentación, cantidad ni imagen.
- Se ajustaron las capas visuales para que el menú quede por encima de la tarjeta de imagen y no se oculte detrás de ella.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — selector de categoría independiente

- Se reemplazó el desplegable incrustado del formulario por un modal selector de categoría conectado al alta de producto.
- El selector permite buscar categorías existentes o escribir y seleccionar “Crear categoría nueva”, sin superponerse con descripción, imagen, presentación ni botones.
- La pantalla principal de alta conserva sus dimensiones y el formulario ya no se desplaza al abrir categorías.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — creación de categoría solo sin coincidencias

- “Crear categoría nueva” ahora aparece únicamente cuando la búsqueda termina sin encontrar ninguna categoría relacionada.
- Mientras existan coincidencias, solo se muestran las categorías encontradas para elegir.
- Se quitó el texto “Descripción opcional” del formulario de alta para mantenerlo más limpio.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — limpieza final del modal de alta

- Se eliminó completamente el campo innecesario “Presentación o detalle”, incluyendo su espacio y estado interno.
- El modal queda enfocado en nombre, precio, categoría, presentación, cantidad e imagen.
- Se corrigió el estado de compilación después de retirar el campo.
- Validación: `npx tsc --noEmit` y `npx expo export --platform web` correctos.

## 2026-08-22 — grupos de presentaciones y eliminación permanente

- Se creó la relación de grupo para que Unidad, Pack y Caja del mismo producto se administren juntas.
- El catálogo devuelve el identificador común de presentación para filtrar y editar las variantes relacionadas.
- Productos ahora tiene botón “Eliminar” con confirmación; la eliminación permanente retira todas las presentaciones del grupo, o solo la presentación si no tiene grupo.
- Las ventas históricas conservan nombre, precio, cantidad y total; no se borran ventas.
- Validación: TypeScript, sintaxis Node y exportación web correctas.

## 2026-08-22 — precios por presentación

- El alta de producto ahora permite registrar Unidad, Pack y Caja como presentaciones separadas del mismo producto, cada una con su propio precio.
- Pack y Caja permiten indicar cantidad, por ejemplo Pack x6 o Caja x12.
- El listado inferior recibe cada presentación como registro editable y conserva la relación por nombre y categoría para eliminar el grupo completo.
- El modal de edición permite actualizar precio, presentación y cantidad de cada variante.
- Validación: TypeScript, sintaxis Node y exportación web correctas.

## 2026-08-22 — diferenciación visual de presentaciones en Vender

- Las tarjetas de Vender ahora aplican un color suave según la presentación guardada: azul para Unidad, amarillo para Pack y morado para Caja.
- El borde lateral conserva el mismo código de color y la etiqueta de presentación sigue visible, para distinguir productos con el mismo nombre y precio diferente.
- La prioridad visual usa los datos persistidos de presentación y mantiene un estilo discreto tanto en PC como en móvil.

## 2026-08-23 — flujo remoto documentado y Expo Go por túnel

- Se documentó el flujo completo de continuidad en `AGENTS.md`, `codex-skills/papachito-handoff/SKILL.md` y `C:\Datos\Escritorio\codex\papachito-project-memory.md`, incluyendo el orden de lectura, roles de agentes, uso de skills y validaciones.
- Se agregó `@expo/ngrok` como dependencia de desarrollo de `mobile` para que Expo CLI reconozca `npx expo start --tunnel --port 8081`.
- Se verificó Expo Go remoto con `exp://z2tjwk0-mrcntral-8081.exp.direct` y HTTP 200 del endpoint de Metro.
- Se verificó preview remoto por Cloudflare con proxy de solo lectura: web HTTP 200 y `/api/catalogo` HTTP 200 con 223 productos.
- No se guardaron URLs temporales, contraseñas, tokens ni datos privados como configuración permanente.

## 2026-08-23 — corrección del difuminado sobre el carrito móvil

- Se corrigió el orden de capas del carrito celular: el fondo de cierre queda debajo del modal y ya no oscurece “Tu pedido”.
- Se redujo la opacidad del fondo únicamente en móvil y se compactaron hoja, filas, controles, medios de pago y QR.
- El modal de PC no se modificó; conserva su componente y estilo independiente.
- Validación pendiente de captura real en Expo Go después de recargar el bundle.

## 2026-08-23 — QR digital visible sobre el carrito móvil

- Se elevó el overlay de ampliación del QR por encima de la hoja móvil y del fondo de cierre; el QR ya no queda atrás ni apagado por otra capa.
- La tarjeta blanca del QR conserva contraste y el fondo se oscurece solo detrás de ella.
- PC conserva su overlay QR independiente.

## 2026-08-28 — conexión portátil para computadoras cliente

- Se detectó que `backend-node/show-connection-qr.cmd` generaba siempre el QR con `192.168.1.99`; esa IP podía no existir en la computadora del cliente.
- El script ahora detecta automáticamente una IPv4 válida y prioriza la dirección privada de Wi‑Fi/Ethernet sobre adaptadores VPN como Tailscale.
- `backend-node/server.js` aplica la misma prioridad al QR mostrado dentro de Ajustes, evitando que el QR de la PC y el QR de la consola anuncien direcciones distintas.
- La instalación de una computadora cliente sigue requiriendo PostgreSQL con datos, Node.js, API 8090, web 8091, red privada y permiso de firewall; el teléfono solo escanea la dirección, no instala esos servicios.
- Validación: script CMD probado; seleccionó la IP Wi‑Fi `10.214.240.242` en presencia de una IP Tailscale `100.92.102.83`; `node --check backend-node/server.js`, `npx tsc --noEmit` y `git diff --check` correctos.

## 2026-08-28 — prototipo del Conector Papachito

- Se creó `desktop-connector/`, una ventana independiente para detectar red, comprobar API/web, mostrar el QR y explicar qué servicio falta.
- La interfaz no depende de Expo Go y se actualiza cada cinco segundos; conserva el estilo visual de Papachito, con estado de red, servidor, panel y dirección detectada.
- `desktop-connector/start-connector.vbs` permite abrirlo sin mostrar una ventana CMD.
- La estructura fue validada con `node --check` en `main.js`, `preload.js` y `renderer.js`.
- La prueba nativa quedó pendiente porque Windows no completó la descarga del ejecutable de Electron; el código y la interfaz sí quedaron creados.
- Se agregó un modo de ejecución inmediato con una ventana Edge/Chrome en modo aplicación (`web-server.js` + `start-web-connector.ps1`), para probar el conector sin depender del binario de Electron.
- El `.cmd` del Escritorio ahora llama al lanzador oculto y no deja una consola CMD visible; la ventana del conector queda abierta de forma independiente.
- Prueba viva completada: `http://127.0.0.1:8188/` y `/state` respondieron HTTP 200; el estado informó la IP Wi‑Fi detectada y los servicios como pendientes porque API/web no estaban iniciados.
- Prueba de conectividad completada con los servicios activos: API local y web respondieron HTTP 200 tanto por loopback como por `10.214.240.242`; `/api/conexion/qr` devolvió la misma IP Wi‑Fi para el QR.
- Diagnóstico de la captura móvil: el QR fue leído, pero la solicitud a `10.214.240.242:8090` expiró/canceló; queda revisar desde el celular que esté en la misma Wi‑Fi y que Windows permita Node en el perfil de red privada.

## 2026-08-28 — botón único para iniciar Papachito

- El `.cmd` del Escritorio ahora ejecuta `start-papachito-all.ps1`, que comprueba PostgreSQL, inicia API 8090 y web 8091 ocultas, valida salud HTTP y abre el Conector.
- Si PostgreSQL, API o web ya estaban activos, el flujo los conserva; solo detiene al cerrar el conector los procesos que él mismo inició.
- Esto convierte la prueba en un flujo de un solo botón y evita que el usuario tenga que abrir CMD independientes.
- Se completó la dependencia ligera `qrcode` del conector y se probó el botón desde `C:\Datos\Escritorio`: inició/verificó servicios y abrió el programa sin consola visible.

## 2026-08-28 — integridad de ventas con advertencia de stock

- Decisión del creador: se permiten ventas aunque el stock sea insuficiente; la sincronización conserva la venta, registra el saldo y devuelve una advertencia visible para revisión.
- La sincronización usa inserción idempotente dentro de una transacción, por lo que reintentos concurrentes con el mismo UUID no duplican la venta, pagos ni movimientos.
- Cada venta, edición y anulación registra sus movimientos de inventario; la anulación repone el stock una única vez dentro de la transacción.
- Las fechas comerciales nuevas se calculan en `America/Lima`.
- Validación estática: `node --check backend-node/server.js`, `npx tsc --noEmit` y `git diff --check` correctos. Falta una prueba funcional con PostgreSQL y datos de control; no se usó la base privada en esta tarea.

## 2026-08-29 — estados visibles de venta y sincronización

- Confirmar venta queda bloqueado mientras se guarda, evitando dobles toques; la confirmación aclara que primero queda guardada en el teléfono y se envía al recuperar conexión.
- Ajustes ahora informa Conectando/Sincronizando, bloquea acciones repetidas y ofrece reintento si la API no responde.
- Reportes identifica datos guardados sin actualizar y permite reintentar; las anulaciones muestran Anulando mientras se procesan.
- El catálogo cacheado informa que se está usando sin conexión.
- Validación: `npx tsc --noEmit` y `git diff --check` correctos; revisión independiente sin bloqueantes.

## 2026-08-29 — prueba viva del acceso de escritorio y QR LAN

- Se ejecutó `C:\Datos\Escritorio\Probar Conector Papachito.cmd` (lanzador `start-papachito-all.ps1`). PostgreSQL ya estaba disponible y se iniciaron o conservaron los servicios necesarios.
- Verificado: API 8090 HTTP 200, web 8091 HTTP 200 y conector 8188 HTTP 200.
- El conector confirmó estado listo y que el QR anuncia una IP LAN privada válida; queda pendiente únicamente el escaneo y la prueba desde el celular conectado a la misma Wi‑Fi.

## 2026-08-29 — corrección del arranque del Conector Papachito

- Se detectó que `start-papachito-all.ps1` podía quedar esperando tras `pg_ctl start -w`, aunque PostgreSQL ya hubiera quedado disponible; en ese estado no alcanzaba a iniciar API, web ni el conector.
- El arranque de PostgreSQL ahora usa `Start-Process -Wait` y valida el código de salida antes de continuar.
- Prueba posterior: PostgreSQL 5432, API 8090, web 8091 y conector 8188 respondieron correctamente; el conector informó estado listo con la IP Wi‑Fi actual.

## 2026-08-29 — confirmación de dispositivo en el conector

- El conector ahora consulta el estado temporal de conexión del teléfono y muestra “Teléfono conectado” cuando la app confirma el escaneo.
- La app registra ese evento después de validar `/api/salud`; el aviso vive en memoria por tres minutos y no guarda datos personales ni ventas.
- Se compactó el QR y se añadió una cuarta fila de estado para que la confirmación quede visible sin ampliar la ventana.
- Validación: TypeScript móvil y `node --check` pasaron; el estado del conector cambió de `deviceConnected=false` a `true` en una prueba controlada.

## 2026-08-29 — múltiples dispositivos y acceso al sistema PC

- El estado temporal de conexión ahora mantiene una lista por `deviceId`, elimina dispositivos sin latido después de tres minutos y permite mostrar varios teléfonos/tablets a la vez.
- El conector muestra la lista de dispositivos activos y habilita `Abrir sistema en PC` cuando existe al menos uno.
- Ajustes de la app reemplaza el bloque de venta de prueba por un apartado `Conexión` con QR para conectar otro teléfono.
- Validación controlada: dos dispositivos registrados aparecieron simultáneamente en `/state`; TypeScript y comprobaciones Node pasaron.

## 2026-08-29 — recuperación tras cambios de Wi‑Fi

- Se detectó una optimización que podía devolver el catálogo cacheado sin volver a probar la API al recuperar Wi‑Fi; eso dejaba el teléfono marcado como offline aunque la red ya hubiera regresado.
- `mobile/src/usePapachitoApp.ts` ahora vuelve a validar catálogo/API en cada recuperación de conexión o activación relevante, permitiendo descubrir una nueva IP LAN.
- Monitorización local: Wi‑Fi, PostgreSQL, API, web y conector permanecieron estables durante varias muestras; `tsc` y `node --check` pasaron.

## 2026-08-29 — arranque desacoplado y acceso sin CMD

- Se comprobó que iniciar `postgres.exe` directamente desde la consola podía propagar una señal de control al cerrar/interrumpir el lanzador y apagar toda la base; el arranque vuelve a usar `pg_ctl` desacoplado y espera el puerto 5432 sin bloquear la ventana.
- El acceso directo `Donde Papachito.lnk` ahora abre `start-papachito-windowless.vbs`, que lanza el flujo único sin mostrar una consola CMD.
- Validación: el flujo sin consola levantó PostgreSQL, API 8090, web 8091 y conector 8188; API respondió HTTP 200 y el conector quedó listo.

## 2026-08-29 — URL de Expo Go en el conector

- La ventana del conector muestra debajo de la dirección LAN la URL `exp://IP:8081`, calculada con la IP Wi‑Fi detectada en cada actualización.
- Validación: el estado devolvió `exp://10.214.240.242:8081` junto con API/web listos.

## 2026-08-29 — estado visible de actualización

- El panel de computadora estaba sirviendo una exportación web anterior (1.0.0) aunque la configuración actual de la app ya es 0.1.2; se regeneró `mobile/dist` mediante Expo para alinear el panel con la versión vigente.
- `Buscar actualización` ahora conserva un mensaje visible: en PC confirma que el panel está actualizado y aclara que los APK se actualizan desde el teléfono; en Android confirma que ya está en la versión instalada cuando GitHub no tiene una versión superior.
- Validación: `npx tsc --noEmit`, `node --check backend-node/server.js` y la exportación web de Expo finalizaron correctamente.

## 2026-08-29 — reporte simplificado para operación diaria

- El gráfico mensual dejó de dibujar columnas vacías para cada día sin ventas: ahora muestra únicamente los días o meses con movimiento, junto con un resumen de cantidad de días y total vendido.
- En PC los tres indicadores ocupan el ancho disponible; la vista de ventas actuales ya no muestra el bloque del sistema histórico, y el detalle de pagos reduce filas sin uso.
- Los pagos digitales sin proveedor identificado se presentan como `Registrado`, no como desactivados cuando contienen ventas.
- Validación: TypeScript, exportación web y revisión de la pantalla de Reporte contra la API local completados correctamente.

## 2026-08-29 — detalle de ventas, vendedores y boleta simple

- Las ventas recientes del Reporte ahora son seleccionables y abren el detalle completo con fecha, hora, vendedor, estado, medio de pago, productos y total.
- El detalle incluye `Ver boleta`, una boleta simple interna con el logo de Donde Papachito; no se presenta como comprobante tributario.
- Desde Reporte se puede solicitar `Anular venta` para operaciones actuales o consolidadas. La acción pide confirmación, revierte la operación sincronizada en el servidor y refresca el reporte; el histórico importado continúa en solo lectura.
- Los listados por día y por vendedor también muestran el nombre de quien atendió cada operación, manteniendo el orden más reciente primero.

## 2026-08-29 — boleta interna tipo ticket y versión 0.1.3

- La boleta simple fue ajustada a un formato vertical tipo ticket: logo, negocio, código de operación, fecha, hora, vendedor, cliente de consumo interno, columnas de descripción/cantidad/P.U./total, subtotal, impuestos informativos, importe total, medio de pago y cierre.
- Se incrementó la versión Android a `0.1.3` (código 3) para que la actualización desde GitHub Releases sea detectada por los dispositivos que tienen `0.1.2`.
