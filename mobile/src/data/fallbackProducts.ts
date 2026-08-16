import type { Product } from '../types/models';

/** Catálogo mínimo usado mientras se descubre la API o no hay red. */
export const fallbackProducts: Product[] = [
  { id: 'demo-1', sku: 'DEMO-001', name: 'COCA COLA PIRANA DE 237 ML', description: 'Gaseosa personal | Unidad: NIU', price: 1, category: 'Gaseosas', stock: 0 },
  { id: 'demo-2', sku: 'DEMO-002', name: 'AGUA SAN MATEO 625 ML', description: 'Agua personal | Unidad: NIU', price: 1.5, category: 'Aguas', stock: 0 },
  { id: 'demo-3', sku: 'DEMO-003', name: 'INKA COLA PERSONAL', description: 'Gaseosa personal | Unidad: NIU', price: 2.5, category: 'Gaseosas', stock: 0 },
  { id: 'demo-4', sku: 'DEMO-004', name: 'INKA COLA 1 LITRO', description: 'Bebida familiar | Unidad: NIU', price: 5, category: 'Gaseosas', stock: 0 },
];
