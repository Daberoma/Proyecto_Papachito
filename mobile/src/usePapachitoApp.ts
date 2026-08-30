import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform, useWindowDimensions, type DimensionValue } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSales,getApiBase,getApiBases,getCatalog,getSeller,getPaymentConfig,queueSale,removeSale,replaceSales,setSeller,setApiBase,setPaymentConfig,setCatalog,discoverApiBase,detectApiBase,syncPendingSales,getPendingPaymentQrDeletes,addPendingPaymentQrDelete,removePendingPaymentQrDelete,type OfflineSale,type PaymentConfig,type PaymentMethodKey,type PaymentProvider, type StockWarning } from './offline';
import { API,apiCandidates,classifyProduct,fallbackProducts,localDateKey,money,productSearchText,saleSearchText,saleTime,type CartItem,type Product,type RemoteReport,type ReportOrigin,type ReportPeriod,type Screen,type SearchResult } from './domain';
import { checkGithubApkUpdate, downloadAndOpenGithubApk, installedVersion, installedVersionCode, type GithubApkUpdate, type ApkDownloadProgress } from './githubApkUpdate';

const remoteSaleToOffline = (sale: any): OfflineSale => ({
  id: `remote-${sale.uuid}`,
  remoteUuid: sale.uuid,
  seller: sale.customer_name || 'Histórico',
  items: sale.items || [],
  total: Number(sale.total || 0),
  paymentMethod: String(sale.payment_provider || 'cash') === 'cash' ? 'cash' : 'digital',
  paymentProvider: sale.payment_provider === 'cash' ? 'cash' : ['yape', 'plin', 'bbva'].includes(String(sale.payment_provider)) ? sale.payment_provider as PaymentProvider : sale.payment_provider === 'digital_wallet' ? 'digital_unknown' : 'cash',
  paymentLabel: sale.payment_method_name || undefined,
  createdAt: sale.sold_at || new Date().toISOString(),
  status: 'synced',
  origin: sale.origin === 'historical' ? 'historical' : 'current',
  readOnly: sale.origin === 'historical',
});

const mergeSales = (local: OfflineSale[], remote: OfflineSale[]) => {
  const localIds = new Set(local.map((sale) => sale.remoteUuid || sale.id));
  return [...local, ...remote.filter((sale) => !localIds.has(sale.remoteUuid || sale.id))];
};

const qrMimeFromUri = (uri: string) => uri.toLowerCase().includes('.png') ? 'image/png' : uri.toLowerCase().includes('.webp') ? 'image/webp' : 'image/jpeg';
type ConnectionQr = { apiBase: string; webUrl: string; connectionUrl: string; qrDataUrl: string };

export function usePapachitoApp() {
  const deviceIdRef = useRef(`mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // La navegación lateral consume 250 px. Hasta 1099 px se conserva el modo
  // compacto (sin barra lateral) para priorizar tarjetas legibles.
  const isWide = width >= 1100;
  // En teléfonos reales de 360–430dp, dos columnas dejan nombres y precios
  // demasiado apretados. Una columna mejora lectura y precisión táctil;
  // tablets y pantallas anchas conservan la cuadrícula.
  const isNarrow = width < 430;
  // La vista de cobro usa una densidad distinta según el ancho disponible:
  // dos columnas en PC compacta, tres en una ventana normal y cuatro solo
  // cuando hay espacio real para mantener la lectura de cada tarjeta.
  const productCardWidth: DimensionValue = Platform.OS === 'web'
    ? width >= 1680 ? '23.6%'
      : width >= 1240 ? '31.9%'
        : isWide ? '48.7%'
          : isNarrow ? '100%' : '48.5%'
    : isWide ? '31.8%'
      : isNarrow ? '100%' : '48.5%';

  const [booting, setBooting] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [setupName, setSetupName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [settingsName, setSettingsName] = useState('');
  const [screen, setScreen] = useState<Screen>('sale');
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [online, setOnline] = useState(false);
  const [apiBase, setApiBaseState] = useState(API);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todo');
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('mes');
  const [reportOrigin, setReportOrigin] = useState<ReportOrigin>('current');
  const [remoteReport, setRemoteReport] = useState<RemoteReport | null>(null);
  const [reportDetailSales, setReportDetailSales] = useState<OfflineSale[]>([]);
  const [calendarSaleCounts, setCalendarSaleCounts] = useState<Record<string, number>>({});
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStale, setReportStale] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchingServer, setSearchingServer] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');
  const [savedApiBases, setSavedApiBases] = useState<string[]>([]);
  const [addedProductPulse, setAddedProductPulse] = useState('');
  const [paymentConfig, setPaymentConfigState] = useState<PaymentConfig>({ yapeEnabled: true, plinEnabled: false, bbvaEnabled: false });
  const [availableUpdate, setAvailableUpdate] = useState<GithubApkUpdate | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState<ApkDownloadProgress | null>(null);
  const [connectionQr, setConnectionQr] = useState<ConnectionQr | null>(null);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [serverSaving, setServerSaving] = useState(false);
  const [cancellingSaleId, setCancellingSaleId] = useState('');
  const [catalogUsingCache, setCatalogUsingCache] = useState(false);
  const mountedRef = useRef(true);
  const catalogLoadingRef = useRef(false);
  const lastCatalogLoadAtRef = useRef(0);
  const syncLoadingRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  const wasOnlineRef = useRef<boolean | null>(null);

  const pendingCount = sales.filter((sale) => sale.status !== 'synced').length;
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const categories = useMemo(() => ['Todo', ...Array.from(new Set(products.map((item) => item.category || 'Otros')))], [products]);
  const searchText = search.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesText = !searchText || productSearchText(item).includes(searchText);
      const matchesCategory = category === 'Todo' || (item.category || 'Otros') === category;
      return matchesText && matchesCategory;
    });
  }, [category, products, searchText]);

  const filteredSales = useMemo(() => {
    if (!searchText) return sales;
    return sales.filter((sale) => saleSearchText(sale).includes(searchText));
  }, [sales, searchText]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchText) return [];
    const productResults: SearchResult[] = products
      .filter((item) => productSearchText(item).includes(searchText))
      .slice(0, 5)
      .map((product) => ({
        type: 'product',
        title: product.name,
        subtitle: `${product.category || 'Producto'} · ${money(Number(product.price))}`,
        product,
      }));
    const saleResults: SearchResult[] = sales
      .filter((sale) => saleSearchText(sale).includes(searchText))
      .slice(-4)
      .reverse()
      .map((sale) => ({
        type: 'sale',
        title: sale.status === 'synced' ? 'Venta enviada' : 'Venta pendiente',
        subtitle: `${saleTime(sale.createdAt)} · ${sale.seller} · ${money(sale.total)}`,
        sale,
      }));
    return [...productResults, ...saleResults].slice(0, 8);
  }, [products, sales, searchText]);

  const visibleSales = useMemo(() => filteredSales.slice().reverse(), [filteredSales]);
  const todaySales = useMemo(() => {
    const today = localDateKey(new Date());
    return sales.filter((sale) => localDateKey(sale.createdAt) === today);
  }, [sales]);
  const todayTotal = useMemo(() => todaySales.reduce((sum, sale) => sum + sale.total, 0), [todaySales]);
  const reportTotal = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const reportDays = useMemo(() => {
    const totals = new Map<string, number>();
    sales.forEach((sale) => {
      const key = localDateKey(sale.createdAt);
      totals.set(key, (totals.get(key) || 0) + Number(sale.total || 0));
    });
    const rows: { date: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = localDateKey(date);
      rows.push({
        date: dateKey,
        label: date.toLocaleDateString('es-PE', { weekday: 'short' }),
        total: totals.get(dateKey) || 0,
      });
    }
    return rows;
  }, [sales]);
  const topProducts = useMemo(() => {
    if (remoteReport?.topProducts?.length) return remoteReport.topProducts;
    const map = new Map<string, { name: string; quantity: number; total: number }>();
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = String(item.id || item.name);
        const current = map.get(key) || { name: item.name || 'Producto', quantity: 0, total: 0 };
        const quantity = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        current.quantity += quantity;
        current.total += quantity * price;
        map.set(key, current);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredSales, remoteReport]);
  const paymentBreakdown = useMemo(() => {
    const rows = [
      { key: 'cash', label: 'Efectivo', total: 0, color: '#b27624', enabled: true },
      { key: 'yape', label: 'Yape', total: 0, color: '#7b4f8b', enabled: paymentConfig.yapeEnabled },
      { key: 'plin', label: 'Plin', total: 0, color: '#315b91', enabled: paymentConfig.plinEnabled },
      { key: 'bbva', label: 'BBVA', total: 0, color: '#174f42', enabled: paymentConfig.bbvaEnabled },
    ];
    const totals = new Map(rows.map((row) => [row.key, row]));
    let unknownDigital = 0;
    if (remoteReport?.payments) {
      remoteReport.payments.forEach((payment) => {
        const code = String(payment.code || '').toLowerCase();
        const row = totals.get(code);
        if (row) row.total += Number(payment.total || 0);
        else unknownDigital += Number(payment.total || 0);
      });
    } else {
      filteredSales.filter((sale) => sale.status === 'synced').forEach((sale) => {
        const provider = sale.paymentProvider || (sale.paymentMethod === 'digital' ? 'digital_unknown' : 'cash');
        const row = totals.get(provider);
        if (row) row.total += Number(sale.total || 0);
        else if (provider === 'digital_unknown') unknownDigital += Number(sale.total || 0);
      });
    }
    const allRows = unknownDigital > 0 ? [...rows, { key: 'digital_unknown', label: 'Pago digital sin detalle', total: unknownDigital, color: '#89918c', enabled: false }] : rows;
    return allRows.sort((left, right) => Number(right.enabled) - Number(left.enabled));
  }, [filteredSales, paymentConfig.bbvaEnabled, paymentConfig.plinEnabled, paymentConfig.yapeEnabled, remoteReport]);
  const sellerBreakdown = useMemo(() => {
    if (remoteReport?.sellers?.length) return remoteReport.sellers;
    const map = new Map<string, { label: string; count: number; total: number }>();
    filteredSales.filter((sale) => sale.status === 'synced').forEach((sale) => {
      const label = sale.seller?.trim() || 'Sin nombre';
      const current = map.get(label) || { label, count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.total || 0);
      map.set(label, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSales, remoteReport]);
  const maxProductTotal = Math.max(1, ...topProducts.map((item) => item.total));
  const maxPaymentTotal = Math.max(1, ...paymentBreakdown.map((item) => item.total));
  const maxSellerTotal = Math.max(1, ...sellerBreakdown.map((item) => item.total));
  const reportSummary = remoteReport?.summary || { count: filteredSales.length, total: reportTotal, average: filteredSales.length ? reportTotal / filteredSales.length : 0 };
  const reportSeries = useMemo(() => {
    const source = remoteReport?.series?.length ? remoteReport.series : reportDays.map((day) => ({ date: day.date, count: 0, total: day.total }));
    const monthly = reportPeriod === 'ano' || reportPeriod === 'historico';
    const sourceMap = new Map(source.map((item) => [monthly ? item.date.slice(0, 7) : item.date.slice(0, 10), item]));
    const pad = (value: number) => String(value).padStart(2, '0');
    const keyFor = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const keys: string[] = [];
    const today = new Date();
    if (reportPeriod === 'dia') {
      for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        keys.push(keyFor(date));
      }
    } else if (reportPeriod === 'mes') {
      for (let day = 1; day <= today.getDate(); day += 1) keys.push(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(day)}`);
    } else if (reportPeriod === 'ano') {
      for (let month = 0; month < 12; month += 1) keys.push(`${today.getFullYear()}-${pad(month + 1)}-01`);
    } else {
      const first = source[0]?.date ? new Date(`${source[0].date.slice(0, 7)}-01T00:00:00`) : new Date(today.getFullYear(), today.getMonth() - 11, 1);
      const start = new Date(first.getFullYear(), first.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      for (const cursor = start; cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) keys.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-01`);
    }
    return keys.map((date) => {
      const item = sourceMap.get(monthly ? date.slice(0, 7) : date);
      return item || { date, count: 0, total: 0 };
    });
  }, [remoteReport, reportDays, reportPeriod]);
  const reportMax = Math.max(1, ...reportSeries.map((item) => Number(item.total)));

  const refreshSales = useCallback(async (baseOverride?: string) => {
    const local = await getSales();
    let merged = local;
    try {
      const base = baseOverride || await getApiBase();
      if (base) {
        const response = await fetch(`${base}/api/ventas`, { signal: AbortSignal.timeout(1800) });
        const payload = await response.json();
        if (response.ok && payload.ok && Array.isArray(payload.sales)) {
          const historical: OfflineSale[] = payload.sales.map(remoteSaleToOffline);
          merged = mergeSales(local, historical);
        }
      }
    } catch { /* el historial local sigue disponible sin conexión */ }
    setSales(merged);
  }, []);

  const updateSale = useCallback(async (sale: OfflineSale, seller: string, items: any[]) => {
    const nextSeller = seller.trim();
    const nextItems = items.map((item) => ({
      id: item.id,
      name: String(item.name || '').trim(),
      quantity: Number(item.quantity),
      price: Number(item.price ?? item.unitPrice),
    }));
    if (!nextSeller || !nextItems.length || nextItems.some((item) => !item.name || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.price) || item.price < 0)) throw new Error('Completa el vendedor y los productos con valores válidos.');
    const total = nextItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    if (!Number.isFinite(total) || total <= 0) throw new Error('El total de la venta debe ser mayor que cero.');
    if (sale.remoteUuid) {
      const base = await detectApiBase(apiCandidates);
      const response = await fetch(`${base}/api/ventas/${encodeURIComponent(sale.remoteUuid)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller: nextSeller, items: nextItems }),
        signal: AbortSignal.timeout(5000),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo actualizar la venta.');
    }
    const updated = { ...sale, seller: nextSeller, items: nextItems, total };
    const all = (await getSales()).map((item) => item.id === sale.id ? updated : item);
    await replaceSales(all);
    setSales(all);
    await refreshSales();
  }, [refreshSales]);

  const deleteSale = useCallback(async (sale: OfflineSale) => {
    if (cancellingSaleId) return;
    setCancellingSaleId(sale.id);
    try {
      if (sale.remoteUuid) {
        const base = await detectApiBase(apiCandidates);
        const response = await fetch(`${base}/api/ventas/${encodeURIComponent(sale.remoteUuid)}`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo anular');
      }
      await removeSale(sale.id);
      await refreshSales();
    } finally {
      setCancellingSaleId('');
    }
  }, [cancellingSaleId, refreshSales]);

  const cancelSale = useCallback((sale: OfflineSale) => {
    Alert.alert('Eliminar venta', 'La venta se quitará del historial local y, si ya fue enviada, se anulará en la base de datos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await deleteSale(sale);
          Alert.alert('Venta eliminada', 'La operación fue quitada correctamente.');
        } catch (error: any) {
          Alert.alert('No se pudo eliminar', error?.message || 'Revisa la conexión e inténtalo de nuevo.');
        }
      } },
    ]);
  }, [deleteSale]);

  const simulateSale = useCallback(async () => {
    const product = products[0];
    if (!product) return;
    const total = Number(product.price || 0);
    const sale: OfflineSale = {
      id: `simulation-${Date.now()}`,
      seller: sellerName || 'Simulación',
      items: [{ name: product.name, quantity: 1, price: total }],
      total,
      paymentMethod: 'cash',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    const all = await queueSale(sale);
    setSales(all);
    Alert.alert('Simulación creada', `${product.name} quedó como venta pendiente para probar Historial.`);
  }, [products, sellerName]);

  const loadCatalog = useCallback(async (preferredBase?: string) => {
    if (catalogLoadingRef.current) return;
    catalogLoadingRef.current = true;
    const cached = await getCatalog<Product[]>();
    const hasCachedCatalog = cached.length > 0;
    // La pantalla de venta debe abrirse desde la caché. La red se verifica en
    // segundo plano para evitar una pausa al volver desde Ajustes.
    if (hasCachedCatalog) {
      setProducts(cached);
      setCatalogUsingCache(true);
      setLoadingCatalog(false);
      setSearchingServer(false);
      // Aunque exista caché reciente, al volver de Wi‑Fi hay que volver a
      // comprobar la API: la IP de la laptop puede haber cambiado.
    } else {
      setLoadingCatalog(true);
      setSearchingServer(true);
    }
    try {
      // Se prueba primero el servidor indicado por QR o el último guardado.
      // Así el cambio de Wi‑Fi no obliga a esperar todo el barrido de la red.
      const storedBase = await getApiBase();
      let base = preferredBase || storedBase;
      let response: Response | null = null;
      // Si ya conocemos la API, no hacemos un barrido de 254 direcciones.
      if (base) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const controller = new AbortController();
          // En Android el primer fetch puede tardar más por la negociación
          // de red; la caché ya está visible y este timeout no bloquea Vender.
          timer = setTimeout(() => controller.abort(), 3000);
          response = await fetch(`${base}/api/catalogo`, { signal: controller.signal });
          if (!response.ok) response = null;
        } catch {
          response = null;
        } finally {
          // Evita dejar temporizadores activos tras una respuesta rápida o un timeout.
          // El catálogo se muestra desde caché mientras esta comprobación ocurre.
          if (timer) clearTimeout(timer);
        }
      }
      if (!response) {
        // No escanear automáticamente 254 IPs en cada arranque. El teléfono
        // puede estar offline y la app debe seguir funcionando con la caché.
        const networkState = await NetInfo.fetch();
        const localIp = String((networkState.details as { ipAddress?: string } | null)?.ipAddress || '');
        base = await discoverApiBase([preferredBase || '', storedBase, ...apiCandidates], localIp);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        try {
          response = await fetch(`${base}/api/catalogo`, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
      }
      await setApiBase(base);
      if (!mountedRef.current) return;
      setApiBaseState(base);
      setSavedApiBases(await getApiBases());
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo cargar el catálogo');
      const catalog = payload.products?.length ? payload.products : fallbackProducts;
      const normalized = catalog.map((product: Product) => ({ ...product, category: classifyProduct(product) }));
      if (!mountedRef.current) return;
      setProducts(normalized);
      setCatalogUsingCache(false);
      await setCatalog(normalized);
      lastCatalogLoadAtRef.current = Date.now();
      setOnline(true);
    } catch {
      if (!mountedRef.current) return;
      setOnline(false);
      setCatalogUsingCache(true);
      setProducts((current) => (current.length ? current : fallbackProducts));
    } finally {
      catalogLoadingRef.current = false;
      if (mountedRef.current) {
        setSearchingServer(false);
        setLoadingCatalog(false);
      }
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (syncLoadingRef.current) return false;
    syncLoadingRef.current = true;
    setSyncing(true);
    setSyncError('');
    try {
      const localSales = await getSales();
      const hasPending = localSales.some((sale) => sale.status !== 'synced');
      if (!hasPending) {
        lastSyncAtRef.current = Date.now();
        return true;
      }
      const saved = await getApiBase();
      const networkState = await NetInfo.fetch();
      const localIp = String((networkState.details as { ipAddress?: string } | null)?.ipAddress || '');
      const base = saved || await discoverApiBase(apiCandidates, localIp);
      setApiBaseState(base);
      setSavedApiBases(await getApiBases());
      const result = await syncPendingSales(base);
      lastSyncAtRef.current = Date.now();
      setOnline(result.online);
      if (result.synced > 0) setLastSyncAt(new Date().toISOString());
      if (result.synced > 0 && result.warnings.length > 0) {
        const uniqueWarnings = result.warnings.filter((warning, index, all) => {
          const key = `${warning.productId ?? warning.productName ?? warning.name ?? warning.message ?? index}|${warning.available ?? warning.stock ?? ''}`;
          return all.findIndex((item, itemIndex) => `${item.productId ?? item.productName ?? item.name ?? item.message ?? itemIndex}|${item.available ?? item.stock ?? ''}` === key) === index;
        });
        const details = uniqueWarnings.map((warning: StockWarning) => {
          const name = warning.productName || warning.name || (warning.productId != null ? `Producto ${warning.productId}` : 'Producto');
          if (warning.message) return `• ${name}: ${warning.message}`;
          const available = warning.available ?? warning.stock;
          return available == null ? `• ${name}: stock insuficiente` : `• ${name}: stock disponible ${available}`;
        }).join('\n');
        Alert.alert('Venta guardada con advertencia', `La venta quedó guardada, pero revisa el stock:\n${details}`);
      }
      await refreshSales();
      return result.online;
    } catch {
      setOnline(false);
      setSyncError('No se pudo conectar con la computadora. Tus ventas siguen guardadas y puedes reintentar.');
      await refreshSales();
      return false;
    } finally {
      syncLoadingRef.current = false;
      setSyncing(false);
    }
  }, [refreshSales]);

  const syncPaymentQrs = useCallback(async (base: string) => {
    if (!base) return;
    try {
      const pendingDeletes = await getPendingPaymentQrDeletes();
      for (const method of pendingDeletes) {
        const response = await fetch(`${base}/api/config/medios-pago/${method}/qr`, { method: 'DELETE', signal: AbortSignal.timeout(3000) });
        if (response.ok) await removePendingPaymentQrDelete(method);
      }

      const response = await fetch(`${base}/api/config/medios-pago`, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.qrs)) return;

      const current = await getPaymentConfig();
      const next = { ...current } as PaymentConfig;
      let changed = false;
      const methods: PaymentMethodKey[] = ['yape', 'plin', 'bbva'];
      if (Array.isArray(payload.methods)) {
        for (const method of methods) {
          const remoteMethod = payload.methods.find((item: any) => item.method === method);
          const enabledKey = `${method}Enabled` as 'yapeEnabled' | 'plinEnabled' | 'bbvaEnabled';
          if (remoteMethod && typeof remoteMethod.enabled === 'boolean' && next[enabledKey] !== remoteMethod.enabled) {
            next[enabledKey] = remoteMethod.enabled;
            changed = true;
          }
        }
      }
      for (const method of methods) {
        const uriKey = `${method}QrUri` as 'yapeQrUri' | 'plinQrUri' | 'bbvaQrUri';
        const versionKey = `${method}QrVersion` as 'yapeQrVersion' | 'plinQrVersion' | 'bbvaQrVersion';
        const remote = payload.qrs.find((item: any) => item.method === method);
        const localUri = next[uriKey];
        const localInfo = localUri ? await FileSystem.getInfoAsync(localUri) : null;

        if (remote) {
          if (localUri && localInfo?.exists && next[versionKey] === String(remote.version)) continue;
          const extension = String(remote.mimeType || '').includes('png') ? 'png' : String(remote.mimeType || '').includes('webp') ? 'webp' : 'jpg';
          const target = `${FileSystem.documentDirectory}papachito-${method}-qr-cache.${extension}`;
          const downloaded = await FileSystem.downloadAsync(`${base}${remote.url}`, target);
          if (localUri && localUri !== downloaded.uri && localUri.startsWith(String(FileSystem.documentDirectory || ''))) {
            await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
          }
          next[uriKey] = downloaded.uri;
          next[versionKey] = String(remote.version);
          changed = true;
        } else if (localUri && localInfo?.exists) {
          const encoded = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' as any });
          const upload = await fetch(`${base}/api/config/medios-pago/${method}/qr`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: `data:${qrMimeFromUri(localUri)};base64,${encoded}`, mimeType: qrMimeFromUri(localUri) }),
            signal: AbortSignal.timeout(5000),
          });
          if (upload.ok) {
            const uploaded = await upload.json();
            next[versionKey] = String(uploaded.version || '');
            changed = true;
          }
        }
      }
      if (changed) {
        setPaymentConfigState(next);
        await setPaymentConfig(next);
      }
    } catch {
      // El QR local sigue disponible aunque el servidor esté apagado.
    }
  }, []);

  useEffect(() => {
    if (!online || !apiBase) return;
    void syncPaymentQrs(apiBase);
    // La configuración puede cambiar desde otro celular o la PC. Un sondeo
    // corto mantiene estados y QR alineados sin recargar el catálogo.
    const timer = setInterval(() => void syncPaymentQrs(apiBase), 5000);
    return () => clearInterval(timer);
  }, [apiBase, online, syncPaymentQrs]);

  const loadConnectionQr = useCallback(async () => {
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase}/api/conexion/qr`, { signal: AbortSignal.timeout(3500) });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.qrDataUrl && payload?.connectionUrl) setConnectionQr(payload);
    } catch {
      // Conserva el último QR válido si la API se reinicia.
    }
  }, [apiBase]);

  useEffect(() => {
    if (!isWide || !online || !apiBase || screen !== 'settings') return;
    void loadConnectionQr();
    const timer = setInterval(() => void loadConnectionQr(), 10000);
    return () => clearInterval(timer);
  }, [apiBase, isWide, loadConnectionQr, online, screen]);

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Permiso de cámara', 'Activa la cámara para escanear el QR o configura la IP manualmente.');
        return;
      }
    }
    setScannerOpen(true);
  };

  const connectFromQr = async (raw: string) => {
    try {
      const value = raw.trim().replace(/[\r\n]/g, '');
      let api = '';
      if (value.startsWith('papachito://')) {
        const query = value.slice(value.indexOf('?') + 1);
        const encoded = query.split('&').find((part) => part.toLowerCase().startsWith('api='))?.slice(4) || '';
        api = decodeURIComponent(encoded.replace(/\+/g, '%20'));
      } else if (/^https?:\/\//i.test(value)) {
        api = value;
      }
      if (!/^https?:\/\/[^\s/]+:\d+$/.test(api || '')) throw new Error('QR no válido');
      api = api.trim().replace(/\/$/, '');
      if (!/^https?:\/\/[^\s/:]+(?::\d+)?$/i.test(api || '')) throw new Error('QR no válido');
      setScannerOpen(false);
      setApiBaseState(api);
      const probe = await fetch(`${api}/api/salud`, { signal: AbortSignal.timeout(3500) });
      if (!probe.ok) throw new Error('No se pudo contactar la laptop. Verifica que ambos estén en la misma WiFi.');
      await fetch(`${api}/api/conexion/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: 'App móvil', deviceId: deviceIdRef.current }),
        signal: AbortSignal.timeout(2500),
      });
      await setApiBase(api);
      setSavedApiBases(await getApiBases());
      await loadCatalog(api);
      await syncPaymentQrs(api);
      await syncNow();
      Alert.alert('Conectado', 'Servidor guardado y sincronización iniciada.');
    } catch (error: any) {
      Alert.alert('QR no válido', error?.message || 'Escanea el QR mostrado por Papachito.');
    }
  };

  const loadReport = useCallback(async (period: ReportPeriod, origin: ReportOrigin = reportOrigin) => {
    setReportLoading(true);
    setRemoteReport(null);
    setReportDetailSales([]);
    try {
      const base = await detectApiBase(apiCandidates);
      setApiBaseState(base);
      const [response, daysResponse] = await Promise.all([
        fetch(`${base}/api/reportes?periodo=${period}&origen=${origin}`, { signal: AbortSignal.timeout(3500) }),
        fetch(`${base}/api/ventas/dias?origen=${origin}`, { signal: AbortSignal.timeout(3500) }).catch(() => null),
      ]);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo cargar reporte');
      setRemoteReport(payload as RemoteReport);
      const detailResponse = await fetch(`${base}/api/ventas?desde=${encodeURIComponent(payload.from)}&hasta=${encodeURIComponent(payload.to)}&origen=${origin}&estado=completed`, { signal: AbortSignal.timeout(5000) });
      const detailPayload = await detailResponse.json().catch(() => ({}));
      if (detailResponse.ok && detailPayload.ok && Array.isArray(detailPayload.sales)) {
        setReportDetailSales(detailPayload.sales.map(remoteSaleToOffline));
      }
      setReportStale(false);
      if (daysResponse) {
        const daysPayload = await daysResponse.json();
        if (daysResponse.ok && daysPayload.ok && Array.isArray(daysPayload.days)) {
          setCalendarSaleCounts(Object.fromEntries(daysPayload.days.map((day: any) => [String(day.date).slice(0, 10), Number(day.count || 0)])));
        }
      }
      setOnline(true);
    } catch {
      setOnline(false);
      setReportStale(true);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    // Arranque local-first: ninguna petición de red puede bloquear la primera
    // pantalla. Todo lo necesario para vender offline se lee en paralelo.
    (async () => {
      const [storedName, storedApi, savedBases, localPaymentConfig, cached, localSales] = await Promise.all([
        getSeller(),
        getApiBase(),
        getApiBases(),
        getPaymentConfig(),
        getCatalog<Product[]>(),
        getSales(),
      ]);
      if (cancelled || !mountedRef.current) return;
      const name = storedName.trim();
      if (name) {
        setSellerName(name);
        setSettingsName(name);
        setHasProfile(true);
      }
      if (storedApi) setApiBaseState(storedApi);
      setSavedApiBases(savedBases);
      setPaymentConfigState(localPaymentConfig);
      if (cached.length) setProducts(cached);
      setSales(localSales);
      setBooting(false);

      // La red empieza después de que React pinte la interfaz.
      // Dejar que React pinte la primera pantalla antes de iniciar la red,
      // sin usar InteractionManager, que está obsoleto en RN actual.
      setTimeout(() => {
        if (!cancelled && mountedRef.current) {
          void loadCatalog();
          void syncNow();
        }
      }, 0);
    })();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const wasOnline = wasOnlineRef.current;
      wasOnlineRef.current = connected;
      if (!connected) {
        if (mountedRef.current) setOnline(false);
        return;
      }
      // Solo refrescar al recuperar conexión, no por cada evento repetido.
      if (wasOnline === false || wasOnline === null) {
        void loadCatalog();
        void syncNow();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastSyncAtRef.current > 60000) {
        void loadCatalog();
        void syncNow();
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [loadCatalog, refreshSales, syncNow]);

  useEffect(() => {
    if (screen === 'report' && hasProfile) {
      // El resumen llega desde el servidor, pero el detalle ampliable de cada
      // medio necesita cargar también las ventas con vendedor y proveedor.
      void Promise.all([loadReport(reportPeriod, reportOrigin), refreshSales()]);
    }
  }, [hasProfile, loadReport, refreshSales, reportOrigin, reportPeriod, screen]);

  const continueSetup = async () => {
    const name = setupName.trim();
    if (!name) {
      Alert.alert('Falta tu nombre', 'Escribe tu nombre para continuar.');
      return;
    }
    await setSeller(name);
    setSellerName(name);
    setSettingsName(name);
    setHasProfile(true);
  };

  const saveSettingsName = async () => {
    const name = settingsName.trim();
    if (!name) {
      Alert.alert('Nombre vacío', 'Escribe un nombre válido.');
      return;
    }
    await setSeller(name);
    setSellerName(name);
    Alert.alert('Listo', 'Nombre actualizado.');
  };

  const saveServer = async () => {
    if (serverSaving) return;
    const value = apiBase.trim().replace(/\/$/, '');
    if (!/^https?:\/\/[^\s/]+:\d+$/.test(value)) {
      Alert.alert('Servidor inválido', 'Usa un formato como http://192.168.1.10:8090');
      return;
    }
    setServerSaving(true);
    try {
      await setApiBase(value);
      setApiBaseState(value);
      setSavedApiBases(await getApiBases());
      const connected = await syncNow();
      await refreshSales(value);
      Alert.alert(connected ? 'Conexión lista' : 'Servidor guardado', connected ? 'La computadora está conectada y las ventas pendientes se revisaron.' : 'Guardamos la dirección, pero no logramos conectar. Revisa que la API esté iniciada y vuelve a intentar.');
    } finally {
      setServerSaving(false);
    }
  };

  const checkForUpdate = useCallback(async () => {
    setUpdateChecking(true);
    try {
      const update = await checkGithubApkUpdate();
      setAvailableUpdate(update);
      if (update) {
        setUpdateStatus(`Nueva versión ${update.version} disponible para descargar.`);
      } else {
        const message = Platform.OS === 'web'
          ? 'Panel de computadora actualizado. Los APK se actualizan desde el teléfono.'
          : `Ya estás actualizado: versión ${installedVersion}.`;
        setUpdateStatus(message);
        Alert.alert('Actualizado', message);
      }
    } catch (error: any) {
      const message = error?.message || 'Revisa tu conexión e inténtalo nuevamente.';
      setUpdateStatus(`No se pudo revisar: ${message}`);
      Alert.alert('No se pudo revisar', message);
    } finally {
      setUpdateChecking(false);
    }
  }, []);

  const loadSalesForDate = useCallback(async (date: string, origin: ReportOrigin = reportOrigin): Promise<OfflineSale[]> => {
    const local = await getSales();
    const localForDay = local.filter((sale) => sale.createdAt.slice(0, 10) === date);
    try {
      const base = await getApiBase();
      if (!base) return localForDay;
      const response = await fetch(`${base}/api/ventas?desde=${date}&hasta=${date}&origen=${origin}&estado=completed`, { signal: AbortSignal.timeout(3500) });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !Array.isArray(payload.sales)) return localForDay;
      const remote = payload.sales.map(remoteSaleToOffline);
      return mergeSales(localForDay, remote);
    } catch {
      return localForDay;
    }
  }, [reportOrigin]);

  const installUpdate = useCallback(async () => {
    if (!availableUpdate) return;
    setUpdateInstalling(true);
    setUpdateDownloadProgress({ receivedBytes: 0, totalBytes: 0, progress: 0 });
    try {
      await downloadAndOpenGithubApk(availableUpdate, setUpdateDownloadProgress);
    } catch (error: any) {
      Alert.alert('No se pudo abrir el instalador', error?.message || 'Descarga nuevamente la versión.');
    } finally {
      setUpdateInstalling(false);
      setUpdateDownloadProgress(null);
    }
  }, [availableUpdate]);

  const addProduct = useCallback((product: Product) => {
    setAddedProductPulse(`${String(product.id)}-${Date.now()}`);
    setCart((current) => {
      const found = current.find((item) => String(item.id) === String(product.id));
      if (!found) return [...current, { ...product, quantity: 1 }];
      return current.map((item) => (String(item.id) === String(product.id) ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }, [reportOrigin]);

  const createProduct = useCallback(async (input: { name: string; price: number; category: string; description: string; presentationType: string; presentationQuantity: number; presentationLabel: string; presentationColor: string; imageData?: string; imageMimeType?: string }) => {
    if (!apiBase) throw new Error('Conecta la computadora antes de agregar productos.');
    const response = await fetch(`${apiBase}/api/config/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo guardar el producto.');
    await loadCatalog(apiBase);
    return payload;
  }, [apiBase, loadCatalog]);

  const updateProduct = useCallback(async (id: Product['id'], input: { name: string; price: number; category: string; description: string; presentationType?: string; presentationQuantity?: number; presentationLabel?: string; presentationColor?: string }) => {
    if (!apiBase) throw new Error('Conecta la computadora antes de editar productos.');
    const response = await fetch(`${apiBase}/api/config/productos/${encodeURIComponent(String(id))}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo actualizar el producto.');
    await loadCatalog(apiBase);
    return payload;
  }, [apiBase, loadCatalog]);

  const deleteProductPermanently = useCallback(async (id: Product['id']) => {
    if (!apiBase) throw new Error('Conecta la computadora antes de eliminar productos.');
    const response = await fetch(`${apiBase}/api/config/productos/${encodeURIComponent(String(id))}/permanente`, { method: 'DELETE', signal: AbortSignal.timeout(10000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo eliminar el producto.');
    await loadCatalog(apiBase);
    return payload;
  }, [apiBase, loadCatalog]);

  const removeOne = (product: CartItem) => {
    setCart((current) =>
      current
        .map((item) => (String(item.id) === String(product.id) ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const confirmSale = async (provider?: PaymentProvider) => {
    if (saleSubmitting) return;
    if (!cart.length) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
      return;
    }
    setSaleSubmitting(true);
    try {
    const sale: OfflineSale = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      seller: sellerName,
      items: cart.map((item) => ({ id: item.id, name: item.name, price: Number(item.price), quantity: item.quantity })),
      total: cartTotal,
      paymentMethod,
      paymentProvider: paymentMethod === 'digital' ? provider || 'digital_unknown' : 'cash',
      paymentLabel: paymentMethod === 'digital' ? ({ yape: 'Yape', plin: 'Plin', bbva: 'BBVA' } as Record<string, string>)[provider || ''] || 'Digital histórico' : 'Efectivo',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await queueSale(sale);
    // La venta ya está segura en AsyncStorage. Actualizar el historial local
    // inmediatamente permite cerrar el carrito sin esperar a la laptop o a
    // una segunda lectura remota del historial.
    setSales((current) => [...current, sale]);
    setCart([]);
    setCartOpen(false);
    Alert.alert(paymentMethod === 'digital' ? 'Pago digital guardado' : 'Venta guardada', 'La venta está guardada en este teléfono. Se enviará a la computadora cuando haya conexión.');
    void syncNow();
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.message || 'La venta no se guardó. Inténtalo nuevamente.');
    } finally {
      setSaleSubmitting(false);
    }
  };

  const selectSearchResult = (result: SearchResult) => {
    if (result.type === 'product') {
      setScreen('sale');
      addProduct(result.product);
    } else {
      setScreen('history');
      setCartOpen(false);
    }
    setSearch('');
  };

  useEffect(() => {
    if (!apiBase || !online) return;
    const sendHeartbeat = () => { void fetch(`${apiBase}/api/conexion/registrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: 'App móvil', deviceId: deviceIdRef.current }), signal: AbortSignal.timeout(2500) }).catch(() => {}); };
    sendHeartbeat();
    const timer = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(timer);
  }, [apiBase, online]);

  const navigateTo = useCallback((next: Screen) => {
    setScreen(next);
    if (next !== 'sale') setCartOpen(false);
  }, []);

  const togglePaymentMethod = useCallback(async (method: 'yapeEnabled' | 'plinEnabled' | 'bbvaEnabled', value: boolean) => {
    setPaymentConfigState((current) => {
      const next = { ...current, [method]: value };
      void setPaymentConfig(next);
      return next;
    });
    if (apiBase) {
      const methodKey = method.replace('Enabled', '') as PaymentMethodKey;
      try {
        await fetch(`${apiBase}/api/config/medios-pago/${methodKey}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: value }),
          signal: AbortSignal.timeout(3500),
        });
      } catch {
        // La preferencia queda local y se reintentará al reconectar.
      }
    }
  }, [apiBase]);

  const pickPaymentQr = useCallback(async (method: PaymentMethodKey) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const pickedUri = result.assets[0].uri;
    let uri = pickedUri;
    try {
      const extension = pickedUri.split('.').pop()?.split('?')[0] || 'jpg';
      const target = `${FileSystem.documentDirectory}papachito-${method}-qr-local.${extension}`;
      await FileSystem.copyAsync({ from: pickedUri, to: target });
      uri = target;
    } catch {
      // Si el proveedor de galería no permite copiar, conservamos la URI elegida.
    }
    const previous = (await getPaymentConfig())[`${method}QrUri` as 'yapeQrUri' | 'plinQrUri' | 'bbvaQrUri'];
    if (previous && previous !== uri && previous.startsWith(String(FileSystem.documentDirectory || ''))) {
      await FileSystem.deleteAsync(previous, { idempotent: true }).catch(() => {});
    }
    await removePendingPaymentQrDelete(method);
    setPaymentConfigState((current) => {
      const next = { ...current, [`${method}QrUri`]: uri, [`${method}QrVersion`]: undefined } as PaymentConfig;
      void setPaymentConfig(next);
      return next;
    });
    if (apiBase) {
      void (async () => {
        try {
          const encoded = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
          const mimeType = qrMimeFromUri(uri);
          const upload = await fetch(`${apiBase}/api/config/medios-pago/${method}/qr`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: `data:${mimeType};base64,${encoded}`, mimeType }),
            signal: AbortSignal.timeout(5000),
          });
          if (!upload.ok) return;
          const payload = await upload.json();
          setPaymentConfigState((current) => {
            const next = { ...current, [`${method}QrVersion`]: String(payload.version || '') } as PaymentConfig;
            void setPaymentConfig(next);
            return next;
          });
        } catch {
          // Se reintentará en segundo plano cuando vuelva la conexión.
        }
      })();
    }
  }, [apiBase]);

  const removePaymentQr = useCallback(async (method: PaymentMethodKey) => {
    const current = await getPaymentConfig();
    const uri = current[`${method}QrUri` as 'yapeQrUri' | 'plinQrUri' | 'bbvaQrUri'];
    if (uri && uri.startsWith(String(FileSystem.documentDirectory || ''))) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    await addPendingPaymentQrDelete(method);
    setPaymentConfigState((current) => {
      const next = { ...current } as PaymentConfig;
      delete next[`${method}QrUri` as 'yapeQrUri' | 'plinQrUri' | 'bbvaQrUri'];
      delete next[`${method}QrVersion` as 'yapeQrVersion' | 'plinQrVersion' | 'bbvaQrVersion'];
      void setPaymentConfig(next);
      return next;
    });
    if (apiBase) {
      try {
        const response = await fetch(`${apiBase}/api/config/medios-pago/${method}/qr`, { method: 'DELETE', signal: AbortSignal.timeout(3500) });
        if (response.ok) await removePendingPaymentQrDelete(method);
      } catch {
        // La eliminación queda en cola hasta recuperar la conexión.
      }
    }
  }, [apiBase]);

  return {
    insets, isWide, isNarrow, productCardWidth, booting, hasProfile, setupName, sellerName, settingsName, screen, products, cart, sales,
    online, apiBase, connectionQr, loadingCatalog, search, category, cartOpen, paymentMethod, reportPeriod, reportOrigin, remoteReport, reportDetailSales, calendarSaleCounts,
    reportLoading, reportStale, scannerOpen, searchingServer, lastSyncAt, paymentConfig, savedApiBases, addedProductPulse, availableUpdate,
    updateChecking, updateInstalling, updateDownloadProgress, updateStatus, installedVersion, installedVersionCode, pendingCount, cartTotal, categories, searchText, saleSubmitting, syncing, syncError, serverSaving, cancellingSaleId, catalogUsingCache,
    filteredProducts, filteredSales, visibleSales, searchResults, todaySales, todayTotal, reportTotal, topProducts, paymentBreakdown,
    sellerBreakdown, maxProductTotal, maxPaymentTotal, maxSellerTotal, reportSummary, reportSeries, reportMax, setSetupName,
    setSettingsName, setApiBaseState, setSearch, setCategory, setCartOpen, setPaymentMethod, setReportPeriod, setReportOrigin, setScannerOpen,
    togglePaymentMethod, pickPaymentQr, removePaymentQr, navigateTo, refreshSales, cancelSale, simulateSale, loadSalesForDate,
    syncNow, openScanner, connectFromQr, loadConnectionQr, loadReport, continueSetup, saveSettingsName, saveServer, checkForUpdate, installUpdate, updateSale,
    addProduct, createProduct, updateProduct, deleteProductPermanently, removeOne, confirmSale, deleteSale, selectSearchResult,
  };
}
