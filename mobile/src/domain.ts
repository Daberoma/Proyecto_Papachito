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
  imageUrl?: string;
  presentationType?: string;
  presentationQuantity?: number;
  presentationLabel?: string;
  presentationColor?: string;
};

export type CartItem = Product & { quantity: number };
export type Screen = 'sale' | 'history' | 'report' | 'settings' | 'payments' | 'products';
export type SearchResult =
  | { type: 'product'; title: string; subtitle: string; product: Product }
  | { type: 'sale'; title: string; subtitle: string; sale: OfflineSale };
export type ReportPeriod = 'dia' | 'mes' | 'ano' | 'historico';
export type ReportOrigin = 'current' | 'historical' | 'all';
export type RemoteReport = {
  period: ReportPeriod;
  origin?: ReportOrigin;
  readOnly?: boolean;
  from: string;
  to: string;
  summary: { count: number; total: number; average: number };
  series: { date: string; count: number; total: number }[];
  historical: { count: number; total: number; firstDate?: string; lastDate?: string; source?: string; readOnly?: boolean };
  topProducts?: { name: string; quantity: number; total: number }[];
  payments?: { label: string; total: number; code?: string }[];
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

export const money = (value: number) => `S/ ${value.toFixed(2)}`;
export const localDateKey = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export type ProductPresentation = {
  label: string;
  tone: 'unit' | 'pack' | 'box';
};

export const productSearchText = (product: Product) => `${product.name} ${product.description || ''} ${product.category || ''} ${product.sku || ''} ${product.barcode || ''} ${product.price}`.toLowerCase();

const presentationKey = (product: Product) => `${product.name.trim().toLowerCase()}|${String(product.category || '').trim().toLowerCase()}`;

export const productPresentation = (product: Product, catalog: Product[]): ProductPresentation => {
  if (product.presentationLabel) {
    const tone = product.presentationColor === 'box' ? 'box' : product.presentationColor === 'pack' ? 'pack' : 'unit';
    return { label: product.presentationLabel, tone };
  }
  const price = Number(product.price) || 0;
  const related = catalog
    .filter((candidate) => presentationKey(candidate) === presentationKey(product))
    .map((candidate) => Number(candidate.price) || 0)
    .filter((value) => value > 0);
  const base = related.length ? Math.min(...related) : price;
  const ratio = base > 0 ? price / base : 1;
  const explicitPack = /\b(caja|pack|paquete|six[- ]?pack)\b/i.test(product.name);
  if (ratio <= 1.08 && !explicitPack) return { label: 'Unidad', tone: 'unit' };
  if (ratio <= 1.08 && explicitPack) return { label: 'Pack', tone: 'pack' };
  const packSizes = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24];
  const quantity = packSizes.reduce((nearest, candidate) => Math.abs(candidate - ratio) < Math.abs(nearest - ratio) ? candidate : nearest, packSizes[0]);
  const isBox = quantity >= 10 || /\bcaja\b/i.test(product.name);
  return { label: isBox ? `Caja x${quantity}` : `Pack x${quantity}`, tone: isBox ? 'box' : 'pack' };
};
export const saleSearchText = (sale: OfflineSale) => `${sale.seller} ${sale.status} ${sale.total} ${sale.items.map((item) => item.name).join(' ')}`.toLowerCase();

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
export const reportPeriodLabel = (period: ReportPeriod) => ({ dia: 'Últimos 7 días', mes: 'Este mes', ano: 'Este año', historico: 'Histórico' }[period]);
export const reportDateLabel = (value: string, period: ReportPeriod) => {
  const raw = String(value || '');
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const local = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : local
      ? new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]))
      : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10) || '—';
  return period === 'ano' || period === 'historico'
    ? date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
    : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
};
