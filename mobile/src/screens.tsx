import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Keyboard, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Maximize2, Minus, Package, Plus, ReceiptText, Search, WalletCards, X } from 'lucide-react-native';
import { localDateKey, money, productPresentation, productSearchText, reportDateLabel, reportPeriodLabel, saleTime, shortDate, type CartItem, type Product, type ReportPeriod, type Screen } from './domain';
import { BottomNav, CartSheet, DesktopNav, Empty, Kpi, ProductCard, RankRow, SaleRow, SectionTitle, Stat, styles, screenTitle } from './ui';
import type { usePapachitoApp } from './usePapachitoApp';
import type { OfflineSale, PaymentProvider } from './offline';

type AppState = ReturnType<typeof usePapachitoApp>;

export function BootScreen() {
  return (
    <View style={styles.safe}>
      <View style={styles.centerCard}>
        <Image source={require('../papachito-logo.jpg')} style={styles.setupLogo} />
        <Text style={styles.brand}>DONDE PAPACHITO</Text>
        <Text style={styles.setupTitle}>Cargando sistema</Text>
        <Text style={styles.setupCopy}>Preparando ventas, historial y cola offline.</Text>
      </View>
    </View>
  );
}

export function ProfileSetupScreen({ name, onNameChange, onContinue }: { name: string; onNameChange: (value: string) => void; onContinue: () => void }) {
  return (
    <View style={styles.safe}>
      <View style={styles.centerCard}>
        <Image source={require('../papachito-logo.jpg')} style={styles.setupLogo} />
        <Text style={styles.brand}>DONDE PAPACHITO</Text>
        <Text style={styles.setupTitle}>¿Cómo te llamas?</Text>
        <Text style={styles.setupCopy}>Guardaremos tu nombre para registrar quien realiza cada venta.</Text>
        <TextInput value={name} onChangeText={onNameChange} placeholder="Nombre" autoFocus style={styles.input} />
        <Pressable onPress={onContinue} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Continuar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function MainShell({ app }: { app: AppState }) {
  const {
    insets, isWide, isNarrow, productCardWidth, sellerName, settingsName, screen, products, cart, sales, online, apiBase, connectionQr,
    loadingCatalog, search, category, cartOpen, paymentMethod, reportPeriod, reportOrigin, remoteReport, reportDetailSales, calendarSaleCounts, reportLoading, reportStale,
    scannerOpen, searchingServer, lastSyncAt, paymentConfig, savedApiBases, addedProductPulse, availableUpdate, updateChecking, updateStatus,
    updateInstalling, updateDownloadProgress, installedVersion, installedVersionCode, pendingCount, cartTotal, categories, searchText, filteredProducts, saleSubmitting, syncing, syncError, serverSaving, cancellingSaleId, catalogUsingCache,
    filteredSales, visibleSales, searchResults, todaySales, todayTotal, reportTotal, topProducts, paymentBreakdown,
    sellerBreakdown, maxProductTotal, maxPaymentTotal, maxSellerTotal, reportSummary, reportSeries, reportMax, setSettingsName,
    setApiBaseState, setSearch, setCategory, setCartOpen, setPaymentMethod, setReportPeriod, setReportOrigin, setScannerOpen, togglePaymentMethod,
    pickPaymentQr, removePaymentQr, navigateTo, refreshSales, cancelSale, simulateSale, loadSalesForDate, syncNow, openScanner,
    connectFromQr, loadConnectionQr, loadReport, saveSettingsName, saveServer, checkForUpdate, installUpdate, addProduct, createProduct, updateProduct, deleteProductPermanently, removeOne, confirmSale, deleteSale, updateSale,
    selectSearchResult,
  } = app;
  const isDesktop = Platform.OS === 'web' && isWide;
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDaySales, setSelectedDaySales] = useState<OfflineSale[]>([]);
  const [daySalesLoading, setDaySalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<OfflineSale | null>(null);
  const [receiptSale, setReceiptSale] = useState<OfflineSale | null>(null);
  const [saleDeleteTarget, setSaleDeleteTarget] = useState<OfflineSale | null>(null);
  const [saleDeleteError, setSaleDeleteError] = useState('');
  const [editingSale, setEditingSale] = useState<OfflineSale | null>(null);
  const [selectedPaymentKey, setSelectedPaymentKey] = useState<string | null>(null);
  const [selectedSellerLabel, setSelectedSellerLabel] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [productRenderLimit, setProductRenderLimit] = useState(20);
  const [productCreatorOpen, setProductCreatorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDeletion, setProductPendingDeletion] = useState<Product | null>(null);
  const [productDeleteMessage, setProductDeleteMessage] = useState('');
  const [productAdminSearch, setProductAdminSearch] = useState('');
  const filteredAdminProducts = useMemo(() => {
    const query = productAdminSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => productSearchText(product).includes(query));
  }, [productAdminSearch, products]);
  useEffect(() => {
    setProductRenderLimit(20);
  }, [category, searchText, products.length]);
  useEffect(() => {
    if (productRenderLimit >= filteredProducts.length) return;
    const timer = setTimeout(() => {
      setProductRenderLimit((current) => Math.min(current + 20, filteredProducts.length));
    }, 90);
    return () => clearTimeout(timer);
  }, [filteredProducts.length, productRenderLimit]);
  const chartUnit = reportPeriod === 'ano' || reportPeriod === 'historico' ? 'mes' : 'día';
  const chartColor = reportPeriod === 'dia' ? '#1b6b58' : reportPeriod === 'mes' ? '#315b91' : reportPeriod === 'ano' ? '#b27624' : '#7b4f8b';
  const showChartValues = reportPeriod === 'dia' || reportPeriod === 'mes';
  const reportActiveSeries = reportSeries.filter((item) => Number(item.total) > 0);
  const paymentOptions = [
    { key: 'yape', label: 'Yape', enabledKey: 'yapeEnabled', qrKey: 'yapeQrUri', color: '#7b4f8b' },
    { key: 'plin', label: 'Plin', enabledKey: 'plinEnabled', qrKey: 'plinQrUri', color: '#315b91' },
    { key: 'bbva', label: 'BBVA', enabledKey: 'bbvaEnabled', qrKey: 'bbvaQrUri', color: '#174f42' },
  ] as const;
  const padDate = (value: number) => String(value).padStart(2, '0');
  const calendarDateKey = (year: number, month: number, day: number) => `${year}-${padDate(month + 1)}-${padDate(day)}`;
  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate();
  const calendarStartOffset = (new Date(calendarYear, calendarMonthIndex, 1).getDay() + 6) % 7;
  const calendarCells: Array<number | null> = [...Array(calendarStartOffset).fill(null), ...Array.from({ length: calendarDaysInMonth }, (_, index) => index + 1)];
  const localCalendarCounts = useMemo(() => sales.reduce<Record<string, number>>((counts, sale) => {
    const date = localDateKey(sale.createdAt);
    if (date) counts[date] = (counts[date] || 0) + 1;
    return counts;
  }, {}), [sales]);
  const calendarCounts = useMemo(() => Object.entries(localCalendarCounts).reduce((counts, [date, count]) => {
    counts[date] = Math.max(calendarSaleCounts[date] || 0, count);
    return counts;
  }, { ...calendarSaleCounts }), [calendarSaleCounts, localCalendarCounts]);
  const calendarMonthLabel = calendarMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const todayKey = localDateKey(new Date());
  const historyToday = visibleSales.filter((sale) => localDateKey(sale.createdAt) === todayKey && sale.status === 'synced');
  const historyPending = visibleSales.filter((sale) => sale.status !== 'synced');
  const historyOlder = visibleSales.filter((sale) => localDateKey(sale.createdAt) !== todayKey && sale.status === 'synced');
  const reportScopedSales = screen === 'report' ? reportDetailSales : filteredSales;
  const selectedPayment = paymentBreakdown.find((item) => item.key === selectedPaymentKey) || null;
  const selectedPaymentSales = selectedPaymentKey ? reportScopedSales.filter((sale) => {
    const provider = sale.paymentProvider || (sale.paymentMethod === 'digital' ? 'digital_unknown' : 'cash');
    return provider === selectedPaymentKey;
  }).slice().reverse() : [];
  const selectedSellerSales = selectedSellerLabel ? reportScopedSales.filter((sale) => (sale.seller?.trim() || 'Sin nombre') === selectedSellerLabel).slice().reverse() : [];
  const openReportDay = async (date: string) => {
    setSelectedDay(date);
    setSelectedDaySales([]);
    setDaySalesLoading(true);
    const result = await loadSalesForDate(date, reportOrigin);
    setSelectedDaySales(result);
    setDaySalesLoading(false);
  };
  const selectReportOrigin = (origin: 'current' | 'historical' | 'all') => {
    setReportOrigin(origin);
    setReportPeriod(origin === 'historical' ? 'historico' : reportPeriod === 'historico' ? 'mes' : reportPeriod);
  };
  return (
  <View style={styles.safe}>
    <View style={[styles.shell, isWide && styles.shellWide, isWide && styles.shellDesktop, isDesktop && styles.desktopShell]}>
      {isWide ? <DesktopNav screen={screen} setScreen={(next: Screen) => navigateTo(next)} sellerName={sellerName} online={online} /> : null}
      <View style={[styles.header, isNarrow && styles.headerCompact, isDesktop && styles.desktopHeader, { paddingTop: Math.max(insets.top + 8, isNarrow ? 18 : 28) }]}>
        {!isDesktop ? <Image source={require('../papachito-logo.jpg')} style={styles.headerLogo} /> : null}
        <View style={styles.userBlock}>
          <Text style={styles.brand}>DONDE PAPACHITO</Text>
          <Text style={styles.title}>{screenTitle(screen)}</Text>
          <Text style={styles.userText}>Atiende: {sellerName}</Text>
        </View>
        <View style={[styles.status, online ? styles.statusOnline : styles.statusOffline]}>
          <Text style={styles.statusText}>{online ? 'Conectado' : 'Sin conexión'}</Text>
        </View>
      </View>

      {!online && screen === 'sale' ? <Text style={styles.offlineHint}>Puedes cobrar ahora; se sincroniza al volver internet.</Text> : null}

      {screen !== 'settings' && screen !== 'payments' && screen !== 'report' && !(screen === 'products' && isDesktop) ? <View style={[styles.searchArea, isDesktop && styles.desktopSearchArea]}>
        <View style={[styles.globalSearch, isNarrow && styles.globalSearchCompact, isDesktop && styles.desktopGlobalSearch, searchFocused && styles.globalSearchFocused]}>
          <Search size={21} color={searchFocused ? '#174f42' : '#89918c'} strokeWidth={2.2} />
              <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={screen === 'history' ? 'Buscar producto, vendedor o fecha' : 'Buscar producto o venta'}
                style={[styles.searchInput, isDesktop && styles.desktopSearchInput]}
            placeholderTextColor="#89918c"
            selectionColor="#174f42"
            cursorColor="#174f42"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search ? (
            <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')} style={({ pressed }) => [styles.clearButton, pressed && styles.buttonPressed]}>
              <X size={19} color="#174f42" />
            </Pressable>
          ) : null}
        </View>

        {searchFocused && searchText ? (
          <View style={[styles.searchPanel, isNarrow && styles.searchPanelCompact]}>
            <View style={styles.searchPanelHeader}>
              <View>
                <Text style={styles.searchPanelEyebrow}>RESULTADOS</Text>
                <Text style={styles.searchPanelTitle}>{searchResults.length ? 'Coincidencias encontradas' : 'No encontramos eso'}</Text>
              </View>
              {searchResults.length ? <Text style={styles.searchPanelCount}>{searchResults.length}</Text> : null}
            </View>
            {searchResults.length === 0 ? (
              <View style={styles.searchEmpty}>
                <Search size={21} color="#7b8580" />
                <View style={styles.searchEmptyCopy}>
                  <Text style={styles.searchEmptyTitle}>Prueba con otro nombre o monto</Text>
                  <Text style={styles.searchEmptyText}>La búsqueda solo muestra productos y ventas.</Text>
                </View>
              </View>
            ) : (
              searchResults.map((result, index) => (
                <Pressable key={`${result.type}-${index}`} onPress={() => selectSearchResult(result)} style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}>
                  <View style={[styles.resultIcon, result.type === 'sale' && styles.resultIconSale]}>
                    {result.type === 'product' ? <Package size={18} color="#174f42" /> : <ReceiptText size={18} color="#315b91" />}
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>{result.subtitle}</Text>
                  </View>
                  <View style={[styles.resultTag, result.type === 'sale' && styles.resultTagSale]}>
                    <Text style={[styles.resultTagText, result.type === 'sale' && styles.resultTagTextSale]}>{result.type === 'product' ? 'Producto' : 'Venta'}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View> : null}

      {searchFocused && searchText ? (
        <Pressable
          accessibilityLabel="Cerrar resultados de búsqueda"
          onPress={() => {
            Keyboard.dismiss();
            setSearchFocused(false);
          }}
          style={styles.searchBackdrop}
        />
      ) : null}

      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, isNarrow && styles.contentCompact, isDesktop && styles.desktopContent, { paddingBottom: 184 + insets.bottom }]}>
        {screen === 'sale' && (
        <View style={[styles.grid, isWide && styles.gridWide, isDesktop && styles.desktopGrid]}>
            <View style={[styles.mainColumn, isDesktop && styles.desktopMainColumn]}>
              <SectionTitle eyebrow="CATALOGO" title="Productos" right={loadingCatalog ? 'Cargando' : `${filteredProducts.length} productos`} />
              {searchingServer ? <Text style={styles.connectionHint}>Actualizando catálogo…</Text> : catalogUsingCache && !online ? <Text style={styles.connectionHint}>Catálogo guardado · sin conexión</Text> : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((item) => (
                    <Pressable key={item} onPress={() => setCategory(item)} style={({ pressed }) => [styles.chip, category === item && styles.chipActive, pressed && styles.buttonPressed]}>
                    <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {filteredProducts.length === 0 ? (
                <Empty title="No hay productos" copy={searchText || category !== 'Todo' ? 'Limpia la búsqueda o cambia de categoría.' : 'No pudimos cargar el catálogo. Revisa el Wi‑Fi y vuelve a intentar.'} />
              ) : (
                <View style={styles.productGrid}>
                  {filteredProducts.slice(0, productRenderLimit).map((item) => <ProductCard key={String(item.id)} item={item} width={productCardWidth} desktop={isDesktop} presentation={productPresentation(item, products)} highlighted={addedProductPulse.startsWith(`${String(item.id)}-`)} onPress={addProduct} />)}
                </View>
              )}
            </View>
          </View>
        )}

        {screen === 'history' && (
          <>
            <View style={styles.summaryCard}>
              <Kpi label="Ventas de hoy" value={String(todaySales.length)} inverse compact={isNarrow} />
              <Kpi label="Total real" value={money(todayTotal)} inverse compact={isNarrow} />
            </View>
            <SectionTitle eyebrow="ACTIVIDAD" title="Historial" right="Actualizar" onRight={refreshSales} />
            {filteredSales.length === 0 ? (
              <Empty title={searchText ? 'Sin ventas' : 'No hay ventas'} copy={searchText ? 'No hay historial que coincida con la busqueda.' : 'Las ventas guardadas apareceran aqui.'} />
            ) : (
              <View style={styles.historySections}>
                {historyToday.length ? <View style={styles.historySection}><SectionTitle compact eyebrow="HOY" title={`${historyToday.length} venta${historyToday.length === 1 ? '' : 's'}`} /><SaleRow key={historyToday[0].id} sale={historyToday[0]} onPress={() => setSelectedSale(historyToday[0])} onDelete={() => cancelSale(historyToday[0])} /></View> : null}
                {historyPending.length ? <View style={styles.historySection}><SectionTitle compact eyebrow="PENDIENTES" title={`${historyPending.length} por enviar`} /><SaleRow key={historyPending[0].id} sale={historyPending[0]} onPress={() => setSelectedSale(historyPending[0])} onDelete={() => cancelSale(historyPending[0])} /></View> : null}
                {historyOlder.length ? <View style={styles.historySection}><SectionTitle compact eyebrow="ANTERIORES" title={`${historyOlder.length} ventas`} /><SaleRow key={historyOlder[0].id} sale={historyOlder[0]} onPress={() => setSelectedSale(historyOlder[0])} onDelete={() => cancelSale(historyOlder[0])} /></View> : null}
                {visibleSales.length > 1 ? <Pressable onPress={() => setHistoryModalOpen(true)} style={({ pressed }) => [styles.historyMoreButton, pressed && styles.buttonPressed]}><Text style={styles.historyMoreText}>Ver historial completo · {visibleSales.length}</Text></Pressable> : null}
              </View>
            )}
          </>
        )}

        {screen === 'report' && (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <View style={styles.reportHeaderRow}>
                <View><Text style={styles.eyebrow}>{reportOrigin === 'historical' ? 'HISTÓRICO IMPORTADO' : reportOrigin === 'all' ? 'VISTA CONSOLIDADA' : 'PERIODO ACTUAL'}</Text><Text style={styles.reportHeaderTitle}>{reportOrigin === 'historical' ? 'Sistema anterior · solo lectura' : reportOrigin === 'all' ? 'Ventas actuales e importadas' : 'Resumen de ventas'}</Text></View>
                <Pressable onPress={() => loadReport(reportPeriod, reportOrigin)} disabled={reportLoading} style={({ pressed }) => [styles.reportRefreshButton, reportLoading && styles.buttonDisabled, pressed && styles.buttonPressed]}><Text style={styles.reportRefreshText}>{reportLoading ? 'Actualizando…' : 'Actualizar'}</Text></Pressable>
              </View>
              <View style={styles.reportOriginTabs}>
                {([['current', 'Ventas actuales'], ['historical', 'Histórico importado'], ['all', 'Todo']] as const).map(([origin, label]) => <Pressable key={origin} onPress={() => selectReportOrigin(origin)} style={({ pressed }) => [styles.reportOriginButton, reportOrigin === origin && styles.reportOriginButtonActive, pressed && styles.buttonPressed]}><Text style={[styles.reportOriginText, reportOrigin === origin && styles.reportOriginTextActive]}>{label}</Text></Pressable>)}
              </View>
              {reportOrigin !== 'historical' ? <View style={styles.periodTabs}>
                {(['dia', 'mes', 'ano'] as ReportPeriod[]).map((period) => (
                  <Pressable key={period} onPress={() => setReportPeriod(period)} style={({ pressed }) => [styles.periodTab, reportPeriod === period && styles.periodTabActive, pressed && styles.buttonPressed]}>
                    <Text style={[styles.periodTabText, reportPeriod === period && styles.periodTabTextActive]}>{period === 'dia' ? 'Últimos 7 días' : period === 'mes' ? 'Mensual' : 'Anual'}</Text>
                  </Pressable>
                ))}
              </View> : null}
              {isDesktop ? <View style={styles.reportKpiRow}>
                <View style={styles.reportKpiSlotWide}><Kpi label={reportOrigin === 'historical' ? 'Histórico importado' : 'Ventas del periodo'} value={money(reportSummary.total)} tone="green" /></View>
                <View style={styles.reportKpiSlotWide}><Kpi label={reportOrigin === 'historical' ? 'Operaciones históricas' : 'Operaciones'} value={String(reportSummary.count)} tone="blue" /></View>
                <View style={styles.reportKpiSlotWide}><Kpi label="Promedio por operación" value={money(reportSummary.average)} tone="amber" /></View>
              </View> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reportSummaryScroll}>
                <View style={styles.reportKpiSlot}><Kpi label={reportOrigin === 'historical' ? 'Histórico importado' : 'Ventas del periodo'} value={money(reportSummary.total)} tone="green" compact={isNarrow} /></View>
                <View style={styles.reportKpiSlot}><Kpi label={reportOrigin === 'historical' ? 'Operaciones históricas' : 'Operaciones'} value={String(reportSummary.count)} tone="blue" compact={isNarrow} /></View>
                <View style={styles.reportKpiSlot}><Kpi label="Promedio por operación" value={money(reportSummary.average)} tone="amber" compact={isNarrow} /></View>
              </ScrollView>}
              <View style={[styles.panelLarge, isNarrow && styles.panelLargeMobile]}>
                <SectionTitle compact={isNarrow} eyebrow={reportOrigin === 'historical' ? 'FUENTE · SISTEMA ANTERIOR' : `MOVIMIENTO · ${reportPeriodLabel(reportPeriod).toUpperCase()}`} title={reportOrigin === 'historical' ? 'Evolución importada' : 'Movimiento del periodo'} />
                <Text style={styles.muted}>{remoteReport ? `${reportDateLabel(remoteReport.from, reportPeriod)} – ${reportDateLabel(remoteReport.to, reportPeriod)} · ${reportOrigin === 'all' ? 'Fuentes combinadas' : reportOrigin === 'historical' ? 'Solo lectura' : 'Ventas actuales'}` : 'Cargando datos del reporte…'}</Text>
                {reportOrigin === 'all' ? <View style={styles.reportCombinedWarning}><Text style={styles.reportCombinedWarningText}>Vista consolidada: combina ventas actuales e importadas.</Text></View> : null}
                {reportStale ? <Pressable onPress={() => loadReport(reportPeriod, reportOrigin)} style={styles.flowWarning}><Text style={styles.flowWarningText}>Datos guardados · sin actualizar. Toca para reintentar.</Text></Pressable> : null}
                {reportActiveSeries.length > 0 ? <View style={styles.reportChartSummary}><Text style={styles.reportChartSummaryText}>{reportActiveSeries.length} {chartUnit}{reportActiveSeries.length === 1 ? '' : 's'} con ventas</Text><Text style={styles.reportChartSummaryValue}>{money(reportSummary.total)}</Text></View> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {reportActiveSeries.length === 0 ? <Empty title="Sin ventas en este periodo" copy="Cambia a otro periodo o registra una venta." compact /> : <View style={[styles.chartLarge, reportActiveSeries.length > 8 && styles.chartLargeWide]}>
                    {reportActiveSeries.map((item) => {
                      const total = Number(item.total) || 0;
                      const height = total > 0 ? Math.max(10, (total / reportMax) * 128) : 5;
                      return (
                        <View key={item.date} style={styles.chartCol}>
                          <Text style={styles.chartValue} numberOfLines={1}>{showChartValues ? (total > 0 ? money(total) : '—') : ''}</Text>
                          <View style={styles.chartBarTrack}>
                            <View style={[styles.chartBar, { height, backgroundColor: chartColor }]} />
                          </View>
                          <Text style={styles.chartLabel} numberOfLines={1}>{reportDateLabel(item.date, reportPeriod)}</Text>
                        </View>
                      );
                    })}
                  </View>}
                </ScrollView>
              </View>
              {reportOrigin !== 'historical' ? <View style={styles.calendarPanel}>
                <View style={styles.calendarHeader}><View style={styles.rowText}><Text style={styles.eyebrow}>EXPLORAR POR DÍA</Text><Text style={styles.calendarTitle}>{calendarMonthLabel}</Text></View><View style={styles.calendarNav}><Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.buttonPressed]}><ChevronLeft size={18} color="#174f42" /></Pressable><Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.buttonPressed]}><ChevronRight size={18} color="#174f42" /></Pressable></View></View>
                <View style={styles.calendarWeekRow}>{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>{day}</Text>)}</View>
                <View style={styles.calendarGrid}>{calendarCells.map((day, index) => { if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />; const date = calendarDateKey(calendarYear, calendarMonthIndex, day); const saleCount = calendarCounts[date] || 0; const hasSales = saleCount > 0; return <Pressable key={date} onPress={() => void openReportDay(date)} style={({ pressed }) => [styles.calendarCell, saleCount >= 5 ? styles.calendarCellBusy : saleCount >= 2 ? styles.calendarCellActive : hasSales && styles.calendarCellMarked, pressed && styles.buttonPressed]}><Text style={[styles.calendarDayText, hasSales && styles.calendarDayTextMarked]}>{day}</Text>{hasSales ? <View style={styles.calendarDot} /> : null}</Pressable>; })}</View>
                <View style={styles.calendarHintRow}><CalendarDays size={14} color="#6a716d" /><Text style={styles.calendarHint}>Toca un día para ver sus ventas</Text></View>
              </View> : null}
              {reportOrigin !== 'current' ? <View style={[styles.panelLarge, isNarrow && styles.panelLargeMobile]}>
                <SectionTitle compact={isNarrow} eyebrow="HISTÓRICO IMPORTADO" title="Sistema anterior · solo lectura" />
                <Text style={styles.muted}>Rango de datos: {remoteReport?.historical?.firstDate ? reportDateLabel(remoteReport.historical.firstDate, 'mes') : 'no informado'} – {remoteReport?.historical?.lastDate ? reportDateLabel(remoteReport.historical.lastDate, 'mes') : 'no informado'}.</Text>
                <View style={styles.historicalRow}>
                  <Stat label="Total acumulado importado" value={money(remoteReport?.historical?.total ?? 0)} />
                  <Stat label="Operaciones históricas" value={String(remoteReport?.historical?.count ?? 0)} />
                </View>
              </View> : null}
              <View style={[styles.panelLarge, isNarrow && styles.panelLargeMobile]}>
                <SectionTitle compact={isNarrow} eyebrow="PRODUCTOS" title="Más vendidos" />
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
                <SectionTitle compact={isNarrow} eyebrow="ESTADO OPERATIVO" title="Resumen" />
                <Stat label="Pendientes" value={String(pendingCount)} />
                <Stat label="Estado API" value={online ? 'Conectada' : 'Offline'} />
               </View>
               <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="DETALLES DEL REPORTE" title="Medios de pago" />
                <Text style={styles.muted}>{reportOrigin === 'historical' ? 'Importado · solo lectura' : 'Toca un medio para ver el detalle.'}</Text>
                {paymentBreakdown.filter((item) => item.enabled || item.total > 0).map((item) => (
                  <Pressable key={item.key} onPress={() => setSelectedPaymentKey(item.key)} style={({ pressed }) => [styles.paymentReportRow, !item.enabled && item.total <= 0 && styles.paymentReportRowDisabled, pressed && styles.buttonPressed]}>
                    <View style={[styles.paymentReportDot, { backgroundColor: item.color }]} />
                    <View style={styles.rowText}>
                      <Text style={[styles.paymentReportLabel, !item.enabled && item.total <= 0 && styles.paymentReportTextDisabled]}>{item.label}</Text>
                      <Text style={[styles.paymentReportState, !item.enabled && item.total <= 0 && styles.paymentReportTextDisabled]}>{item.enabled ? 'Activo' : item.total > 0 ? 'Registrado' : 'Desactivado'} · ver ventas</Text>
                    </View>
                    <Text style={[styles.paymentReportTotal, !item.enabled && item.total <= 0 && styles.paymentReportTextDisabled]}>{money(item.total)}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="DETALLE" title="Últimas ventas" />
                {reportScopedSales.length === 0 ? (
                  <Empty title="Sin ventas" copy="Aún no hay movimientos para mostrar." compact />
                ) : (
                  reportScopedSales.slice(0, 4).map((sale) => (
                    <Pressable key={sale.id} onPress={() => setSelectedSale(sale)} style={({ pressed }) => [styles.miniSale, pressed && styles.buttonPressed]}>
                      <View style={styles.rowText}>
                        <Text style={styles.miniSaleTitle}>{shortDate(sale.createdAt)} | {saleTime(sale.createdAt)}</Text>
                        <Text style={styles.muted}>{sale.items.length} productos · {sale.seller} · ver detalle</Text>
                      </View>
                      <Text style={styles.miniSaleTotal}>{money(sale.total)}</Text>
                    </Pressable>
                  ))
                )}
              </View>
              <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="PERSONAS" title="Ventas por vendedor" />
                {sellerBreakdown.length === 0 ? (
                  <Empty title="Sin vendedores" copy="Los nombres aparecerán al registrar ventas." compact />
                ) : (
                  sellerBreakdown.map((item) => (
                    <Pressable key={item.label} onPress={() => setSelectedSellerLabel(item.label)} style={({ pressed }) => [styles.reportClickableRow, pressed && styles.buttonPressed]}>
                      <RankRow label={item.label} detail={`${item.count} ${item.count === 1 ? 'venta' : 'ventas'} · ver detalle`} value={money(item.total)} percent={item.total / maxSellerTotal} compact />
                    </Pressable>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {screen === 'payments' && (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <Pressable onPress={() => navigateTo('settings')} style={({ pressed }) => [styles.backLink, pressed && styles.buttonPressed]}>
                <ArrowLeft size={18} color="#174f42" />
                <Text style={styles.backLinkText}>Volver a Ajustes</Text>
              </Pressable>
              <View style={styles.panel}>
                <SectionTitle eyebrow="COBROS" title="Medios de pago" />
                <Text style={styles.muted}>Activa cada medio y guarda su QR en el teléfono.</Text>
              </View>
              {paymentOptions.map((option) => {
                const qrUri = paymentConfig[option.qrKey];
                const enabled = paymentConfig[option.enabledKey];
                return (
                  <View key={option.key} style={[styles.paymentMethodCard, { borderLeftColor: option.color }]}>
                    <View style={styles.paymentMethodHeader}>
                      <View style={styles.rowText}>
                        <Text style={styles.paymentMethodTitle}>{option.label}</Text>
                        <Text style={styles.muted}>{enabled ? 'Disponible al cobrar' : 'Desactivado'}</Text>
                      </View>
                      <Switch value={enabled} onValueChange={(value) => togglePaymentMethod(option.enabledKey, value)} trackColor={{ false: '#d8d4cc', true: '#9ac9ae' }} thumbColor={enabled ? '#174f42' : '#fff'} />
                    </View>
                    <View style={styles.qrUploadRow}>
                      <View style={styles.qrPreviewSmall}>
                        {qrUri ? <Image source={{ uri: qrUri }} style={styles.qrPreviewImage} resizeMode="contain" /> : option.key === 'yape' ? <Image source={require('../yape-qr.jpg')} style={styles.qrPreviewImage} resizeMode="contain" /> : <Text style={styles.qrPreviewText}>QR</Text>}
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.paymentMethodTitle}>{qrUri ? 'QR guardado' : option.key === 'yape' ? 'QR predeterminado' : 'Sin QR'}</Text>
                        <Pressable onPress={() => pickPaymentQr(option.key)} style={({ pressed }) => [styles.secondaryButton, styles.uploadButton, pressed && styles.buttonPressed]}>
                          <Text style={styles.secondaryText}>{qrUri ? 'Cambiar imagen' : 'Subir imagen'}</Text>
                        </Pressable>
                        {qrUri ? <Pressable onPress={() => removePaymentQr(option.key)}><Text style={styles.deleteSaleText}>Quitar imagen</Text></Pressable> : null}
                      </View>
                    </View>
                  </View>
                );
              })}
              <View style={styles.panel}>
                <Text style={styles.muted}>Más medios de pago podrán agregarse después con QR o número.</Text>
              </View>
            </View>
          </View>
        )}

        {screen === 'products' && isDesktop && (
          <View style={styles.productAdminScreen}>
            <View style={styles.productAdminHero}>
              <View style={styles.productAdminHeroCopy}>
                <Text style={styles.eyebrow}>CATÁLOGO DE PRODUCTOS</Text>
                <Text style={styles.productAdminTitle}>Agrega lo que vendes</Text>
                <Text style={styles.productAdminSubtitle}>Crea un producto nuevo desde aquí. Al guardarlo, aparecerá automáticamente en Vender.</Text>
              </View>
              <View style={styles.productAdminHeroBadge}><Package size={30} color="#fff" /><Text style={styles.productAdminHeroBadgeText}>Catálogo conectado</Text></View>
            </View>
            <View style={styles.productAdminColumns}>
              <View style={styles.productAdminStepCard}>
                <Text style={styles.eyebrow}>FLUJO SIMPLE</Text>
                <Text style={styles.productAdminCardTitle}>Un alta clara y guiada</Text>
                <Text style={styles.muted}>1. Escribe los datos · 2. Carga una imagen si deseas · 3. Guarda y revisa la confirmación.</Text>
                <Pressable onPress={() => setProductCreatorOpen(true)} style={({ pressed }) => [styles.primaryButton, styles.productAdminAction, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryText}>Agregar producto</Text>
                </Pressable>
              </View>
              <View style={styles.productAdminInfoCard}>
                <Text style={styles.eyebrow}>DESPUÉS DE GUARDAR</Text>
                <Text style={styles.productAdminCardTitle}>Listo para vender</Text>
                <Text style={styles.muted}>El sistema actualiza el catálogo de la computadora y conserva el historial de ventas existente.</Text>
                <Pressable onPress={() => navigateTo('sale')} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Volver a Vender</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.productAdminListCard}>
              <View style={styles.productAdminListHeader}>
                <View style={styles.rowText}>
                  <Text style={styles.eyebrow}>CATÁLOGO ACTUAL</Text>
                  <Text style={styles.productAdminCardTitle}>Todos tus productos</Text>
                  <Text style={styles.muted}>Edita nombre, categoría, descripción o precio. Las ventas guardadas no se modifican.</Text>
                </View>
                <Text style={styles.productAdminCount}>{filteredAdminProducts.length} de {products.length}</Text>
              </View>
              <View style={styles.productAdminSearchBox}>
                <Search size={19} color="#6d8278" />
                <TextInput value={productAdminSearch} onChangeText={setProductAdminSearch} placeholder="Buscar en tus productos" placeholderTextColor="#89918c" style={styles.productAdminSearchInput} autoCapitalize="none" autoCorrect={false} />
                {productAdminSearch ? <Pressable onPress={() => setProductAdminSearch('')} style={styles.productAdminSearchClear}><X size={18} color="#174f42" /></Pressable> : null}
              </View>
              <View style={styles.productAdminListHeaderRow}>
                <Text style={[styles.productAdminColumnLabel, styles.productAdminColumnName]}>PRODUCTO</Text>
                <Text style={styles.productAdminColumnLabel}>CATEGORÍA</Text>
                <Text style={styles.productAdminColumnLabel}>PRECIO</Text>
                <Text style={styles.productAdminColumnLabel}>ACCIÓN</Text>
              </View>
              {filteredAdminProducts.map((product) => (
                <View key={String(product.id)} style={styles.productAdminRow}>
                  <View style={styles.productAdminProductCell}>
                    {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productAdminImage} resizeMode="cover" /> : <View style={styles.productAdminInitial}><Text style={styles.productAdminInitialText}>{product.name.slice(0, 2).toUpperCase()}</Text></View>}
                    <View style={styles.rowText}>
                      <Text style={styles.productAdminProductName} numberOfLines={2}>{product.name}</Text>
                      <View style={[styles.presentationBadge, productPresentation(product, products).tone === 'unit' ? styles.presentationUnit : productPresentation(product, products).tone === 'box' ? styles.presentationBox : styles.presentationPack]}><Text style={styles.presentationBadgeText}>{productPresentation(product, products).label}</Text></View>
                    </View>
                  </View>
                  <Text style={styles.productAdminCellText} numberOfLines={1}>{product.category || 'Otros'}</Text>
                  <Text style={styles.productAdminPrice}>{money(Number(product.price) || 0)}</Text>
                  <View style={styles.productAdminActions}>
                    <Pressable onPress={() => setEditingProduct(product)} style={({ pressed }) => [styles.productAdminEditButton, pressed && styles.buttonPressed]}><Text style={styles.productAdminEditText}>Editar</Text></Pressable>
                    <Pressable onPress={() => { setProductDeleteMessage(''); setProductPendingDeletion(product); }} style={({ pressed }) => [styles.productAdminDeleteButton, pressed && styles.buttonPressed]}><Text style={styles.productAdminDeleteText}>Eliminar</Text></Pressable>
                  </View>
                </View>
              ))}
              {filteredAdminProducts.length === 0 ? <View style={styles.productAdminEmpty}><Text style={styles.productAdminEmptyTitle}>No encontramos ese producto</Text><Text style={styles.muted}>Prueba con otro nombre, categoría o precio.</Text></View> : null}
            </View>
            {productDeleteMessage ? <View style={styles.productDeleteSuccess}><Text style={styles.productDeleteSuccessText}>{productDeleteMessage}</Text></View> : null}
          </View>
        )}

        {screen === 'settings' && (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <View style={styles.panel}>
                <SectionTitle eyebrow="PERFIL" title="Nombre del vendedor" />
                <TextInput value={settingsName} onChangeText={setSettingsName} editable={editingName} placeholder="Nombre" style={[styles.input, !editingName && styles.inputLocked]} />
                <Pressable onPress={() => { if (editingName) { void saveSettingsName(); setEditingName(false); } else setEditingName(true); }} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryText}>{editingName ? 'Guardar nombre' : 'Cambiar nombre'}</Text>
                </Pressable>
              </View>
               <View style={styles.panel}>
                 <SectionTitle eyebrow="COBROS DIGITALES" title="Medios de pago" />
                 <Text style={styles.muted}>Configura Yape, Plin, BBVA y sus imágenes QR.</Text>
                <Pressable onPress={() => navigateTo('payments')} style={({ pressed }) => [styles.paymentSettingsCard, pressed && styles.buttonPressed]}>
                   <View style={styles.rowText}><Text style={styles.preferenceTitle}>Yape · Plin · BBVA</Text><Text style={styles.muted}>Activar medios y subir QR</Text></View>
                   <ArrowLeft size={20} color="#174f42" style={{ transform: [{ rotate: '180deg' }] }} />
                 </Pressable>
                </View>
              {Platform.OS === 'web' && isWide ? (
                <View style={styles.panel}>
                  <SectionTitle eyebrow="CONEXIÓN DEL TELÉFONO" title="QR de esta computadora" />
                  <Text style={styles.muted}>Abre Papachito en el teléfono y escanea este código desde Ajustes. Ambos equipos deben estar en la misma WiFi.</Text>
                  {connectionQr?.qrDataUrl ? (
                    <View style={{ alignItems: 'center', gap: 10, marginTop: 14 }}>
                      <Image source={{ uri: connectionQr.qrDataUrl }} style={{ width: 260, height: 260 }} />
                      <Text style={[styles.muted, { textAlign: 'center' }]} selectable>{connectionQr.apiBase}</Text>
                    </View>
                  ) : (
                    <Text style={styles.muted}>Generando QR de conexión…</Text>
                  )}
                  <Pressable onPress={() => void loadConnectionQr()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                    <Text style={styles.secondaryText}>Actualizar QR</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.panel}>
                <SectionTitle eyebrow="APLICACIÓN" title="Actualización" />
                <Text style={styles.muted}>Versión instalada: {installedVersion} · Código {installedVersionCode}</Text>
                <Text style={styles.muted}>Las nuevas versiones se descargan desde GitHub Releases y se instalan como APK.</Text>
                {availableUpdate ? (
                  <View style={styles.updateNotice}>
                    <Text style={styles.preferenceTitle}>{availableUpdate.name}</Text>
                    <Text style={styles.muted}>Nueva versión {availableUpdate.version}</Text>
                    <Text style={styles.muted} numberOfLines={4}>{availableUpdate.notes}</Text>
                    {updateInstalling ? (
                      <View style={styles.updateProgressBox}>
                        <View style={styles.updateProgressHeader}>
                          <View style={styles.updateProgressTitleRow}>
                            <ActivityIndicator size="small" color="#174f42" />
                            <Text style={styles.updateProgressTitle}>{updateDownloadProgress?.progress && updateDownloadProgress.progress >= 0.99 ? 'Preparando instalador…' : 'Descargando actualización…'}</Text>
                          </View>
                          <Text style={styles.updateProgressPercent}>{updateDownloadProgress?.totalBytes ? `${Math.round((updateDownloadProgress.progress || 0) * 100)}%` : '…'}</Text>
                        </View>
                        <View style={styles.updateProgressTrack}>
                          <View style={[styles.updateProgressFill, { width: `${Math.max(3, Math.round((updateDownloadProgress?.progress || 0) * 100))}%` }]} />
                        </View>
                        <Text style={styles.updateProgressHint}>
                          {updateDownloadProgress?.totalBytes ? `${(updateDownloadProgress.receivedBytes / 1024 / 1024).toFixed(1)} MB de ${(updateDownloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB` : 'Conectando con GitHub…'}
                        </Text>
                      </View>
                    ) : (
                      <Pressable onPress={installUpdate} disabled={updateInstalling} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                        <Text style={styles.primaryText}>Descargar e instalar</Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
                <Pressable onPress={checkForUpdate} disabled={updateChecking} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>{updateChecking ? 'Revisando GitHub…' : 'Buscar actualización'}</Text>
                </Pressable>
                {updateStatus ? <Text style={styles.connectionHint}>{updateStatus}</Text> : null}
              </View>
               <View style={styles.panel}>
                <SectionTitle eyebrow="SINCRONIZACION" title="Estado local" />
                <Stat label="Ventas pendientes" value={String(pendingCount)} />
                <Stat label="Servidor" value={online ? 'Conectado' : 'Sin conexión'} />
                <Stat label="API detectada" value={apiBase} />
                <TextInput value={apiBase} onChangeText={setApiBaseState} autoCapitalize="none" autoCorrect={false} placeholder="http://IP-DE-LA-LAPTOP:8090" style={styles.input} />
                {savedApiBases.length > 0 ? <Text style={styles.muted}>Servidores guardados</Text> : null}
                {savedApiBases.map((base) => <Pressable key={base} onPress={() => setApiBaseState(base)} style={({ pressed }) => [styles.savedServer, pressed && styles.buttonPressed]}><Text style={styles.savedServerText}>{base}</Text></Pressable>)}
                <Pressable onPress={saveServer} disabled={serverSaving} style={({ pressed }) => [styles.secondaryButton, (serverSaving || syncing) && styles.buttonDisabled, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>{serverSaving ? 'Conectando…' : 'Guardar servidor y probar'}</Text>
                </Pressable>
               <Pressable onPress={syncNow} disabled={syncing || serverSaving} style={({ pressed }) => [styles.secondaryButton, (syncing || serverSaving) && styles.buttonDisabled, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>{syncing ? 'Sincronizando…' : 'Reconectar y sincronizar'}</Text>
                </Pressable>
                {syncError ? <Pressable onPress={syncNow} disabled={syncing} style={styles.flowWarning}><Text style={styles.flowWarningText}>{syncError} Toca para reintentar.</Text></Pressable> : null}
                <Pressable onPress={openScanner} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Escanear QR de la laptop</Text>
                </Pressable>
                {lastSyncAt ? <Text style={styles.muted}>Última sincronización: {saleTime(lastSyncAt)}</Text> : null}
              </View>
              <View style={styles.panel}>
                <SectionTitle eyebrow="CONEXIÓN" title="Conectar otro teléfono" />
                <Text style={styles.muted}>Comparte este QR con otro dispositivo. Al escanearlo, quedará conectado a esta computadora.</Text>
                {connectionQr?.qrDataUrl ? (
                  <View style={{ alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <Image source={{ uri: connectionQr.qrDataUrl }} style={{ width: 190, height: 190 }} />
                    <Text style={[styles.muted, { textAlign: 'center' }]} selectable>{connectionQr.apiBase}</Text>
                  </View>
                ) : <Text style={styles.muted}>Generando QR de conexión…</Text>}
                <Pressable onPress={() => void loadConnectionQr()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Actualizar QR</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {selectedDay ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedDay(null)} style={styles.dayModalDismiss} />
          <View style={[styles.dayModalCard, isDesktop && styles.desktopModalCard]}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}>
                <Text style={styles.eyebrow}>VENTAS DEL DÍA</Text>
                <Text style={styles.dayModalTitle} numberOfLines={1}>{reportDateLabel(selectedDay, 'dia')}</Text>
              </View>
              <Pressable onPress={() => setSelectedDay(null)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            {daySalesLoading ? <Text style={styles.muted}>Cargando ventas…</Text> : selectedDaySales.length === 0 ? (
              <Empty title="Sin ventas este día" copy="No hay operaciones registradas en esta fecha." compact />
            ) : (
              <ScrollView style={styles.daySalesList}>
                {selectedDaySales.map((sale) => (
                  <View key={sale.id} style={styles.daySaleRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.daySaleTitle}>{saleTime(sale.createdAt)} · {sale.seller}</Text>
                      <Text style={styles.muted}>{sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'} · {sale.paymentMethod === 'digital' ? 'Digital' : 'Efectivo'}</Text>
                    </View>
                    <Text style={styles.daySaleTotal}>{money(sale.total)}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.dayModalTotal}><Text style={styles.dayModalTotalLabel}>Total del día</Text><Text style={styles.dayModalTotalValue}>{money(selectedDaySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0))}</Text></View>
          </View>
        </View>
      ) : null}

      {selectedPayment ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedPaymentKey(null)} style={styles.dayModalDismiss} />
          <View style={[styles.dayModalCard, isDesktop && styles.desktopModalCard]}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}>
                <Text style={styles.eyebrow}>MEDIO DE PAGO</Text>
                <Text style={styles.dayModalTitle} numberOfLines={1}>{selectedPayment.label}</Text>
                <Text style={styles.muted}>{selectedPayment.enabled ? 'Activo para nuevas ventas' : 'Desactivado · conserva su histórico'}</Text>
              </View>
              <Pressable onPress={() => setSelectedPaymentKey(null)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            {selectedPaymentSales.length === 0 ? (
              <Empty title="Sin ventas registradas" copy="Este medio seguirá visible aunque todavía no tenga movimientos." compact />
            ) : (
              <ScrollView style={styles.daySalesList}>
                {selectedPaymentSales.map((sale) => (
                  <Pressable key={sale.id} onPress={() => { setSelectedPaymentKey(null); setSelectedSale(sale); }} style={({ pressed }) => [styles.daySaleRow, pressed && styles.buttonPressed]}>
                    <View style={styles.rowText}>
                      <Text style={styles.daySaleTitle}>{shortDate(sale.createdAt)} · {saleTime(sale.createdAt)}</Text>
                      <Text style={styles.muted}>{sale.seller || 'Sin nombre'} · {sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}</Text>
                    </View>
                    <Text style={styles.daySaleTotal}>{money(sale.total)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.dayModalTotal}><Text style={styles.dayModalTotalLabel}>Total de {selectedPayment.label}</Text><Text style={styles.dayModalTotalValue}>{money(selectedPayment.total)}</Text></View>
          </View>
        </View>
      ) : null}

      {selectedSellerLabel ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedSellerLabel(null)} style={styles.dayModalDismiss} />
          <View style={[styles.dayModalCard, isDesktop && styles.desktopModalCard]}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}>
                <Text style={styles.eyebrow}>VENTAS POR VENDEDOR</Text>
                <Text style={styles.dayModalTitle} numberOfLines={1}>{selectedSellerLabel}</Text>
                <Text style={styles.muted}>Productos y operaciones realizadas por esta persona</Text>
              </View>
              <Pressable onPress={() => setSelectedSellerLabel(null)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            {selectedSellerSales.length === 0 ? <Empty title="Sin ventas" copy="No hay operaciones para este vendedor en el periodo." compact /> : (
              <ScrollView style={styles.daySalesList}>
                {selectedSellerSales.map((sale) => (
                  <Pressable key={sale.id} onPress={() => { setSelectedSellerLabel(null); setSelectedSale(sale); }} style={({ pressed }) => [styles.daySaleRow, pressed && styles.buttonPressed]}>
                    <View style={styles.rowText}>
                      <Text style={styles.daySaleTitle}>{shortDate(sale.createdAt)} · {saleTime(sale.createdAt)}</Text>
                      <Text style={styles.muted}>{sale.seller || 'Sin nombre'} · {sale.items.map((item: any) => `${item.name || 'Producto'} × ${item.quantity || 1}`).join(' · ')}</Text>
                    </View>
                    <Text style={styles.daySaleTotal}>{money(sale.total)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <View style={styles.dayModalTotal}><Text style={styles.dayModalTotalLabel}>Total de {selectedSellerLabel}</Text><Text style={styles.dayModalTotalValue}>{money(selectedSellerSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0))}</Text></View>
          </View>
        </View>
      ) : null}

      {selectedSale ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedSale(null)} style={styles.dayModalDismiss} />
          <View style={[styles.dayModalCard, isDesktop && styles.desktopModalCard]}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}>
                <Text style={styles.eyebrow}>DETALLE DE VENTA</Text>
                <Text style={styles.dayModalTitle} numberOfLines={1}>{reportDateLabel(selectedSale.createdAt, 'dia')}</Text>
                <Text style={styles.muted}>{saleTime(selectedSale.createdAt)} · {selectedSale.seller}</Text>
              </View>
              <Pressable onPress={() => setSelectedSale(null)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            <View style={styles.saleDetailMeta}>
              <Text style={styles.saleDetailMetaText}>{selectedSale.status === 'synced' ? 'Sincronizada' : 'Pendiente'}</Text>
              <Text style={styles.saleDetailMetaText}>{selectedSale.paymentMethod === 'digital' ? 'Pago digital' : 'Efectivo'}</Text>
            </View>
            <View style={styles.saleDetailActions}>
              <Pressable onPress={() => setReceiptSale(selectedSale)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.secondaryText}>Ver boleta</Text>
              </Pressable>
              {screen !== 'report' ? <Pressable onPress={() => setEditingSale(selectedSale)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                <Text style={styles.secondaryText}>Editar vendedor y productos</Text>
              </Pressable> : null}
              {screen === 'report' && !selectedSale.readOnly && selectedSale.origin !== 'historical' ? <Pressable onPress={() => { setSaleDeleteError(''); setSaleDeleteTarget(selectedSale); }} style={({ pressed }) => [styles.dangerOutlineButton, pressed && styles.buttonPressed]}>
                <Text style={styles.dangerOutlineText}>Anular venta</Text>
              </Pressable> : null}
            </View>
            {screen === 'report' && reportOrigin === 'historical' ? <Text style={styles.reportReadOnlyHint}>Histórico importado · solo lectura</Text> : null}
            <ScrollView style={styles.saleDetailItems}>
              {selectedSale.items.map((item: any, index: number) => {
                const quantity = Number(item.quantity || 1);
                const price = Number(item.price || item.unitPrice || 0);
                return (
                  <View key={`${selectedSale.id}-${index}`} style={styles.saleDetailRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.saleDetailName}>{item.name || 'Producto'}</Text>
                      <Text style={styles.muted}>{quantity} × {money(price)}</Text>
                    </View>
                    <Text style={styles.daySaleTotal}>{money(quantity * price)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.dayModalTotal}><Text style={styles.dayModalTotalLabel}>Total de la venta</Text><Text style={styles.dayModalTotalValue}>{money(selectedSale.total)}</Text></View>
          </View>
        </View>
      ) : null}

      {receiptSale ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setReceiptSale(null)} style={styles.dayModalDismiss} />
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Image source={require('../papachito-logo.jpg')} style={styles.receiptLogo} />
              <Text style={styles.receiptBrand}>DONDE PAPACHITO</Text>
              <Text style={styles.receiptBusiness}>Venta de abarrotes y productos de consumo</Text>
              <Text style={styles.receiptTitle}>BOLETA SIMPLE</Text>
              <Text style={styles.receiptOperation}>OP-{(receiptSale.remoteUuid || receiptSale.id).slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.receiptInfoGrid}>
              <View style={styles.receiptInfoBlock}><Text style={styles.receiptInfoLabel}>FECHA</Text><Text style={styles.receiptInfoValue}>{reportDateLabel(receiptSale.createdAt, 'dia')}</Text></View>
              <View style={styles.receiptInfoBlock}><Text style={styles.receiptInfoLabel}>HORA</Text><Text style={styles.receiptInfoValue}>{saleTime(receiptSale.createdAt)}</Text></View>
              <View style={styles.receiptInfoBlock}><Text style={styles.receiptInfoLabel}>ATENDIÓ</Text><Text style={styles.receiptInfoValue}>{receiptSale.seller || 'Sin nombre'}</Text></View>
              <View style={styles.receiptInfoBlock}><Text style={styles.receiptInfoLabel}>CLIENTE</Text><Text style={styles.receiptInfoValue}>Consumo interno</Text></View>
            </View>
            <View style={styles.receiptTableHeader}><Text style={styles.receiptTableDescription}>DESCRIPCIÓN</Text><Text style={styles.receiptTableQty}>CANT.</Text><Text style={styles.receiptTablePrice}>P.U.</Text><Text style={styles.receiptTableTotal}>TOTAL</Text></View>
            <ScrollView style={styles.receiptItems}>
              {receiptSale.items.map((item: any, index: number) => {
                const quantity = Number(item.quantity || 1);
                const price = Number(item.price || item.unitPrice || 0);
                return <View key={`${receiptSale.id}-receipt-${index}`} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName}>{item.name || 'Producto'}</Text>
                  <Text style={styles.receiptItemQty}>{quantity}</Text>
                  <Text style={styles.receiptItemPrice}>{money(price)}</Text>
                  <Text style={styles.receiptItemTotal}>{money(quantity * price)}</Text>
                </View>;
              })}
            </ScrollView>
            <View style={styles.receiptSummary}>
              <View style={styles.receiptSummaryRow}><Text style={styles.receiptSummaryLabel}>SUBTOTAL</Text><Text style={styles.receiptSummaryValue}>{money(receiptSale.total)}</Text></View>
              <View style={styles.receiptSummaryRow}><Text style={styles.receiptSummaryLabel}>IMPUESTOS</Text><Text style={styles.receiptSummaryValue}>S/ 0.00</Text></View>
              <View style={styles.receiptTotalRow}><Text style={styles.receiptTotalLabel}>IMPORTE TOTAL</Text><Text style={styles.receiptTotalValue}>{money(receiptSale.total)}</Text></View>
            </View>
            <View style={styles.receiptPayment}><Text style={styles.receiptPaymentLabel}>MEDIO DE PAGO</Text><Text style={styles.receiptPaymentValue}>{receiptSale.paymentMethod === 'digital' ? (receiptSale.paymentLabel || 'Pago digital') : 'Efectivo'}</Text></View>
            <Text style={styles.receiptFooter}>Comprobante interno · no tributario</Text>
            <Text style={styles.receiptThanks}>Gracias por tu compra</Text>
            <Pressable onPress={() => setReceiptSale(null)} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}><Text style={styles.primaryText}>Cerrar</Text></Pressable>
          </View>
        </View>
      ) : null}

      {saleDeleteTarget ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSaleDeleteTarget(null)} style={styles.dayModalDismiss} />
          <View style={styles.deleteSaleCard}>
            <Text style={styles.eyebrow}>CONFIRMACIÓN</Text>
            <Text style={styles.deleteSaleTitle}>Anular venta</Text>
            <Text style={styles.deleteSaleCopy}>Se quitará esta operación del reporte y se anulará en el servidor si ya estaba sincronizada.</Text>
            <Text style={styles.muted}>{reportDateLabel(saleDeleteTarget.createdAt, 'dia')} · {saleTime(saleDeleteTarget.createdAt)} · {saleDeleteTarget.seller || 'Sin nombre'} · {money(saleDeleteTarget.total)}</Text>
            {saleDeleteError ? <View style={styles.deleteSaleError}><Text style={styles.deleteSaleErrorText}>{saleDeleteError}</Text></View> : null}
            <View style={styles.saleDetailActions}>
              <Pressable onPress={() => setSaleDeleteTarget(null)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
              <Pressable disabled={Boolean(cancellingSaleId)} onPress={async () => {
                try {
                  await deleteSale(saleDeleteTarget);
                  await loadReport(reportPeriod, reportOrigin);
                  setSaleDeleteTarget(null);
                  setSelectedSale(null);
                } catch (error: any) {
                  setSaleDeleteError(error?.message || 'No se pudo anular la venta.');
                }
              }} style={({ pressed }) => [styles.productDeleteConfirmButton, Boolean(cancellingSaleId) && styles.buttonDisabled, pressed && styles.buttonPressed]}>
                <Text style={styles.productDeleteConfirmText}>{cancellingSaleId ? 'Anulando…' : 'Anular venta'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {editingSale ? (
        <SaleEditorModal
          key={editingSale.id}
          sale={editingSale}
          desktop={isDesktop}
          onClose={() => setEditingSale(null)}
          onSave={async (seller, items) => {
            await updateSale(editingSale, seller, items);
            const next = { ...editingSale, seller, items, total: items.reduce((sum: number, item: any) => sum + Number(item.quantity) * Number(item.price), 0) };
            setSelectedSale(next);
            setEditingSale(null);
          }}
        />
      ) : null}

      {productCreatorOpen ? (
        <ProductCreatorModal
          desktop={isDesktop}
          onClose={() => setProductCreatorOpen(false)}
          onCreate={createProduct}
          categories={categories}
          products={products}
        />
      ) : null}

      {editingProduct ? (
        <ProductEditModal
          key={String(editingProduct.id)}
          product={editingProduct}
          desktop={isDesktop}
          onClose={() => setEditingProduct(null)}
          onSave={async (input) => {
            await updateProduct(editingProduct.id, input);
            setEditingProduct(null);
          }}
        />
      ) : null}

      {productPendingDeletion ? (
        <ProductDeleteModal
          product={productPendingDeletion}
          desktop={isDesktop}
          onClose={() => setProductPendingDeletion(null)}
          onDelete={deleteProductPermanently}
          onDeleted={(product) => {
            setProductPendingDeletion(null);
            setProductDeleteMessage(`“${product.name}” fue eliminado del catálogo.`);
          }}
        />
      ) : null}

      {historyModalOpen ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setHistoryModalOpen(false)} style={styles.dayModalDismiss} />
          <View style={[styles.historyModalCard, isDesktop && styles.desktopHistoryModalCard]}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>HISTORIAL COMPLETO</Text><Text style={styles.dayModalTitle} numberOfLines={1}>Ventas guardadas</Text></View>
              <Pressable onPress={() => setHistoryModalOpen(false)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            <ScrollView style={styles.historyModalList}>{visibleSales.map((sale) => <View key={sale.id} style={styles.historyModalItem}><SaleRow sale={sale} onPress={() => { setHistoryModalOpen(false); setSelectedSale(sale); }} onDelete={() => cancelSale(sale)} /></View>)}</ScrollView>
          </View>
        </View>
      ) : null}

      {cart.length > 0 && !cartOpen && screen === 'sale' ? (
          <Pressable onPress={() => setCartOpen(true)} style={({ pressed }) => [styles.cartFab, isDesktop && styles.desktopCartFab, { bottom: isDesktop ? 28 : 96 + insets.bottom }, pressed && styles.buttonPressed]}>
          <Text style={styles.cartFabText}>Ver carrito · {cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'producto' : 'productos'}</Text>
          <Text style={styles.cartFabTotal}>{money(cartTotal)}</Text>
        </Pressable>
      ) : null}

      {cartOpen ? <>
        <Pressable accessibilityLabel="Cerrar pedido" onPress={() => setCartOpen(false)} style={[styles.sheetBackdrop, !isDesktop && styles.mobileSheetBackdrop]} />
        {isDesktop ? <DesktopCartModal cart={cart} total={cartTotal} paymentMethod={paymentMethod} paymentConfig={paymentConfig} submitting={saleSubmitting} onPaymentMethod={setPaymentMethod} onClose={() => setCartOpen(false)} onAdd={addProduct} onRemoveOne={removeOne} onConfirm={confirmSale} /> : <CartSheet cart={cart} total={cartTotal} paymentMethod={paymentMethod} paymentConfig={paymentConfig} submitting={saleSubmitting} onPaymentMethod={setPaymentMethod} safeBottom={insets.bottom} onClose={() => setCartOpen(false)} onAdd={addProduct} onRemoveOne={removeOne} onConfirm={confirmSale} />}
      </> : null}
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
              <Pressable onPress={() => setScannerOpen(false)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
              <Text style={styles.secondaryText}>Cerrar escáner</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {!isWide ? <BottomNav screen={screen} setScreen={(next: Screen) => navigateTo(next)} safeBottom={insets.bottom} /> : null}
    </View>
  </View>
  );
}

function DesktopCartModal({ cart, total, paymentMethod, paymentConfig, submitting, onPaymentMethod, onClose, onAdd, onRemoveOne, onConfirm }: { cart: CartItem[]; total: number; paymentMethod: 'cash' | 'digital'; paymentConfig: { yapeEnabled: boolean; plinEnabled: boolean; bbvaEnabled: boolean; yapeQrUri?: string; plinQrUri?: string; bbvaQrUri?: string }; submitting: boolean; onPaymentMethod: (method: 'cash' | 'digital') => void; onClose: () => void; onAdd: (product: Product) => void; onRemoveOne: (product: CartItem) => void; onConfirm: (provider?: PaymentProvider) => void }) {
  const [digitalProvider, setDigitalProvider] = useState<PaymentProvider>('yape');
  const [qrExpanded, setQrExpanded] = useState(false);
  const digitalOptions = [
    { key: 'yape' as const, label: 'Yape', enabled: paymentConfig.yapeEnabled, uri: paymentConfig.yapeQrUri },
    { key: 'plin' as const, label: 'Plin', enabled: paymentConfig.plinEnabled, uri: paymentConfig.plinQrUri },
    { key: 'bbva' as const, label: 'BBVA', enabled: paymentConfig.bbvaEnabled, uri: paymentConfig.bbvaQrUri },
  ];
  const activeDigital = digitalOptions.find((item) => item.key === digitalProvider && item.enabled) || digitalOptions.find((item) => item.enabled) || digitalOptions[0];
  useEffect(() => {
    if (!digitalOptions.some((item) => item.key === digitalProvider && item.enabled)) {
      const next = digitalOptions.find((item) => item.enabled);
      if (next) setDigitalProvider(next.key);
    }
  }, [paymentConfig.yapeEnabled, paymentConfig.plinEnabled, paymentConfig.bbvaEnabled, digitalProvider]);
  return (
    <View style={styles.pcCheckoutOverlay}>
      <View style={styles.pcCheckoutModal}>
        <View style={styles.pcCheckoutHeader}>
          <View><Text style={styles.eyebrow}>VENTA ACTUAL</Text><Text style={styles.pcCheckoutTitle}>Confirmar venta</Text><Text style={styles.pcCheckoutSubtitle}>Revisa el pedido y elige cómo recibiste el pago.</Text></View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}><X size={20} color="#174f42" /></Pressable>
        </View>
        <View style={styles.pcCheckoutBody}>
          <View style={styles.pcOrderPanel}>
            <View style={styles.pcPanelHeading}><Text style={styles.pcPanelTitle}>Productos seleccionados</Text><Text style={styles.pcPanelCount}>{cart.reduce((sum, item) => sum + item.quantity, 0)} unidades</Text></View>
            <ScrollView style={styles.pcOrderList}>
              {cart.map((item) => (
                <View key={String(item.id)} style={styles.pcOrderRow}>
                  <View style={styles.rowText}><Text style={styles.pcOrderName} numberOfLines={2}>{item.name}</Text><Text style={styles.muted}>{money(Number(item.price))} por unidad</Text></View>
                  <Text style={styles.pcOrderLineTotal}>{money(Number(item.price) * item.quantity)}</Text>
                  <Pressable onPress={() => onRemoveOne(item)} style={[styles.stepper, styles.stepperMinus]}><Minus size={17} color="#a74035" /></Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable onPress={() => onAdd(item)} style={[styles.stepper, styles.stepperPlus]}><Plus size={17} color="#174f42" /></Pressable>
                </View>
              ))}
            </ScrollView>
            <View style={styles.pcOrderTotal}><Text style={styles.pcOrderTotalLabel}>Total de la venta</Text><Text style={styles.pcOrderTotalValue}>{money(total)}</Text></View>
          </View>
          <View style={styles.pcPaymentPanel}>
            <Text style={styles.pcPanelTitle}>Medio de pago</Text>
            <View style={styles.pcPaymentTabs}>
              <Pressable onPress={() => onPaymentMethod('cash')} style={[styles.pcPaymentTab, paymentMethod === 'cash' && styles.pcPaymentTabCash]}><WalletCards size={18} color={paymentMethod === 'cash' ? '#141a18' : '#6a716d'} /><Text style={styles.pcPaymentTabText}>Efectivo</Text></Pressable>
              <Pressable disabled={!digitalOptions.some((item) => item.enabled)} onPress={() => onPaymentMethod('digital')} style={[styles.pcPaymentTab, paymentMethod === 'digital' && styles.pcPaymentTabDigital, !digitalOptions.some((item) => item.enabled) && styles.segmentDisabled]}><WalletCards size={18} color={paymentMethod === 'digital' ? '#141a18' : '#6a716d'} /><Text style={styles.pcPaymentTabText}>Digital</Text></Pressable>
            </View>
            {paymentMethod === 'digital' ? <>
              <View style={styles.pcDigitalChoices}>{digitalOptions.filter((item) => item.enabled).map((item) => <Pressable key={item.key} onPress={() => setDigitalProvider(item.key)} style={[styles.pcDigitalChoice, digitalProvider === item.key && styles.pcDigitalChoiceActive]}><Text style={styles.pcDigitalChoiceText}>{item.label}</Text></Pressable>)}</View>
              <Text style={styles.pcQrTitle}>QR de {activeDigital.label}</Text>
              <Pressable onPress={() => setQrExpanded(true)} style={styles.pcQrFrame}>{activeDigital.uri ? <Image source={{ uri: activeDigital.uri }} style={styles.pcQrImage} resizeMode="contain" /> : activeDigital.key === 'yape' ? <Image source={require('../yape-qr.jpg')} style={styles.pcQrImage} resizeMode="contain" /> : <Text style={styles.qrMissingText}>Configura el QR en Ajustes</Text>}<View style={styles.qrExpandBadge}><Maximize2 size={15} color="#174f42" /></View></Pressable>
              <Text style={styles.pcPaymentHint}>Escanea para pagar {money(total)}</Text>
            </> : <View style={styles.pcCashHint}><Text style={styles.pcCashHintTitle}>Pago en efectivo</Text><Text style={styles.muted}>Recibe {money(total)} y confirma para guardar la venta.</Text></View>}
          </View>
        </View>
        <Pressable disabled={submitting} onPress={() => onConfirm(paymentMethod === 'digital' ? activeDigital.key : 'cash')} style={({ pressed }) => [styles.pcConfirmButton, submitting && styles.buttonDisabled, pressed && styles.buttonPressed]}><Text style={styles.pcConfirmText}>{submitting ? 'Guardando venta…' : paymentMethod === 'digital' ? 'Guardar venta pagada' : 'Confirmar venta'}</Text></Pressable>
      </View>
      {qrExpanded ? <View style={styles.pcQrOverlay}><Pressable onPress={() => setQrExpanded(false)} style={styles.pcQrDismiss} /><View style={styles.pcQrExpandedCard}><View style={styles.pcCheckoutHeader}><Text style={styles.pcPanelTitle}>QR de {activeDigital.label}</Text><Pressable onPress={() => setQrExpanded(false)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable></View>{activeDigital.uri ? <Image source={{ uri: activeDigital.uri }} style={styles.pcQrExpandedImage} resizeMode="contain" /> : activeDigital.key === 'yape' ? <Image source={require('../yape-qr.jpg')} style={styles.pcQrExpandedImage} resizeMode="contain" /> : <Text style={styles.qrMissingText}>Sin QR configurado</Text>}<Text style={styles.pcPaymentHint}>Total {money(total)}</Text></View></View> : null}
    </View>
  );
}

function ProductCreatorModal({ desktop, onClose, onCreate, categories, products }: { desktop: boolean; onClose: () => void; categories: string[]; products: Product[]; onCreate: (input: { name: string; price: number; category: string; description: string; presentationType: string; presentationQuantity: number; presentationLabel: string; presentationColor: string; imageData?: string; imageMimeType?: string }) => Promise<unknown> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Otros');
  const [unitPrice, setUnitPrice] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [boxPrice, setBoxPrice] = useState('');
  const [packEnabled, setPackEnabled] = useState(false);
  const [boxEnabled, setBoxEnabled] = useState(false);
  const [packQuantity, setPackQuantity] = useState('6');
  const [boxQuantity, setBoxQuantity] = useState('12');
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [imageUri, setImageUri] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const successScale = useRef(new Animated.Value(0.82)).current;
  const categoryQuery = category.trim().toLowerCase();
  const matchingCategories = categories.filter((item) => item.toLowerCase().includes(categoryQuery)).slice(0, 6);
  const exactCategory = categories.some((item) => item.trim().toLowerCase() === categoryQuery);
  const nameQuery = name.trim().toLowerCase();
  const matchingProducts = nameQuery.length < 2 ? [] : products.filter((item) => item.name.toLowerCase().includes(nameQuery)).slice(0, 5);
  const exactProduct = products.some((item) => item.name.trim().toLowerCase() === nameQuery);
  const useExistingProduct = (item: Product) => {
    setName(item.name);
    setCategory(item.category || 'Otros');
    if (item.presentationType === 'pack') { setPackEnabled(true); setPackPrice(String(item.price)); if (item.presentationQuantity) setPackQuantity(String(item.presentationQuantity)); }
    else if (item.presentationType === 'box') { setBoxEnabled(true); setBoxPrice(String(item.price)); if (item.presentationQuantity) setBoxQuantity(String(item.presentationQuantity)); }
    else setUnitPrice(String(item.price));
    setNameFocused(false);
  };
  const openCategoryPicker = () => {
    setCategoryDraft(category);
    setCategoryFocused(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85, selectionLimit: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.uri) return;
    setImageUri(asset.uri);
    setImageMimeType(asset.mimeType || 'image/jpeg');
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setImageData(dataUrl);
    } catch {
      setImageData('');
    }
  };

  const save = async () => {
    const cleanName = name.trim();
    const entries = [
      { type: 'unit', label: 'Unidad', color: 'unit', price: Number(unitPrice.replace(',', '.')), quantity: 1 },
      ...(packEnabled ? [{ type: 'pack', label: 'Pack', color: 'pack', price: Number(packPrice.replace(',', '.')), quantity: Math.max(1, Math.floor(Number(packQuantity) || 1)) }] : []),
      ...(boxEnabled ? [{ type: 'box', label: 'Caja', color: 'box', price: Number(boxPrice.replace(',', '.')), quantity: Math.max(1, Math.floor(Number(boxQuantity) || 1)) }] : []),
    ];
    if (!cleanName || entries.some((entry) => !Number.isFinite(entry.price) || entry.price < 0)) {
      Alert.alert('Completa el producto', 'Escribe un nombre y un precio válido.');
      return;
    }
    setSaving(true);
    try {
      for (const entry of entries) {
        await onCreate({ name: cleanName, price: entry.price, category: category.trim() || 'Otros', description: `Producto ${cleanName}`, presentationType: entry.type, presentationQuantity: entry.quantity, presentationLabel: entry.type === 'unit' ? 'Unidad' : `${entry.label} x${entry.quantity}`, presentationColor: entry.color, imageData: imageData || undefined, imageMimeType: imageMimeType || undefined });
      }
      setCreated(true);
      Animated.spring(successScale, { toValue: 1, damping: 12, stiffness: 180, useNativeDriver: true }).start();
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.message || 'Revisa la conexión con la computadora.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.dayModalOverlay}>
      <Pressable onPress={onClose} style={styles.dayModalDismiss} />
      <View style={[styles.dayModalCard, desktop && styles.desktopModalCard, styles.productCreatorModal]}>
        {created ? (
          <Animated.View style={[styles.productCreatedState, { transform: [{ scale: successScale }] }]}>
            <View style={styles.productSuccessMark}><Text style={styles.productSuccessMarkText}>✓</Text></View>
            <Text style={styles.productCreatedTitle}>Producto cargado</Text>
            <Text style={styles.muted}>“{name.trim()}” ya está disponible en el catálogo.</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}><Text style={styles.primaryText}>Entendido</Text></Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>ALTA DE PRODUCTO</Text><Text style={styles.dayModalTitle}>Agregar producto</Text></View>
              <Pressable onPress={onClose} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            <Text style={styles.muted}>Completa los datos. La imagen es opcional y se guardará junto al producto.</Text>
            <ScrollView style={styles.productCreatorScroll} contentContainerStyle={styles.productCreatorContent} showsVerticalScrollIndicator={false}>
              <View style={desktop ? styles.productFormColumns : undefined}>
                <View style={styles.productFormFields}>
                  <Text style={styles.formLabel}>Nombre del producto *</Text>
                  <TextInput value={name} onChangeText={setName} onFocus={() => setNameFocused(true)} placeholder="Ej. Gaseosa personal" style={styles.input} autoFocus />
                  {nameFocused && nameQuery.length >= 2 ? <View style={styles.inlineSuggestions}>{matchingProducts.map((item) => <Pressable key={String(item.id)} onPress={() => useExistingProduct(item)} style={styles.categorySuggestion}><Text style={styles.categorySuggestionText}>{item.name}</Text><Text style={styles.suggestionMeta}>{item.presentationLabel || 'Presentación'} · S/ {Number(item.price).toFixed(2)}</Text></Pressable>)}{!exactProduct ? <Pressable onPress={() => setNameFocused(false)} style={styles.categoryNewSuggestion}><Text style={styles.categoryNewIcon}>＋</Text><View style={styles.rowText}><Text style={styles.categoryNewTitle}>Nuevo producto</Text><Text style={styles.categoryNewName}>“{name.trim()}”</Text></View></Pressable> : null}</View> : null}
                  <View style={styles.productFormRow}>
                    <View style={styles.productFormHalf}><Text style={styles.formLabel}>Categoría</Text><Pressable onPress={openCategoryPicker} style={styles.categoryInputRow}><Text style={[styles.categoryTextValue, !category && styles.categoryPlaceholder]} numberOfLines={1}>{category || 'Escribe o elige'}</Text><View style={styles.categoryChevron}><Text style={styles.categoryChevronText}>⌄</Text></View></Pressable></View>
                  </View>
                  <Text style={styles.formLabel}>Presentaciones y precios</Text>
                  <View style={styles.presentationPriceList}>
                    <View style={styles.presentationPriceRow}><View style={[styles.presentationTypePill, styles.presentationUnitPill]}><Text style={styles.presentationPriceLabel}>Unidad</Text></View><View style={styles.currencyInput}><Text style={styles.currencyPrefix}>S/</Text><TextInput value={unitPrice} onChangeText={setUnitPrice} placeholder="0.00" placeholderTextColor="#89918c" keyboardType="decimal-pad" style={styles.currencyTextInput} /></View></View>
                    <View style={styles.presentationPriceRow}><Pressable onPress={() => setPackEnabled((current) => !current)} style={[styles.presentationTypePill, styles.presentationPackPill, !packEnabled && styles.presentationTypePillOff]}><Text style={styles.presentationPriceLabel}>Pack</Text></Pressable><TextInput value={packQuantity} onChangeText={setPackQuantity} editable={packEnabled} keyboardType="number-pad" style={[styles.presentationQuantityInput, !packEnabled && styles.inputLocked]} /><View style={styles.currencyInput}><Text style={styles.currencyPrefix}>S/</Text><TextInput value={packPrice} onChangeText={setPackPrice} editable={packEnabled} placeholder="0.00" placeholderTextColor="#89918c" keyboardType="decimal-pad" style={styles.currencyTextInput} /></View></View>
                    <View style={styles.presentationPriceRow}><Pressable onPress={() => setBoxEnabled((current) => !current)} style={[styles.presentationTypePill, styles.presentationBoxPill, !boxEnabled && styles.presentationTypePillOff]}><Text style={styles.presentationPriceLabel}>Caja</Text></Pressable><TextInput value={boxQuantity} onChangeText={setBoxQuantity} editable={boxEnabled} keyboardType="number-pad" style={[styles.presentationQuantityInput, !boxEnabled && styles.inputLocked]} /><View style={styles.currencyInput}><Text style={styles.currencyPrefix}>S/</Text><TextInput value={boxPrice} onChangeText={setBoxPrice} editable={boxEnabled} placeholder="0.00" placeholderTextColor="#89918c" keyboardType="decimal-pad" style={styles.currencyTextInput} /></View></View>
                  </View>
                </View>
                <View style={styles.productImageBox}>
                  {imageUri ? <Image source={{ uri: imageUri }} style={styles.productImagePreview} resizeMode="cover" /> : <View style={styles.productImagePlaceholder}><Package size={30} color="#58917b" /><Text style={styles.productImagePlaceholderText}>Sin imagen</Text></View>}
                  <Pressable onPress={() => void pickImage()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}><Text style={styles.secondaryText}>{imageUri ? 'Cambiar imagen' : 'Cargar imagen opcional'}</Text></Pressable>
                </View>
              </View>
            </ScrollView>
            <View style={styles.productCreatorActions}>
              <Pressable onPress={onClose} disabled={saving} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
              <Pressable onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}><Text style={styles.primaryText}>{saving ? 'Guardando producto…' : 'Guardar producto'}</Text></Pressable>
            </View>
          </>
        )}
      </View>
      {categoryFocused ? <CategoryPickerModal categories={categories} value={categoryDraft} onChange={setCategoryDraft} onClose={() => setCategoryFocused(false)} onSelect={(value) => { setCategory(value); setCategoryFocused(false); }} /> : null}
    </View>
  );
}

function CategoryPickerModal({ categories, value, onChange, onClose, onSelect }: { categories: string[]; value: string; onChange: (value: string) => void; onClose: () => void; onSelect: (value: string) => void }) {
  const query = value.trim().toLowerCase();
  const matches = categories.filter((item) => item.toLowerCase().includes(query)).slice(0, 8);
  const exact = categories.some((item) => item.trim().toLowerCase() === query);
  return (
    <View style={styles.categoryPickerOverlay}>
      <Pressable onPress={onClose} style={styles.categoryPickerDismiss} />
      <View style={styles.categoryPickerCard}>
        <View style={styles.dayModalHeader}><View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>CATEGORÍA</Text><Text style={styles.categoryPickerTitle}>Elige o crea una</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={19} color="#174f42" /></Pressable></View>
        <TextInput value={value} onChangeText={onChange} placeholder="Buscar o escribir categoría" autoFocus style={styles.input} />
        <ScrollView style={styles.categoryPickerList} showsVerticalScrollIndicator={false}>
          {matches.map((item) => <Pressable key={item} onPress={() => onSelect(item)} style={styles.categoryPickerItem}><Text style={styles.categoryPickerItemText}>{item}</Text></Pressable>)}
          {value.trim() && !matches.length ? <Pressable onPress={() => onSelect(value.trim())} style={styles.categoryPickerNew}><Text style={styles.categoryNewIcon}>＋</Text><View style={styles.rowText}><Text style={styles.categoryNewTitle}>Crear categoría nueva</Text><Text style={styles.categoryNewName}>“{value.trim()}”</Text></View></Pressable> : null}
          {!matches.length && !value.trim() ? <Text style={styles.categoryEmpty}>Escribe para ver categorías existentes</Text> : null}
        </ScrollView>
      </View>
    </View>
  );
}

function ProductDeleteModal({ product, desktop, onClose, onDelete, onDeleted }: { product: Product; desktop: boolean; onClose: () => void; onDelete: (id: Product['id']) => Promise<unknown>; onDeleted: (product: Product) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(product.id);
      onDeleted(product);
    } catch (reason: any) {
      setError(reason?.message || 'No se pudo eliminar. Revisa la conexión e inténtalo nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.dayModalOverlay}>
      <Pressable onPress={onClose} disabled={deleting} style={styles.dayModalDismiss} />
      <View style={[styles.dayModalCard, desktop && styles.desktopModalCard, styles.productDeleteModal]}>
        <View style={styles.dayModalHeader}>
          <View style={styles.dayModalHeaderCopy}>
            <Text style={styles.eyebrow}>ELIMINAR PRODUCTO</Text>
            <Text style={styles.dayModalTitle}>¿Eliminar “{product.name}”?</Text>
          </View>
          <Pressable onPress={onClose} disabled={deleting} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
        </View>
        <Text style={styles.muted}>Se eliminarán permanentemente todas sus presentaciones. Las ventas históricas conservarán sus datos.</Text>
        {error ? <View style={styles.productDeleteError}><Text style={styles.productDeleteErrorText}>{error}</Text></View> : null}
        <View style={styles.productCreatorActions}>
          <Pressable onPress={onClose} disabled={deleting} style={({ pressed }) => [styles.secondaryButton, deleting && styles.buttonDisabled, pressed && styles.buttonPressed]}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
          <Pressable onPress={() => void remove()} disabled={deleting} style={({ pressed }) => [styles.productDeleteConfirmButton, deleting && styles.buttonDisabled, pressed && styles.buttonPressed]}><Text style={styles.productDeleteConfirmText}>{deleting ? 'Eliminando…' : 'Eliminar permanentemente'}</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function ProductEditModal({ product, desktop, onClose, onSave }: { product: Product; desktop: boolean; onClose: () => void; onSave: (input: { name: string; price: number; category: string; description: string; presentationType: string; presentationQuantity: number; presentationLabel: string; presentationColor: string }) => Promise<void> }) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category || 'Otros');
  const [price, setPrice] = useState(String(product.price ?? ''));
  const [description, setDescription] = useState(product.description || '');
  const [presentationType, setPresentationType] = useState(product.presentationType || 'unit');
  const [presentationQuantity, setPresentationQuantity] = useState(String(product.presentationQuantity || 1));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanName = name.trim();
    const numericPrice = Number(price.replace(',', '.'));
    if (!cleanName || !Number.isFinite(numericPrice) || numericPrice < 0) {
      Alert.alert('Completa el producto', 'Escribe un nombre y un precio válido.');
      return;
    }
    setSaving(true);
    try {
      const labels: Record<string, string> = { unit: 'Unidad', pack: 'Pack', box: 'Caja' };
      const typeLabel = labels[presentationType] || 'Unidad';
      await onSave({ name: cleanName, price: numericPrice, category: category.trim() || 'Otros', description: description.trim() || `Producto ${cleanName}`, presentationType, presentationQuantity: Math.max(1, Math.floor(Number(presentationQuantity) || 1)), presentationLabel: presentationType === 'unit' ? 'Unidad' : `${typeLabel} x${Math.max(1, Math.floor(Number(presentationQuantity) || 1))}`, presentationColor: presentationType });
    } catch (error: any) {
      Alert.alert('No se pudo actualizar', error?.message || 'Revisa la conexión con la computadora.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.dayModalOverlay}>
      <Pressable onPress={onClose} style={styles.dayModalDismiss} />
      <View style={[styles.dayModalCard, desktop && styles.desktopModalCard, styles.productEditModal]}>
        <View style={styles.dayModalHeader}>
          <View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>EDITAR PRODUCTO</Text><Text style={styles.dayModalTitle}>Actualizar catálogo</Text></View>
          <Pressable onPress={onClose} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
        </View>
        <Text style={styles.muted}>Los cambios se aplican al catálogo para las próximas ventas. El historial permanece intacto.</Text>
        <ScrollView style={styles.productEditScroll} contentContainerStyle={styles.productCreatorContent}>
          <Text style={styles.formLabel}>Nombre del producto *</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} autoFocus />
          <View style={styles.productFormRow}>
            <View style={styles.productFormHalf}><Text style={styles.formLabel}>Precio *</Text><TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} /></View>
            <View style={styles.productFormHalf}><Text style={styles.formLabel}>Categoría</Text><TextInput value={category} onChangeText={setCategory} style={styles.input} /></View>
          </View>
          <Text style={styles.formLabel}>Presentación</Text>
          <View style={styles.presentationOptionRow}>{[['unit', 'Unidad'], ['pack', 'Pack'], ['box', 'Caja']].map(([key, label]) => <Pressable key={key} onPress={() => setPresentationType(key)} style={[styles.presentationOption, key === 'unit' ? styles.presentationUnitPill : key === 'pack' ? styles.presentationPackPill : styles.presentationBoxPill, presentationType === key && styles.presentationOptionActive]}><Text style={styles.presentationOptionText}>{label}</Text></Pressable>)}</View>
          <View style={styles.presentationQuantityRow}><View style={styles.productFormHalf}><Text style={styles.formLabel}>Cantidad</Text><TextInput value={presentationQuantity} onChangeText={setPresentationQuantity} editable={presentationType !== 'unit'} keyboardType="number-pad" style={[styles.input, presentationType === 'unit' && styles.inputLocked]} /></View></View>
          <Text style={styles.formLabel}>Descripción</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.productDescriptionInput]} multiline />
        </ScrollView>
        <View style={styles.productCreatorActions}>
          <Pressable onPress={onClose} disabled={saving} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}><Text style={styles.secondaryText}>Cancelar</Text></Pressable>
          <Pressable onPress={() => void save()} disabled={saving} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}><Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function SaleEditorModal({ sale, desktop, onClose, onSave }: { sale: OfflineSale; desktop?: boolean; onClose: () => void; onSave: (seller: string, items: any[]) => Promise<void> }) {
  const [seller, setSeller] = useState(sale.seller || '');
  const [items, setItems] = useState(() => sale.items.map((item: any) => ({ id: item.id, name: String(item.name || 'Producto'), quantity: String(item.quantity || 1), price: String(item.price ?? item.unitPrice ?? 0) })));
  const [saving, setSaving] = useState(false);
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  const updateItem = (index: number, field: 'name' | 'quantity' | 'price', value: string) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  const save = async () => {
    setSaving(true);
    try {
      await onSave(seller.trim(), items.map((item) => ({ ...item, quantity: Number(item.quantity), price: Number(item.price) })));
    } catch (error: any) {
      Alert.alert('No se pudo actualizar', error?.message || 'Revisa los datos de la venta.');
    } finally { setSaving(false); }
  };
  return (
    <View style={styles.dayModalOverlay}>
      <Pressable onPress={onClose} style={styles.dayModalDismiss} />
      <View style={[styles.dayModalCard, desktop && styles.desktopModalCard]}>
        <View style={styles.dayModalHeader}>
          <View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>EDITAR VENTA</Text><Text style={styles.dayModalTitle}>Vendedor y productos</Text></View>
          <Pressable onPress={onClose} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
        </View>
        <ScrollView style={styles.daySalesList}>
          <Text style={styles.muted}>Vendedor</Text>
          <TextInput value={seller} onChangeText={setSeller} style={styles.input} placeholder="Nombre del vendedor" />
          {items.map((item, index) => (
            <View key={`${sale.id}-edit-${index}`} style={styles.saleDetailRow}>
              <View style={styles.rowText}>
                <TextInput value={item.name} onChangeText={(value) => updateItem(index, 'name', value)} style={styles.input} placeholder="Producto" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={item.quantity} onChangeText={(value) => updateItem(index, 'quantity', value)} keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} placeholder="Cantidad" />
                  <TextInput value={item.price} onChangeText={(value) => updateItem(index, 'price', value)} keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} placeholder="Precio" />
                </View>
              </View>
              {items.length > 1 ? <Pressable onPress={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.deleteSaleText}>Quitar</Text></Pressable> : null}
            </View>
          ))}
          <Pressable onPress={() => setItems((current) => [...current, { id: undefined, name: '', quantity: '1', price: '0' }])} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Agregar producto</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.dayModalTotal}><Text style={styles.dayModalTotalLabel}>Nuevo total</Text><Text style={styles.dayModalTotalValue}>{money(total)}</Text></View>
        <Pressable onPress={save} disabled={saving} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
          <Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
