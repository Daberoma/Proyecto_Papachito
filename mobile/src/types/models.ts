import type { OfflineSale } from '../offline';

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
};
