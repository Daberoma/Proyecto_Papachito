import Constants from 'expo-constants';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type DimensionValue,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getSales,
  getApiBase,
  getCatalog,
  getSeller,
  queueSale,
  removeSale,
  setSeller,
  setApiBase,
  setCatalog,
  discoverApiBase,
  detectApiBase,
  syncPendingSales,
  type OfflineSale,
} from './src/offline';

type Product = {
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

type CartItem = Product & { quantity: number };
type Screen = 'sale' | 'history' | 'report' | 'settings';
type SearchResult =
  | { type: 'product'; title: string; subtitle: string; product: Product }
  | { type: 'sale'; title: string; subtitle: string; sale: OfflineSale }
  | { type: 'action'; title: string; subtitle: string; screen: Screen };
type ReportPeriod = 'dia' | 'mes' | 'ano' | 'historico';
type RemoteReport = {
  period: ReportPeriod;
  from: string;
  to: string;
  summary: { count: number; total: number; average: number };
  series: { date: string; count: number; total: number }[];
  historical: { count: number; total: number; firstDate?: string; lastDate?: string };
  topProducts?: { name: string; quantity: number; total: number }[];
  payments?: { label: string; total: number }[];
};

const hostFromExpo = Constants.expoConfig?.hostUri?.split(':')[0];
const API = process.env.EXPO_PUBLIC_API_URL || (hostFromExpo ? `http://${hostFromExpo}:8090` : 'http://127.0.0.1:8090');
const apiCandidates = Array.from(new Set([
  API,
  hostFromExpo ? `http://${hostFromExpo}:8090` : '',
  typeof window !== 'undefined' && window.location?.hostname ? `http://${window.location.hostname}:8090` : '',
  'http://127.0.0.1:8090',
  'http://localhost:8090',
].filter(Boolean)));

const fallbackProducts: Product[] = [
  { id: 'demo-1', sku: 'DEMO-001', name: 'COCA COLA PIRANA DE 237 ML', description: 'Gaseosa personal | Unidad: NIU', price: 1, category: 'Gaseosas', stock: 0 },
  { id: 'demo-2', sku: 'DEMO-002', name: 'AGUA SAN MATEO 625 ML', description: 'Agua personal | Unidad: NIU', price: 1.5, category: 'Aguas', stock: 0 },
  { id: 'demo-3', sku: 'DEMO-003', name: 'INKA COLA PERSONAL', description: 'Gaseosa personal | Unidad: NIU', price: 2.5, category: 'Gaseosas', stock: 0 },
  { id: 'demo-4', sku: 'DEMO-004', name: 'INKA COLA 1 LITRO', description: 'Bebida familiar | Unidad: NIU', price: 5, category: 'Gaseosas', stock: 0 },
];

const actions: SearchResult[] = [
  { type: 'action', title: 'Vender producto', subtitle: 'Ir a nueva venta', screen: 'sale' },
  { type: 'action', title: 'Ver historial', subtitle: 'Revisar compras guardadas', screen: 'history' },
  { type: 'action', title: 'Ver reporte', subtitle: 'Resumen y grafico de ventas', screen: 'report' },
  { type: 'action', title: 'Cambiar nombre', subtitle: 'Editar vendedor en ajustes', screen: 'settings' },
];

const money = (value: number) => `S/ ${value.toFixed(2)}`;
const classifyProduct = (product: Product): string => {
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
const saleTime = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
const reportPeriodLabel = (period: ReportPeriod) => ({ dia: 'Últimos 7 días', mes: 'Este mes', ano: 'Este año', historico: 'Todo el histórico' }[period]);
const reportDateLabel = (value: string, period: ReportPeriod) => {
  const date = new Date(`${value}T00:00:00`);
  return period === 'ano' || period === 'historico'
    ? date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')
    : date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
};

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 760;
  const isNarrow = width < 380;
  const productCardWidth = isWide ? '48.6%' : '100%';

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
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Otros');
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('mes');
  const [remoteReport, setRemoteReport] = useState<RemoteReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchingServer, setSearchingServer] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>('');

  const pendingCount = sales.filter((sale) => sale.status !== 'synced').length;
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const categories = useMemo(() => ['Todo', ...Array.from(new Set(products.map((item) => item.category || 'Otros')))], [products]);
  const searchText = search.trim().toLowerCase();

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const haystack = `${item.name} ${item.description || ''} ${item.category || ''} ${item.sku || ''} ${item.barcode || ''} ${item.price}`.toLowerCase();
      const matchesText = !searchText || haystack.includes(searchText);
      const matchesCategory = category === 'Todo' || (item.category || 'Otros') === category;
      return matchesText && matchesCategory;
    });
  }, [category, products, searchText]);

  const filteredSales = useMemo(() => {
    if (!searchText) return sales;
    return sales.filter((sale) => {
      const itemText = sale.items.map((item) => item.name).join(' ');
      return `${sale.seller} ${sale.status} ${sale.total} ${itemText}`.toLowerCase().includes(searchText);
    });
  }, [sales, searchText]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchText) return [];
    const productResults: SearchResult[] = products
      .filter((item) => `${item.name} ${item.description || ''} ${item.category || ''} ${item.sku || ''} ${item.barcode || ''} ${item.price}`.toLowerCase().includes(searchText))
      .slice(0, 5)
      .map((product) => ({
        type: 'product',
        title: product.name,
        subtitle: `${product.category || 'Producto'} | ${product.description || 'Sin descripcion'} | ${money(Number(product.price))}`,
        product,
      }));
    const saleResults: SearchResult[] = sales
      .filter((sale) => `${sale.seller} ${sale.status} ${sale.total} ${sale.items.map((item) => item.name).join(' ')}`.toLowerCase().includes(searchText))
      .slice(-4)
      .reverse()
      .map((sale) => ({
        type: 'sale',
        title: sale.status === 'synced' ? 'Boleta sincronizada' : 'Boleta pendiente',
        subtitle: `${saleTime(sale.createdAt)} · ${sale.seller} · ${money(sale.total)}`,
        sale,
      }));
    const actionResults = actions.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(searchText)).slice(0, 3);
    return [...productResults, ...saleResults, ...actionResults].slice(0, 8);
  }, [products, sales, searchText]);

  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date().toDateString());
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const reportTotal = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const reportDays = useMemo(() => {
    const rows: { date: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toDateString();
      rows.push({
        date: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString('es-PE', { weekday: 'short' }),
        total: sales.filter((sale) => new Date(sale.createdAt).toDateString() === key).reduce((sum, sale) => sum + sale.total, 0),
      });
    }
    return rows;
  }, [sales]);
  const maxReport = Math.max(1, ...reportDays.map((day) => day.total));
  const bestDay = reportDays.reduce((best, day) => (day.total > best.total ? day : best), reportDays[0] || { label: '-', total: 0 });
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
    if (remoteReport?.payments?.length) return remoteReport.payments;
    const cash = filteredSales.filter((sale) => sale.paymentMethod !== 'digital').reduce((sum, sale) => sum + sale.total, 0);
    const digital = filteredSales.filter((sale) => sale.paymentMethod === 'digital').reduce((sum, sale) => sum + sale.total, 0);
    return [
      { label: 'Efectivo', total: cash },
      { label: 'Yape / Plin', total: digital },
    ];
  }, [filteredSales, remoteReport]);
  const maxProductTotal = Math.max(1, ...topProducts.map((item) => item.total));
  const maxPaymentTotal = Math.max(1, ...paymentBreakdown.map((item) => item.total));
  const reportSummary = remoteReport?.summary || { count: filteredSales.length, total: reportTotal, average: filteredSales.length ? reportTotal / filteredSales.length : 0 };
  const reportSeries = remoteReport?.series?.length ? remoteReport.series : reportDays.map((day) => ({ date: day.date, count: 0, total: day.total }));
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
          const historical: OfflineSale[] = payload.sales.map((sale: any) => ({
            id: `remote-${sale.uuid}`,
            remoteUuid: sale.uuid,
            seller: sale.customer_name || 'Histórico',
            items: sale.items || [],
            total: Number(sale.total || 0),
            paymentMethod: sale.payment_method === 'legacy_12' ? 'digital' : 'cash',
            createdAt: sale.sold_at || new Date().toISOString(),
            status: 'synced',
          }));
          const localIds = new Set(local.map((sale) => sale.remoteUuid || sale.id));
          merged = [...local, ...historical.filter((sale) => !localIds.has(sale.remoteUuid || sale.id))];
        }
      }
    } catch { /* el historial local sigue disponible sin conexión */ }
    setSales(merged);
  }, []);

  const cancelSale = useCallback((sale: OfflineSale) => {
    Alert.alert('Eliminar venta', 'La venta se quitará del historial local y, si ya fue enviada, se anulará en la base de datos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          if (sale.remoteUuid) {
            const base = await detectApiBase(apiCandidates);
            const response = await fetch(`${base}/api/ventas/${encodeURIComponent(sale.remoteUuid)}`, { method: 'DELETE' });
            const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo anular');
          }
          await removeSale(sale.id);
          await refreshSales();
          Alert.alert('Venta eliminada', 'La operación fue quitada correctamente.');
        } catch (error: any) {
          Alert.alert('No se pudo eliminar', error?.message || 'Revisa la conexión e inténtalo de nuevo.');
        }
      } },
    ]);
  }, [refreshSales]);

  const loadCatalog = useCallback(async (preferredBase?: string) => {
    setLoadingCatalog(true);
    const cached = await getCatalog<Product[]>();
    if (cached.length) setProducts(cached);
    try {
      const net = await NetInfo.fetch();
      const ipAddress = (net.details as any)?.ipAddress as string | undefined;
      setSearchingServer(true);
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
          timer = setTimeout(() => controller.abort(), 1400);
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
        base = await discoverApiBase([preferredBase || '', storedBase, ...apiCandidates], ipAddress);
        response = await fetch(`${base}/api/catalogo`);
      }
      await setApiBase(base);
      setApiBaseState(base);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo cargar el catálogo');
      const catalog = payload.products?.length ? payload.products : fallbackProducts;
      const normalized = catalog.map((product: Product) => ({ ...product, category: classifyProduct(product) }));
      setProducts(normalized);
      await setCatalog(normalized);
      setOnline(true);
    } catch {
      setOnline(false);
      setProducts((current) => (current.length ? current : fallbackProducts));
    } finally {
      setSearchingServer(false);
      setLoadingCatalog(false);
    }
  }, []);

  const syncNow = useCallback(async () => {
    try {
      const base = await detectApiBase(apiCandidates);
      setApiBaseState(base);
      const result = await syncPendingSales(base);
      setOnline(result.online);
      if (result.synced > 0) setLastSyncAt(new Date().toISOString());
      await refreshSales();
    } catch {
      setOnline(false);
      await refreshSales();
    }
  }, [refreshSales]);

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
      const value = raw.trim();
      let api = '';
      if (value.startsWith('papachito://')) {
        const query = value.split('?')[1] || '';
        const encoded = query.split('&').find((part) => part.startsWith('api='))?.slice(4) || '';
        api = decodeURIComponent(encoded);
      } else if (/^https?:\/\//i.test(value)) {
        api = value;
      }
      if (!/^https?:\/\/[^\s/]+:\d+$/.test(api || '')) throw new Error('QR no válido');
      setScannerOpen(false);
      setApiBaseState(api!.replace(/\/$/, ''));
      await setApiBase(api!.replace(/\/$/, ''));
      await loadCatalog(api!.replace(/\/$/, ''));
      await syncNow();
      Alert.alert('Conectado', 'Servidor guardado y sincronización iniciada.');
    } catch (error: any) {
      Alert.alert('QR no válido', error?.message || 'Escanea el QR mostrado por Papachito.');
    }
  };

  const loadReport = useCallback(async (period: ReportPeriod) => {
    setReportLoading(true);
    try {
      const base = await detectApiBase(apiCandidates);
      setApiBaseState(base);
      const response = await fetch(`${base}/api/reportes?periodo=${period}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo cargar reporte');
      setRemoteReport(payload as RemoteReport);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const storedName = (await getSeller()).trim();
      if (storedName) {
        setSellerName(storedName);
        setSettingsName(storedName);
        setHasProfile(true);
      }
      const storedApi = await getApiBase();
      if (storedApi) setApiBaseState(storedApi);
      const cached = await getCatalog<Product[]>();
      if (cached.length) setProducts(cached);
      await refreshSales();
      await loadCatalog();
      setBooting(false);
      // La interfaz y el catálogo en caché quedan disponibles de inmediato.
      // La sincronización de pendientes continúa en segundo plano y no bloquea el arranque.
      void syncNow();
    })();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        loadCatalog();
        syncNow();
      } else {
        setOnline(false);
      }
    });
    const timer = setInterval(syncNow, 15000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [loadCatalog, refreshSales, syncNow]);

  useEffect(() => {
    if (screen === 'report' && hasProfile) void loadReport(reportPeriod);
  }, [hasProfile, loadReport, reportPeriod, screen]);

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
    const value = apiBase.trim().replace(/\/$/, '');
    if (!/^https?:\/\/[^\s/]+:\d+$/.test(value)) {
      Alert.alert('Servidor inválido', 'Usa un formato como http://192.168.1.10:8090');
      return;
    }
    await setApiBase(value);
    setApiBaseState(value);
    await syncNow();
    await refreshSales(value);
  };

  const addProduct = useCallback((product: Product) => {
    setCart((current) => {
      const found = current.find((item) => String(item.id) === String(product.id));
      if (!found) return [...current, { ...product, quantity: 1 }];
      return current.map((item) => (String(item.id) === String(product.id) ? { ...item, quantity: item.quantity + 1 } : item));
    });
    setCartOpen(true);
  }, []);

  const removeOne = (product: CartItem) => {
    setCart((current) =>
      current
        .map((item) => (String(item.id) === String(product.id) ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeProduct = (product: CartItem) => {
    setCart((current) => current.filter((item) => String(item.id) !== String(product.id)));
  };

  const addQuickProduct = () => {
    const name = quickName.trim();
    const price = Number(quickPrice.replace(',', '.'));
    if (!name || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Producto incompleto', 'Escribe nombre y precio en soles.');
      return;
    }
    addProduct({ id: `quick-${Date.now()}`, name, price, category: 'Rápido' });
    setQuickName('');
    setQuickPrice('');
  };

  const createProduct = async () => {
    const name = newProductName.trim();
    const price = Number(newProductPrice.replace(',', '.'));
    const categoryName = newProductCategory.trim() || 'Otros';
    if (!name || !Number.isFinite(price) || price <= 0) {
      Alert.alert('Producto incompleto', 'Escribe nombre y precio válidos.');
      return;
    }
    try {
      const base = await detectApiBase(apiCandidates);
      const response = await fetch(`${base}/api/config/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, price, category: categoryName, description: 'Producto creado desde Donde Papachito' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || 'No se pudo guardar el producto');
      setNewProductName('');
      setNewProductPrice('');
      setNewProductCategory('Otros');
      await loadCatalog(base);
      Alert.alert('Producto guardado', 'Ya aparece en el catálogo para venderlo.');
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.message || 'Conecta la laptop y vuelve a intentarlo.');
    }
  };

  const confirmSale = async () => {
    if (!cart.length) {
      Alert.alert('Carrito vacío', 'Agrega al menos un producto.');
      return;
    }
    await queueSale({
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      seller: sellerName,
      items: cart.map((item) => ({ id: item.id, name: item.name, price: Number(item.price), quantity: item.quantity })),
      total: cartTotal,
      paymentMethod,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    setCart([]);
    setCartOpen(false);
    await refreshSales();
    await syncNow();
    Alert.alert(paymentMethod === 'digital' ? 'Pago digital guardado' : 'Venta guardada', online ? 'Guardada y enviada si la API está activa.' : 'Sin conexión: queda pendiente.');
  };

  const selectSearchResult = (result: SearchResult) => {
    if (result.type === 'product') {
      setScreen('sale');
      addProduct(result.product);
    }
    if (result.type === 'sale') setScreen('history');
    if (result.type === 'action') setScreen(result.screen);
    setSearch('');
  };

  if (booting) {
    return (
      <View style={styles.safe}>
        <View style={styles.centerCard}>
          <Image source={require('./papachito-logo.jpg')} style={styles.setupLogo} />
          <Text style={styles.brand}>DONDE PAPACHITO</Text>
          <Text style={styles.setupTitle}>Cargando sistema</Text>
          <Text style={styles.setupCopy}>Preparando ventas, historial y cola offline.</Text>
        </View>
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <View style={styles.safe}>
        <View style={styles.centerCard}>
          <Image source={require('./papachito-logo.jpg')} style={styles.setupLogo} />
          <Text style={styles.brand}>DONDE PAPACHITO</Text>
          <Text style={styles.setupTitle}>¿Cómo te llamas?</Text>
          <Text style={styles.setupCopy}>Guardaremos tu nombre para registrar quien realiza cada venta.</Text>
          <TextInput value={setupName} onChangeText={setSetupName} placeholder="Nombre" autoFocus style={styles.input} />
          <Pressable onPress={continueSetup} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Continuar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={[styles.header, isNarrow && styles.headerCompact]}>
          <Image source={require('./papachito-logo.jpg')} style={styles.headerLogo} />
          <View style={styles.userBlock}>
            <Text style={styles.brand}>DONDE PAPACHITO</Text>
            <Text style={styles.title}>{screenTitle(screen)}</Text>
            <Text style={styles.userText}>Atiende: {sellerName}</Text>
          </View>
          <View style={[styles.status, online ? styles.statusOnline : styles.statusOffline]}>
            <Text style={styles.statusText}>{online ? 'Conectado' : 'Offline'}</Text>
          </View>
        </View>

        <View style={[styles.globalSearch, isNarrow && styles.globalSearchCompact]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar productos, boletas o acciones"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} style={styles.clearButton}>
              <Text style={styles.clearText}>Limpiar</Text>
            </Pressable>
          ) : null}
        </View>

        {searchText ? (
          <View style={styles.searchPanel}>
            {searchResults.length === 0 ? (
              <Empty title="Sin resultados" copy="Prueba con otro producto, monto, vendedor o acción." compact />
            ) : (
              searchResults.map((result, index) => (
                <Pressable key={`${result.type}-${index}`} onPress={() => selectSearchResult(result)} style={styles.resultRow}>
                  <Text style={styles.resultType}>{result.type === 'product' ? 'Producto' : result.type === 'sale' ? 'Boleta' : 'Acción'}</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.resultTitle}>{result.title}</Text>
                    <Text style={styles.muted}>{result.subtitle}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={[styles.content, isNarrow && styles.contentCompact, { paddingBottom: 92 + insets.bottom }]}>
          {screen === 'sale' && (
          <View style={[styles.grid, isWide && styles.gridWide]}>
              <View style={styles.mainColumn}>
                <SectionTitle eyebrow="CATALOGO" title="Productos" right={loadingCatalog ? 'Cargando' : `${filteredProducts.length} productos`} />
                {searchingServer ? <Text style={styles.connectionHint}>Buscando servidor en la red…</Text> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {categories.map((item) => (
                    <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
                      <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                {filteredProducts.length === 0 ? (
                  <Empty title="No hay productos" copy="Limpia la busqueda o cambia de categoria." />
                ) : (
                  <View style={styles.productGrid}>
                    {filteredProducts.map((item) => <ProductCard key={String(item.id)} item={item} width={productCardWidth} onPress={addProduct} />)}
                  </View>
                )}
              </View>
              <View style={styles.sideColumn}>
                <SectionTitle eyebrow="RAPIDO" title="Producto manual" />
                <View style={styles.panel}>
                  <TextInput value={quickName} onChangeText={setQuickName} placeholder="Nombre" style={styles.input} />
                  <TextInput value={quickPrice} onChangeText={setQuickPrice} placeholder="Precio en soles" keyboardType="decimal-pad" style={styles.input} />
                  <Pressable onPress={addQuickProduct} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Agregar al carrito</Text>
                  </Pressable>
                </View>
                <CartSummary cart={cart} total={cartTotal} onOpen={() => setCartOpen(true)} onConfirm={() => setCartOpen(true)} />
              </View>
            </View>
          )}

          {screen === 'history' && (
            <>
              <View style={styles.summaryCard}>
                <Kpi label="Ventas de hoy" value={String(todaySales.length)} inverse />
                <Kpi label="Total real" value={money(todayTotal)} inverse />
              </View>
              <SectionTitle eyebrow="ACTIVIDAD" title="Historial" right="Actualizar" onRight={refreshSales} />
              {filteredSales.length === 0 ? (
                <Empty title={searchText ? 'Sin boletas' : 'No hay ventas'} copy={searchText ? 'No hay historial que coincida con la busqueda.' : 'Las ventas guardadas apareceran aqui.'} />
              ) : (
                filteredSales.slice().reverse().map((sale) => <SaleRow key={sale.id} sale={sale} onDelete={() => cancelSale(sale)} />)
              )}
            </>
          )}

          {screen === 'report' && (
            <View style={[styles.grid, isWide && styles.gridWide]}>
              <View style={styles.mainColumn}>
                <View style={styles.periodTabs}>
                  {(['dia', 'mes', 'ano', 'historico'] as ReportPeriod[]).map((period) => (
                    <Pressable key={period} onPress={() => setReportPeriod(period)} style={[styles.periodTab, reportPeriod === period && styles.periodTabActive]}>
                      <Text style={[styles.periodTabText, reportPeriod === period && styles.periodTabTextActive]}>{period === 'dia' ? 'Diario' : period === 'mes' ? 'Mensual' : period === 'ano' ? 'Anual' : 'Histórico'}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.summaryCard}>
                  <Kpi label={reportPeriodLabel(reportPeriod)} value={money(reportSummary.total)} inverse />
                  <Kpi label="Operaciones" value={String(reportSummary.count)} inverse />
                  <Kpi label="Promedio" value={money(reportSummary.average)} inverse />
                </View>
                <View style={styles.reportHero}>
                  <View style={styles.reportHeroText}>
                    <Text style={styles.eyebrow}>REPORTE</Text>
                    <Text style={styles.reportHeroTitle}>Ventas claras, sin montos abreviados</Text>
                    <Text style={styles.reportHeroCopy}>El periodo actual vuelve a empezar cada mes; tus ventas anteriores quedan guardadas en Histórico.</Text>
                  </View>
                  <View style={styles.reportHeroBadge}>
                    <Text style={styles.reportHeroBadgeLabel}>Acumulado histórico</Text>
                    <Text style={styles.reportHeroBadgeValue}>{money(remoteReport?.historical?.total ?? reportTotal)}</Text>
                    <Text style={styles.reportHeroBadgeTotal}>{remoteReport?.historical?.count ?? filteredSales.length} operaciones</Text>
                  </View>
                </View>
                <View style={styles.panelLarge}>
                  <SectionTitle eyebrow="TENDENCIA" title={`Ventas ${reportPeriodLabel(reportPeriod).toLowerCase()}`} right={reportLoading ? 'Cargando…' : 'Actualizar'} onRight={() => loadReport(reportPeriod)} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.chartLarge, reportSeries.length > 14 && styles.chartLargeWide]}>
                      {reportSeries.map((item) => (
                        <View key={item.date} style={styles.chartCol}>
                          <Text style={styles.chartValue}>{money(Number(item.total))}</Text>
                          <View style={[styles.chartBar, { height: 22 + (Number(item.total) / reportMax) * 126 }]} />
                          <Text style={styles.chartLabel}>{reportDateLabel(item.date, reportPeriod)}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View style={styles.panelLarge}>
                  <SectionTitle eyebrow="HISTÓRICO" title="Ventas acumuladas" />
                  <Text style={styles.muted}>Desde {remoteReport?.historical?.firstDate ? reportDateLabel(remoteReport.historical.firstDate, 'mes') : 'el inicio'} hasta {remoteReport?.historical?.lastDate ? reportDateLabel(remoteReport.historical.lastDate, 'mes') : 'hoy'}.</Text>
                  <View style={styles.historicalRow}>
                    <Stat label="Total histórico" value={money(remoteReport?.historical?.total ?? reportTotal)} />
                    <Stat label="Boletas" value={String(remoteReport?.historical?.count ?? filteredSales.length)} />
                  </View>
                </View>
                <View style={styles.panelLarge}>
                  <SectionTitle eyebrow="PRODUCTOS" title="Más vendidos" />
                  {topProducts.length === 0 ? (
                    <Empty title="Sin productos vendidos" copy="Cuando registres ventas, aqui apareceran los productos con mayor movimiento." compact />
                  ) : (
                    topProducts.map((item, index) => (
                      <RankRow key={item.name} index={index + 1} label={item.name} detail={`${item.quantity} unidades`} value={money(item.total)} percent={item.total / maxProductTotal} />
                    ))
                  )}
                </View>
              </View>
              <View style={styles.sideColumn}>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="LECTURA" title="Resumen" />
                  <Stat label="Pendientes" value={String(pendingCount)} />
                  <Stat label="Estado API" value={online ? 'Conectada' : 'Offline'} />
                  <Stat label="Filtro activo" value={searchText || 'Sin filtro'} />
                </View>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="COBROS" title="Medios de pago" />
                  {paymentBreakdown.map((item) => (
                    <RankRow key={item.label} label={item.label} value={money(item.total)} percent={item.total / maxPaymentTotal} compact />
                  ))}
                </View>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="DETALLE" title="Últimas ventas" />
                  {filteredSales.length === 0 ? (
                    <Empty title="Sin ventas" copy="Aún no hay movimientos para mostrar." compact />
                  ) : (
                    filteredSales.slice(-4).reverse().map((sale) => (
                      <View key={sale.id} style={styles.miniSale}>
                        <View style={styles.rowText}>
                          <Text style={styles.miniSaleTitle}>{shortDate(sale.createdAt)} | {saleTime(sale.createdAt)}</Text>
                          <Text style={styles.muted}>{sale.items.length} productos | {sale.seller}</Text>
                        </View>
                        <Text style={styles.miniSaleTotal}>{money(sale.total)}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          )}

          {screen === 'settings' && (
            <View style={[styles.grid, isWide && styles.gridWide]}>
              <View style={styles.mainColumn}>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="PERFIL" title="Nombre del vendedor" />
                  <TextInput value={settingsName} onChangeText={setSettingsName} placeholder="Nombre" style={styles.input} />
                  <Pressable onPress={saveSettingsName} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Guardar nombre</Text>
                  </Pressable>
                </View>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="CATÁLOGO" title="Agregar producto" />
                  <TextInput value={newProductName} onChangeText={setNewProductName} placeholder="Nombre del producto" style={styles.input} />
                  <TextInput value={newProductPrice} onChangeText={setNewProductPrice} placeholder="Precio en soles" keyboardType="decimal-pad" style={styles.input} />
                  <TextInput value={newProductCategory} onChangeText={setNewProductCategory} placeholder="Categoría" style={styles.input} />
                  <Pressable onPress={createProduct} style={styles.primaryButton}>
                    <Text style={styles.primaryText}>Guardar producto</Text>
                  </Pressable>
                </View>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="SINCRONIZACION" title="Estado local" />
                  <Stat label="Ventas pendientes" value={String(pendingCount)} />
                  <Stat label="Servidor" value={online ? 'Conectado' : 'Sin conexión'} />
                  <Stat label="API detectada" value={apiBase} />
                  <TextInput value={apiBase} onChangeText={setApiBaseState} autoCapitalize="none" autoCorrect={false} placeholder="http://IP-DE-LA-LAPTOP:8090" style={styles.input} />
                  <Pressable onPress={saveServer} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Guardar servidor y probar</Text>
                  </Pressable>
                  <Pressable onPress={syncNow} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Reconectar y sincronizar</Text>
                  </Pressable>
                  <Pressable onPress={openScanner} style={styles.secondaryButton}>
                    <Text style={styles.secondaryText}>Escanear QR de la laptop</Text>
                  </Pressable>
                  {lastSyncAt ? <Text style={styles.muted}>Última sincronización: {saleTime(lastSyncAt)}</Text> : null}
                </View>
              </View>
              <View style={styles.sideColumn}>
                <View style={styles.panel}>
                  <SectionTitle eyebrow="APP" title="Preparada para APK" />
                  <Text style={styles.note}>Usa almacenamiento local para offline, NetInfo para conectividad y permisos Android configurados para red.</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {cart.length > 0 && !cartOpen && screen === 'sale' ? (
          <Pressable onPress={() => setCartOpen(true)} style={[styles.cartFab, { bottom: 78 + insets.bottom }]}>
            <Text style={styles.cartFabText}>{cart.reduce((sum, item) => sum + item.quantity, 0)} productos</Text>
            <Text style={styles.cartFabTotal}>{money(cartTotal)}</Text>
          </Pressable>
        ) : null}

        {cartOpen ? <CartSheet cart={cart} total={cartTotal} paymentMethod={paymentMethod} onPaymentMethod={setPaymentMethod} safeBottom={insets.bottom} onClose={() => setCartOpen(false)} onAdd={addProduct} onRemoveOne={removeOne} onRemove={removeProduct} onConfirm={confirmSale} /> : null}
        {scannerOpen ? (
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerPanel}>
              <Text style={styles.scannerTitle}>Conectar laptop</Text>
              <Text style={styles.muted}>Apunta al QR que muestra la ventana de Papachito.</Text>
              <CameraView
                style={styles.scannerCamera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => connectFromQr(data)}
              />
              <Pressable onPress={() => setScannerOpen(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Cerrar escáner</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <BottomNav screen={screen} setScreen={setScreen} safeBottom={insets.bottom} />
      </View>
    </View>
  );
}

function screenTitle(screen: Screen) {
  if (screen === 'history') return 'Historial';
  if (screen === 'report') return 'Reporte';
  if (screen === 'settings') return 'Ajustes';
  return 'Nueva venta';
}

function SectionTitle({ eyebrow, title, right, onRight }: { eyebrow: string; title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.rowText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right ? (
        <Pressable onPress={onRight} disabled={!onRight}>
          <Text style={styles.sectionRight}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CartSummary({ cart, total, onOpen, onConfirm }: { cart: CartItem[]; total: number; onOpen: () => void; onConfirm: () => void }) {
  return (
    <View style={styles.panel}>
      <SectionTitle eyebrow="VENTA ACTUAL" title="Carrito" />
      {cart.length === 0 ? (
        <Empty title="Carrito vacío" copy="Toca un producto para agregarlo." compact />
      ) : (
        <>
          <Stat label="Productos" value={String(cart.reduce((sum, item) => sum + item.quantity, 0))} />
          <Stat label="Total" value={money(total)} />
          <View style={styles.inlineActions}>
            <Pressable onPress={onOpen} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Ver pedido</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Confirmar</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function CartSheet({ cart, total, paymentMethod, onPaymentMethod, safeBottom, onClose, onAdd, onRemoveOne, onRemove, onConfirm }: { cart: CartItem[]; total: number; paymentMethod: 'cash' | 'digital'; onPaymentMethod: (method: 'cash' | 'digital') => void; safeBottom: number; onClose: () => void; onAdd: (product: Product) => void; onRemoveOne: (product: CartItem) => void; onRemove: (product: CartItem) => void; onConfirm: () => void }) {
  return (
    <View style={[styles.sheet, { bottom: 72 + safeBottom }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <View style={styles.rowText}>
          <Text style={styles.eyebrow}>VENTA ACTUAL</Text>
          <Text style={styles.sheetTitle}>Tu pedido</Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>x</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.sheetItems}>
        {cart.map((item) => (
          <View key={String(item.id)} style={styles.cartRow}>
            <View style={styles.rowText}>
              <Text style={styles.cartName}>{item.name}</Text>
              <Text style={styles.muted}>{money(Number(item.price))} x {item.quantity} · {money(Number(item.price) * item.quantity)}</Text>
              <Pressable onPress={() => onRemove(item)}>
                <Text style={styles.removeText}>Quitar producto</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => onRemoveOne(item)} style={styles.stepper}><Text style={styles.stepperText}>-</Text></Pressable>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Pressable onPress={() => onAdd(item)} style={styles.stepper}><Text style={styles.stepperText}>+</Text></Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.paymentBox}>
        <Text style={styles.paymentLabel}>Medio de pago</Text>
        <View style={styles.segmented}>
          <Pressable onPress={() => onPaymentMethod('cash')} style={[styles.segment, paymentMethod === 'cash' && styles.segmentActive]}>
            <Text style={[styles.segmentText, paymentMethod === 'cash' && styles.segmentTextActive]}>Efectivo</Text>
          </Pressable>
          <Pressable onPress={() => onPaymentMethod('digital')} style={[styles.segment, paymentMethod === 'digital' && styles.segmentActive]}>
            <Text style={[styles.segmentText, paymentMethod === 'digital' && styles.segmentTextActive]}>Yape / Plin</Text>
          </Pressable>
        </View>
        {paymentMethod === 'digital' ? (
          <View style={styles.digitalPayment}>
            <Text style={styles.digitalTitle}>Escanea para pagar</Text>
            <View style={styles.paymentQrFrame}>
              <Image source={require('./yape-qr.jpg')} style={styles.paymentQrImage} resizeMode="contain" />
            </View>
            <Text style={styles.muted}>Después de confirmar el pago, pulsa “Guardar venta pagada”.</Text>
          </View>
        ) : (
          <Text style={styles.muted}>Recibe {money(total)} y confirma para guardar la venta.</Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{money(total)}</Text>
        </View>
      </View>
      <Pressable onPress={onConfirm} style={styles.primaryButton}>
        <Text style={styles.primaryText}>{paymentMethod === 'digital' ? 'Guardar venta pagada' : 'Confirmar venta'}</Text>
      </Pressable>
    </View>
  );
}

// Tarjeta memoizada: al añadir un producto solo cambia el carrito, no se vuelve a
// renderizar cada una de las tarjetas del catálogo (importante con catálogos grandes).
const ProductCard = memo(function ProductCard({ item, width, onPress }: { item: Product; width: DimensionValue; onPress: (product: Product) => void }) {
  return (
    <Pressable onPress={() => onPress(item)} style={[styles.productCard, { width }]}>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productDescription} numberOfLines={2}>{item.description || 'Producto de venta'}</Text>
      <Text style={styles.muted}>{item.category || 'General'}</Text>
      <Text style={styles.stockText}>Stock: {item.stock ?? 0}</Text>
      <Text style={styles.productPrice}>{money(Number(item.price))}</Text>
    </Pressable>
  );
});

function BottomNav({ screen, setScreen, safeBottom }: { screen: Screen; setScreen: (screen: Screen) => void; safeBottom: number }) {
  const items: { key: Screen; icon: string; label: string }[] = [
    { key: 'sale', icon: '+', label: 'Vender' },
    { key: 'history', icon: 'H', label: 'Historial' },
    { key: 'report', icon: 'R', label: 'Reporte' },
    { key: 'settings', icon: 'A', label: 'Ajustes' },
  ];
  return (
    <View style={[styles.bottomNav, { bottom: safeBottom, height: 66, paddingBottom: 4 }]}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => setScreen(item.key)} style={styles.navItem}>
          <Text style={[styles.navIcon, screen === item.key && styles.navActive]}>{item.icon}</Text>
          <Text style={[styles.navLabel, screen === item.key && styles.navActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SaleRow({ sale, onDelete }: { sale: OfflineSale; onDelete: () => void }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.badge}><Text style={styles.badgeText}>B</Text></View>
      <View style={styles.rowText}>
        <Text style={styles.historyTitle}>{sale.status === 'synced' ? 'Boleta sincronizada' : 'Boleta pendiente'}</Text>
        <Text style={styles.muted}>{saleTime(sale.createdAt)} · {sale.seller} · {sale.items.length} productos</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyTotal}>{money(sale.total)}</Text>
        <Text style={[styles.historyStatus, sale.status === 'synced' ? styles.good : styles.warn]}>{sale.status === 'synced' ? 'SINCRONIZADA' : 'PENDIENTE'}</Text>
        <Pressable onPress={onDelete} style={styles.deleteSaleButton}>
          <Text style={styles.deleteSaleText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Kpi({ label, value, inverse }: { label: string; value: string; inverse?: boolean }) {
  return (
    <View style={inverse ? styles.kpiInverse : styles.kpi}>
      <Text style={inverse ? styles.kpiLabelInverse : styles.kpiLabel}>{label}</Text>
      <Text style={inverse ? styles.kpiValueInverse : styles.kpiValue}>{value}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RankRow({ index, label, detail, value, percent, compact }: { index?: number; label: string; detail?: string; value: string; percent: number; compact?: boolean }) {
  return (
    <View style={styles.rankRow}>
      {index ? <Text style={styles.rankIndex}>{index}</Text> : null}
      <View style={styles.rankBody}>
        <View style={styles.rankTop}>
          <View style={styles.rowText}>
            <Text style={styles.rankLabel} numberOfLines={compact ? 1 : 2}>{label}</Text>
            {detail ? <Text style={styles.muted}>{detail}</Text> : null}
          </View>
          <Text style={styles.rankValue}>{value}</Text>
        </View>
        <View style={styles.rankTrack}>
          <View style={[styles.rankFill, { width: `${Math.max(4, Math.min(100, percent * 100))}%` }]} />
        </View>
      </View>
    </View>
  );
}

function Empty({ title, copy, compact }: { title: string; copy: string; compact?: boolean }) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <Text style={styles.emptyIcon}>0</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f1ea', alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 1120, backgroundColor: '#f6f1ea' },
  shellWide: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e7ded3' },
  centerCard: { width: '92%', maxWidth: 420, alignSelf: 'center', marginTop: 90, backgroundColor: '#fffdfa', borderWidth: 1, borderColor: '#e6ddd2', borderRadius: 8, padding: 24, gap: 14 },
  setupLogo: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 42, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  headerCompact: { paddingHorizontal: 16, paddingTop: 28, gap: 8 },
  headerLogo: { width: 52, height: 52, borderRadius: 26, marginTop: 2 },
  userBlock: { flex: 1 },
  brand: { color: '#1b5b4e', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#141a18', fontSize: 32, fontWeight: '900', marginTop: 2 },
  userText: { color: '#5f6b65', fontWeight: '800', marginTop: 5 },
  setupTitle: { color: '#141a18', fontSize: 31, fontWeight: '900' },
  setupCopy: { color: '#6b746f', lineHeight: 21 },
  status: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  statusOnline: { backgroundColor: '#e4f1ea' },
  statusOffline: { backgroundColor: '#f5dfd8' },
  statusText: { color: '#174f42', fontWeight: '900' },
  globalSearch: { marginHorizontal: 24, marginBottom: 10, minHeight: 56, backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e1d8cc', flexDirection: 'row', alignItems: 'center', paddingLeft: 15 },
  globalSearchCompact: { marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#151a18', minHeight: 54 },
  clearButton: { paddingHorizontal: 14, alignSelf: 'stretch', justifyContent: 'center' },
  clearText: { color: '#174f42', fontWeight: '900' },
  searchPanel: { marginHorizontal: 24, marginBottom: 10, backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', overflow: 'hidden' },
  resultRow: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#eee7de', flexDirection: 'row', gap: 12, alignItems: 'center' },
  resultType: { width: 70, color: '#174f42', fontWeight: '900', fontSize: 12 },
  resultTitle: { color: '#141a18', fontWeight: '900', fontSize: 15 },
  content: { paddingHorizontal: 24, paddingBottom: 104, gap: 14 },
  contentCompact: { paddingHorizontal: 16, paddingBottom: 112 },
  connectionHint: { color: '#8a6a36', fontWeight: '800', marginTop: -5 },
  grid: { gap: 14 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  mainColumn: { flex: 1, gap: 14 },
  sideColumn: { width: '100%', gap: 14, maxWidth: 340 },
  sectionHeading: { marginTop: 2, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  eyebrow: { color: '#1b5b4e', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  sectionTitle: { color: '#141a18', fontSize: 24, fontWeight: '900' },
  sectionRight: { color: '#174f42', fontWeight: '900', fontSize: 15 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 8, backgroundColor: '#ebe5dc', paddingHorizontal: 15, paddingVertical: 10 },
  chipActive: { backgroundColor: '#174f42' },
  chipText: { color: '#5e6762', fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { backgroundColor: '#fffdfa', borderColor: '#e5ddd3', borderWidth: 1, borderRadius: 8, padding: 16, minHeight: 132 },
  productName: { color: '#141a18', fontSize: 16, fontWeight: '900' },
  productDescription: { color: '#4d5853', marginTop: 8, lineHeight: 19 },
  stockText: { color: '#7b6659', fontWeight: '800', marginTop: 6, fontSize: 12 },
  productPrice: { color: '#174f42', fontSize: 22, fontWeight: '900', marginTop: 'auto' },
  panel: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 16, gap: 12 },
  panelLarge: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 18, gap: 14 },
  periodTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodTab: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ebe5dc' },
  periodTabActive: { backgroundColor: '#174f42' },
  periodTabText: { color: '#5e6762', fontWeight: '900' },
  periodTabTextActive: { color: '#fff' },
  historicalRow: { flexDirection: 'row', gap: 28, flexWrap: 'wrap' },
  input: { backgroundColor: '#fffdfa', borderColor: '#e1d8cc', borderWidth: 1, borderRadius: 8, minHeight: 54, paddingHorizontal: 15, fontSize: 16, color: '#151a18' },
  primaryButton: { backgroundColor: '#174f42', borderRadius: 8, padding: 15, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryButton: { borderRadius: 8, borderColor: '#174f42', borderWidth: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#174f42', fontWeight: '900' },
  inlineActions: { flexDirection: 'row', gap: 10 },
  cartFab: { position: 'absolute', left: 24, right: 24, bottom: 78, backgroundColor: '#174f42', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cartFabText: { color: '#fff', fontWeight: '900' },
  cartFabTotal: { color: '#fff', fontWeight: '900', fontSize: 18 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 78, maxHeight: '86%', backgroundColor: '#fffdfa', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: '#e5ddd3', zIndex: 12 },
  sheetHandle: { width: 72, height: 6, borderRadius: 6, backgroundColor: '#d8d4ce', alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: '#141a18', fontSize: 31, fontWeight: '900' },
  closeButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#edf0ec', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#174f42', fontSize: 22, fontWeight: '900' },
  sheetItems: { maxHeight: 180 },
  cartRow: { borderTopColor: '#e7dfd4', borderTopWidth: 1, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1 },
  cartName: { color: '#141a18', fontSize: 15, fontWeight: '900' },
  removeText: { color: '#a74035', fontWeight: '900', marginTop: 8 },
  stepper: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#e3dacf', alignItems: 'center', justifyContent: 'center' },
  stepperText: { color: '#174f42', fontSize: 22, fontWeight: '900' },
  qty: { minWidth: 22, textAlign: 'center', color: '#141a18', fontSize: 19, fontWeight: '900' },
  paymentBox: { backgroundColor: '#f1f2ed', borderRadius: 8, padding: 16, gap: 12 },
  paymentLabel: { color: '#141a18', fontWeight: '900' },
  segmented: { minHeight: 54, borderRadius: 8, backgroundColor: '#e2e4dd', flexDirection: 'row', padding: 5, gap: 5 },
  segmentActive: { flex: 1, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: '#6a716d', fontWeight: '900' },
  segmentTextActive: { color: '#141a18' },
  digitalPayment: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  digitalTitle: { color: '#174f42', fontWeight: '900', fontSize: 16 },
  paymentQrFrame: { width: 190, height: 150, borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center' },
  paymentQrImage: { width: 190, height: 338, transform: [{ translateY: -130 }] },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { color: '#141a18', fontSize: 20, fontWeight: '900' },
  totalValue: { color: '#141a18', fontSize: 32, fontWeight: '900' },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, paddingBottom: 8, backgroundColor: '#fffdfa', borderTopColor: '#e2d8cc', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around' },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  navIcon: { color: '#8a8f8b', fontSize: 18, fontWeight: '900' },
  navLabel: { color: '#8a8f8b', fontSize: 12, fontWeight: '900', marginTop: 2 },
  scannerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.72)', justifyContent: 'center', padding: 18, zIndex: 20 },
  scannerPanel: { backgroundColor: '#fffdfa', borderRadius: 18, padding: 18, gap: 12 },
  scannerTitle: { color: '#141a18', fontSize: 24, fontWeight: '900' },
  scannerCamera: { width: '100%', height: 300, borderRadius: 14, overflow: 'hidden' },
  navActive: { color: '#174f42' },
  summaryCard: { backgroundColor: '#174f42', borderRadius: 8, padding: 18, flexDirection: 'row', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' },
  historyRow: { backgroundColor: '#fffdfa', borderRadius: 8, padding: 16, borderColor: '#e5ddd3', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  historyRight: { alignItems: 'flex-end', gap: 3 },
  deleteSaleButton: { marginTop: 7, borderRadius: 6, borderWidth: 1, borderColor: '#bd6a60', paddingHorizontal: 9, paddingVertical: 5 },
  deleteSaleText: { color: '#a74035', fontWeight: '900', fontSize: 12 },
  badge: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#e6f0eb', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#174f42', fontWeight: '900', fontSize: 20 },
  historyTitle: { color: '#141a18', fontWeight: '900', fontSize: 17 },
  historyTotal: { color: '#141a18', fontWeight: '900', fontSize: 19, textAlign: 'right' },
  historyStatus: { fontSize: 11, fontWeight: '900', textAlign: 'right', marginTop: 6 },
  good: { color: '#141a18' },
  warn: { color: '#a74035' },
  kpi: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e5ddd3', padding: 16 },
  kpiInverse: { minWidth: 120, flex: 1 },
  kpiLabel: { color: '#6a716d', fontWeight: '800' },
  kpiLabelInverse: { color: '#bfd0ca', fontWeight: '800' },
  kpiValue: { color: '#141a18', fontWeight: '900', fontSize: 28, marginTop: 4 },
  kpiValueInverse: { color: '#fff', fontWeight: '900', fontSize: 28, marginTop: 4 },
  reportHero: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 18, gap: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  reportHeroText: { flex: 1, minWidth: 220 },
  reportHeroTitle: { color: '#141a18', fontSize: 24, fontWeight: '900', marginTop: 4 },
  reportHeroCopy: { color: '#6a716d', marginTop: 8, lineHeight: 20 },
  reportHeroBadge: { backgroundColor: '#174f42', borderRadius: 8, padding: 16, minWidth: 150 },
  reportHeroBadgeLabel: { color: '#bfd0ca', fontWeight: '800' },
  reportHeroBadgeValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 6 },
  reportHeroBadgeTotal: { color: '#fff', fontWeight: '900', marginTop: 4 },
  chart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  chartLarge: { height: 210, minWidth: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  chartLargeWide: { minWidth: 760 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  chartBar: { width: '68%', backgroundColor: '#174f42', borderRadius: 8 },
  chartValue: { color: '#141a18', fontSize: 11, fontWeight: '900', marginBottom: 6 },
  chartLabel: { color: '#6a716d', fontSize: 11, marginTop: 7, fontWeight: '800' },
  rankRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee7dc' },
  rankIndex: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e6f0eb', color: '#174f42', textAlign: 'center', paddingTop: 5, fontWeight: '900' },
  rankBody: { flex: 1, gap: 8 },
  rankTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  rankLabel: { color: '#141a18', fontWeight: '900' },
  rankValue: { color: '#174f42', fontWeight: '900', textAlign: 'right' },
  rankTrack: { height: 8, borderRadius: 8, backgroundColor: '#ede6dc', overflow: 'hidden' },
  rankFill: { height: 8, borderRadius: 8, backgroundColor: '#174f42' },
  miniSale: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eee7dc' },
  miniSaleTitle: { color: '#141a18', fontWeight: '900' },
  miniSaleTotal: { color: '#174f42', fontWeight: '900' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderTopColor: '#eee7dc', borderTopWidth: 1 },
  statLabel: { color: '#6a716d', fontWeight: '800' },
  statValue: { color: '#141a18', fontWeight: '900', textAlign: 'right' },
  muted: { color: '#6a716d', marginTop: 4 },
  note: { color: '#6a716d', lineHeight: 20 },
  empty: { backgroundColor: '#fffdfa', borderRadius: 8, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5ddd3' },
  emptyCompact: { borderWidth: 0, padding: 14 },
  emptyIcon: { color: '#174f42', fontSize: 26, fontWeight: '900' },
  emptyTitle: { color: '#141a18', fontWeight: '900', fontSize: 17, marginTop: 6 },
});

