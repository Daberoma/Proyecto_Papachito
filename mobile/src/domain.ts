import Constants from 'expo-constants';
import type { OfflineSale } from './offline';

export type Product = {
  id: number | string;
  legacy_id?: number | string;
  sku?: string;
  barcode?: string;
  name: string;
  description?: string;
  price: string | number;
  category?: string;
  stock?: string | number;
};

export type CartItem = Product & { quantity: number };
export type Screen = 'sale' | 'history' | 'report' | 'settings';
export type SearchResult =
  | { type: 'product'; title: string; subtitle: string; product: Product }
  | { type: 'sale'; title: string; subtitle: string; sale: OfflineSale }
  | { type: 'action'; title: string; subtitle: string; screen: Screen };
export type ReportPeriod = 'dia' | 'mes' | 'ano' | 'historico';
export type RemoteReport = {
  period: ReportPeriod;
  from: string;
  to: string;
  summary: { count: number; total: number; average: number };
  series: { date: string; count: number; total: number }[];
  historical: { count: number; total: number; firstDate?: string; lastDate?: string };
  topProducts?: { name: string; quantity: number; total: number }[];
  payments?: { label: string; total: number }[];
  sellers?: { label: string; count: number; total: number }[];
};

export const hostFromExpo = Constants.expoConfig?.hostUri?.split(':')[0];
export const API = process.env.EXPO_PUBLIC_API_URL || (hostFromExpo ? `http://${hostFromExpo}:8090` : 'http://127.0.0.1:8090');
export const apiCandidates = Array.from(new Set([
  API,
  hostFromExpo ? `http://${hostFromExpo}:8090` : '',
  typeof window !== 'undefined' && window.location?.hostname ? `http://${window.location.hostname}:8090` : '',
  'http://127.0.0.1:8090',
  'http://localhost:8090',
].filter(Boolean)));

export const fallbackProducts: Product[] = [
  { id: 'demo-1', sku: 'DEMO-001', name: 'COCA COLA PIRANA DE 237 ML', description: 'Gaseosa personal | Unidad: NIU', price: 1, category: 'Gaseosas', stock: 0 },
  { id: 'demo-2', sku: 'DEMO-002', name: 'AGUA SAN MATEO 625 ML', description: 'Agua personal | Unidad: NIU', price: 1.5, category: 'Aguas', stock: 0 },
  { id: 'demo-3', sku: 'DEMO-003', name: 'INKA COLA PERSONAL', description: 'Gaseosa personal | Unidad: NIU', price: 2.5, category: 'Gaseosas', stock: 0 },
  { id: 'demo-4', sku: 'DEMO-004', name: 'INKA COLA 1 LITRO', description: 'Bebida familiar | Unidad: NIU', price: 5, category: 'Gaseosas', stock: 0 },
];

export const actions: SearchResult[] = [
  { type: 'action', title: 'Vender producto', subtitle: 'Ir a nueva venta', screen: 'sale' },
  { type: 'action', title: 'Ver historial', subtitle: 'Revisar compras guardadas', screen: 'history' },
  { type: 'action', title: 'Ver reporte', subtitle: 'Resumen y grafico de ventas', screen: 'report' },
  { type: 'action', title: 'Cambiar nombre', subtitle: 'Editar vendedor en ajustes', screen: 'settings' },
];

export const money = (value: number) => `S/ ${value.toFixed(2)}`;
export const classifyProduct = (product: Product): string => {
  const text = `${product.name} ${product.description || ''}`.toLowerCase();
  if (/coca|inka|gaseosa|sprite|pepsi|fanta|cola/.test(text)) return 'Gaseosas';
  if (/agua|san mateo|cielo|socosani/.test(text)) return 'Aguas';
  if (/cerveza|pilsen|cristal|cusqueña|cusquena|barena|stella|corona/.test(text)) return 'Cervezas';
  if (/ron|vino|whisky|vodka|pisco|licor|tragos/.test(text)) return 'Licores';
  if (/galleta|chocolate|chizito|papas|snack|caramelo|chicle|mani|maní/.test(text)) return 'Snacks';
  if (/arroz|azucar|azúcar|fideo|aceite|atun|atún|leche|conserva|abarrote/.test(text)) return 'Abarrotes';
  if (/shampoo|jab[oó]n|pasta dental|desodorante|pañal|toalla/.test(text)) return 'Cuidado personal';
  if (/detergente|lej[ií]a|limpiador|lavavajilla|esponja/.test(text)) return 'Limpieza';
  return product.category && !/general|otros|producto/i.test(product.category) ? product.category : 'Otros';
};
export const saleTime = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
export const reportPeriodLabel = (period: ReportPeriod) => ({ dia: 'Últimos 7 días', mes: 'Este mes', ano: 'Este año', historico: 'Todo el histórico' }[period]);
export const reportDateLabel = (value: string, period: ReportPeriod) => {
  const date = new Date(`${value}T00:00:00`);
  return period === 'ano' || period === 'historico'
    ? date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
    : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
};
