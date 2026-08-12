# Mapeo mínimo desde MySQL

| Origen actual | Uso real | Destino PostgreSQL |
|---|---|---|
| `categorias` | Nombre de categoría | `categories` |
| `productos` | Código, nombre, unidad, precio y estado | `products` |
| `producto_stock` | Existencia por almacén | `product_stock` |
| `cpe_cabecera` | Documento, cliente, fecha, total, anulación | `sales` |
| `cpe_detalle` | Producto, cantidad, precio y subtotal | `sale_items` |
| `medios_pagos` | Catálogo de medios | `payment_methods` |
| `venta_medio_pago` | Pago aplicado a la venta | `sale_payments` |
| `mobile_audit` | Trazabilidad técnica | `audit_log` |

No se copiarán campos de talleres, vehículos, garantías, grúas, cuotas, SUNAT avanzada, órdenes de equipo ni otros módulos que Papachito Móvil no consulta.

Las ventas anuladas se conservarán con estado `cancelled`; no se sumarán en los reportes. La eliminación definitiva seguirá siendo una acción separada y auditada.

