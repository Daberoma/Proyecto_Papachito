import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, useWindowDimensions, type DimensionValue } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSales,getApiBase,getApiBases,getCatalog,getSeller,getSimpleView,getPaymentConfig,queueSale,removeSale,setSeller,setApiBase,setSimpleView as persistSimpleView,setPaymentConfig,setCatalog,discoverApiBase,detectApiBase,syncPendingSales,type OfflineSale,type PaymentConfig } from './offline';
import { API,actions,apiCandidates,classifyProduct,fallbackProducts,money,saleTime,type CartItem,type Product,type RemoteReport,type ReportPeriod,type Screen,type SearchResult } from './domain';

export function usePapachitoApp() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width >= 760;
  // En teléfonos reales de 360–430dp, dos columnas dejan nombres y precios
  // demasiado apretados. Una columna mejora lectura y precisión táctil;
  // tablets y pantallas anchas conservan la cuadrícula.
  const isNarrow = width < 430;
  const productCardWidth: DimensionValue = isWide ? '31.8%' : isNarrow ? '100%' : '48.5%';

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
  const [simpleView, setSimpleViewState] = useState(false);
  const [savedApiBases, setSavedApiBases] = useState<string[]>([]);
  const [addedProductPulse, setAddedProductPulse] = useState('');
  const [paymentConfig, setPaymentConfigState] = useState<PaymentConfig>({ yapeEnabled: true, plinEnabled: false });
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

  const visibleSales = useMemo(() => filteredSales.slice().reverse(), [filteredSales]);
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((sale) => new Date(sale.createdAt).toDateString() === today);
  }, [sales]);
  const todayTotal = useMemo(() => todaySales.reduce((sum, sale) => sum + sale.total, 0), [todaySales]);
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
  const sellerBreakdown = useMemo(() => {
    if (remoteReport?.sellers?.length) return remoteReport.sellers;
    const map = new Map<string, { label: string; count: number; total: number }>();
    filteredSales.filter((sale) => sale.status !== 'error').forEach((sale) => {
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
    if (catalogLoadingRef.current) return;
    catalogLoadingRef.current = true;
    const cached = await getCatalog<Product[]>();
    const hasCachedCatalog = cached.length > 0;
    // La pantalla de venta debe abrirse desde la caché. La red se verifica en
    // segundo plano para evitar una pausa al volver desde Ajustes.
    if (hasCachedCatalog) {
      setProducts(cached);
      setLoadingCatalog(false);
      setSearchingServer(false);
      if (!preferredBase && Date.now() - lastCatalogLoadAtRef.current < 5 * 60 * 1000) {
        catalogLoadingRef.current = false;
        return;
      }
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
        base = await discoverApiBase([preferredBase || '', storedBase, ...apiCandidates]);
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
      await setCatalog(normalized);
      lastCatalogLoadAtRef.current = Date.now();
      setOnline(true);
    } catch {
      if (!mountedRef.current) return;
      setOnline(false);
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
    if (syncLoadingRef.current) return;
    syncLoadingRef.current = true;
    try {
      const localSales = await getSales();
      const hasPending = localSales.some((sale) => sale.status !== 'synced');
      if (!hasPending) {
        lastSyncAtRef.current = Date.now();
        return;
      }
      const saved = await getApiBase();
      const base = saved || await detectApiBase(apiCandidates, 700);
      setApiBaseState(base);
      setSavedApiBases(await getApiBases());
      const result = await syncPendingSales(base);
      lastSyncAtRef.current = Date.now();
      setOnline(result.online);
      if (result.synced > 0) setLastSyncAt(new Date().toISOString());
      await refreshSales();
    } catch {
      setOnline(false);
      await refreshSales();
    } finally {
      syncLoadingRef.current = false;
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
      await setApiBase(api);
      setSavedApiBases(await getApiBases());
      await loadCatalog(api);
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
      const response = await fetch(`${base}/api/reportes?periodo=${period}`, { signal: AbortSignal.timeout(3500) });
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
    mountedRef.current = true;
    let cancelled = false;

    // Arranque local-first: ninguna petición de red puede bloquear la primera
    // pantalla. Todo lo necesario para vender offline se lee en paralelo.
    (async () => {
      const [storedName, storedApi, savedBases, localSimpleView, localPaymentConfig, cached, localSales] = await Promise.all([
        getSeller(),
        getApiBase(),
        getApiBases(),
        getSimpleView(),
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
      setSimpleViewState(localSimpleView);
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
    setSavedApiBases(await getApiBases());
    await syncNow();
    await refreshSales(value);
  };

  const addProduct = useCallback((product: Product) => {
    setAddedProductPulse(`${String(product.id)}-${Date.now()}`);
    setCart((current) => {
      const found = current.find((item) => String(item.id) === String(product.id));
      if (!found) return [...current, { ...product, quantity: 1 }];
      return current.map((item) => (String(item.id) === String(product.id) ? { ...item, quantity: item.quantity + 1 } : item));
    });
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
    const sale: OfflineSale = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      seller: sellerName,
      items: cart.map((item) => ({ id: item.id, name: item.name, price: Number(item.price), quantity: item.quantity })),
      total: cartTotal,
      paymentMethod,
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
    Alert.alert(paymentMethod === 'digital' ? 'Pago digital guardado' : 'Venta guardada', 'La venta quedó guardada y se sincroniza en segundo plano.');
    void syncNow();
  };

  const selectSearchResult = (result: SearchResult) => {
    if (result.type === 'product') {
      setScreen('sale');
      addProduct(result.product);
    }
    if (result.type === 'sale') { setScreen('history'); setCartOpen(false); }
    if (result.type === 'action') { setScreen(result.screen); if (result.screen !== 'sale') setCartOpen(false); }
    setSearch('');
  };

  const navigateTo = useCallback((next: Screen) => {
    setScreen(next);
    if (next !== 'sale') setCartOpen(false);
  }, []);

  const toggleSimpleView = useCallback(async (value: boolean) => {
    setSimpleViewState(value);
    await persistSimpleView(value);
  }, []);

  const togglePaymentMethod = useCallback(async (method: 'yapeEnabled' | 'plinEnabled', value: boolean) => {
    setPaymentConfigState((current) => {
      const next = { ...current, [method]: value };
      void setPaymentConfig(next);
      return next;
    });
  }, []);


  return { insets,isWide,isNarrow,productCardWidth,booting,hasProfile,setupName,sellerName,settingsName,screen,products,cart,sales,online,apiBase,loadingCatalog,search,category,quickName,quickPrice,newProductName,newProductPrice,newProductCategory,cartOpen,paymentMethod,reportPeriod,remoteReport,reportLoading,scannerOpen,searchingServer,lastSyncAt,simpleView,paymentConfig,savedApiBases,addedProductPulse,pendingCount,cartTotal,categories,searchText,filteredProducts,filteredSales,visibleSales,searchResults,todaySales,todayTotal,reportTotal,reportDays,maxReport,bestDay,topProducts,paymentBreakdown,sellerBreakdown,maxProductTotal,maxPaymentTotal,maxSellerTotal,reportSummary,reportSeries,reportMax,cameraPermission,requestCameraPermission,setSetupName,setSellerName,setSettingsName,setScreen,setProducts,setCart,setSales,setOnline,setApiBaseState,setLoadingCatalog,setSearch,setCategory,setQuickName,setQuickPrice,setNewProductName,setNewProductPrice,setNewProductCategory,setCartOpen,setPaymentMethod,setReportPeriod,setRemoteReport,setReportLoading,setScannerOpen,setSearchingServer,setLastSyncAt,toggleSimpleView,togglePaymentMethod,navigateTo,refreshSales,cancelSale,loadCatalog,syncNow,openScanner,connectFromQr,loadReport,continueSetup,saveSettingsName,saveServer,addProduct,removeOne,removeProduct,addQuickProduct,createProduct,confirmSale,selectSearchResult };
}
