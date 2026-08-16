# Papachito: modo local y reportes

## Catálogo sin conexión

Después de una sincronización correcta, el catálogo se guarda en AsyncStorage con la clave `papachito.catalog`. La pantalla de venta muestra esa copia local aunque la laptop o la red no estén disponibles. Si se desinstala la aplicación o se borran sus datos, la caché se elimina y será necesario conectarla una vez para volver a descargar el catálogo.

La navegación no vuelve a descargar los productos al cambiar entre Vender y Ajustes. La red se valida en segundo plano y la interfaz conserva el catálogo local mientras espera la respuesta.

## Ventas pendientes

Añadir productos al carrito solo cambia el estado local. Al confirmar el cobro, la venta se guarda en la cola local. Si la API responde, se sincroniza; si no, queda como pendiente y se reintenta cuando vuelve la conexión.

## Reportes

El reporte remoto incluye:

- ventas por día, mes, año e histórico;
- medios de pago Efectivo y Yape / Plin;
- productos más vendidos;
- ventas agrupadas por nombre de vendedor, cantidad de operaciones y total.

El backend toma el vendedor desde el `seller` de la venta móvil y conserva el nombre también en el historial local.

## Rendimiento

La pantalla de venta monta primero un grupo pequeño de tarjetas y agrega el resto por bloques para que el cambio de pantalla no bloquee el hilo de JavaScript. Para catálogos considerablemente mayores se puede migrar la cuadrícula a `FlatList` o FlashList.
