import { useEffect, useState } from 'react';
import { Image, Keyboard, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Package, ReceiptText, Search, X } from 'lucide-react-native';
import { money, reportDateLabel, reportPeriodLabel, saleTime, shortDate, type ReportPeriod, type Screen } from './domain';
import { BottomNav, CartSheet, CartSummary, DesktopNav, Empty, Kpi, ProductCard, RankRow, SaleRow, SectionTitle, Stat, styles, screenTitle } from './ui';
import type { usePapachitoApp } from './usePapachitoApp';
import type { OfflineSale } from './offline';

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
  const { insets,isWide,isNarrow,productCardWidth,booting,hasProfile,setupName,sellerName,settingsName,screen,products,cart,sales,online,apiBase,loadingCatalog,search,category,cartOpen,paymentMethod,reportPeriod,remoteReport,calendarSaleCounts,reportLoading,scannerOpen,searchingServer,lastSyncAt,simpleView,paymentConfig,savedApiBases,addedProductPulse,availableUpdate,updateChecking,updateInstalling,installedVersion,installedVersionCode,pendingCount,cartTotal,categories,searchText,filteredProducts,filteredSales,visibleSales,searchResults,todaySales,todayTotal,reportTotal,reportDays,maxReport,bestDay,topProducts,paymentBreakdown,sellerBreakdown,maxProductTotal,maxPaymentTotal,maxSellerTotal,reportSummary,reportSeries,reportMax,cameraPermission,requestCameraPermission,setSetupName,setSellerName,setSettingsName,setScreen,setProducts,setCart,setSales,setOnline,setApiBaseState,setLoadingCatalog,setSearch,setCategory,setCartOpen,setPaymentMethod,setReportPeriod,setRemoteReport,setReportLoading,setScannerOpen,setSearchingServer,setLastSyncAt,toggleSimpleView,togglePaymentMethod,pickPaymentQr,removePaymentQr,navigateTo,refreshSales,cancelSale,simulateSale,loadCatalog,loadSalesForDate,syncNow,openScanner,connectFromQr,loadReport,continueSetup,saveSettingsName,saveServer,checkForUpdate,installUpdate,addProduct,removeOne,removeProduct,confirmSale,selectSearchResult } = app;
  const [searchFocused, setSearchFocused] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDaySales, setSelectedDaySales] = useState<OfflineSale[]>([]);
  const [daySalesLoading, setDaySalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<OfflineSale | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [productRenderLimit, setProductRenderLimit] = useState(20);
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
  const calendarCounts = { ...calendarSaleCounts, ...Object.fromEntries(sales.map((sale) => [sale.createdAt.slice(0, 10), Math.max(calendarSaleCounts[sale.createdAt.slice(0, 10)] || 0, 1)])) };
  const calendarMonthLabel = calendarMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
  const todayKey = new Date().toISOString().slice(0, 10);
  const historyToday = visibleSales.filter((sale) => sale.createdAt.slice(0, 10) === todayKey && sale.status === 'synced');
  const historyPending = visibleSales.filter((sale) => sale.status !== 'synced');
  const historyOlder = visibleSales.filter((sale) => sale.createdAt.slice(0, 10) !== todayKey && sale.status === 'synced');
  const historyPreview = [...historyToday, ...historyPending, ...historyOlder].slice(0, 5);
  const openReportDay = async (date: string) => {
    setSelectedDay(date);
    setSelectedDaySales([]);
    setDaySalesLoading(true);
    const result = await loadSalesForDate(date);
    setSelectedDaySales(result);
    setDaySalesLoading(false);
  };
  return (
  <View style={styles.safe}>
    <View style={[styles.shell, isWide && styles.shellWide, isWide && styles.shellDesktop]}>
      {isWide ? <DesktopNav screen={screen} setScreen={(next: Screen) => navigateTo(next)} sellerName={sellerName} online={online} /> : null}
      <View style={[styles.header, isNarrow && styles.headerCompact, { paddingTop: Math.max(insets.top + 8, isNarrow ? 18 : 28) }]}>
        <Image source={require('../papachito-logo.jpg')} style={styles.headerLogo} />
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

      {screen !== 'settings' && screen !== 'payments' ? <View style={styles.searchArea}>
        <View style={[styles.globalSearch, isNarrow && styles.globalSearchCompact, searchFocused && styles.globalSearchFocused]}>
          <Search size={21} color={searchFocused ? '#174f42' : '#89918c'} strokeWidth={2.2} />
              <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={screen === 'history' ? 'Buscar producto, vendedor o fecha' : screen === 'report' ? 'Buscar en reportes' : 'Buscar producto o boleta'}
            style={styles.searchInput}
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
                  <Text style={styles.searchEmptyText}>La búsqueda solo muestra productos y boletas.</Text>
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
                    <Text style={[styles.resultTagText, result.type === 'sale' && styles.resultTagTextSale]}>{result.type === 'product' ? 'Producto' : 'Boleta'}</Text>
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

      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, isNarrow && styles.contentCompact, { paddingBottom: 184 + insets.bottom }]}>
        {screen === 'sale' && (
        <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <SectionTitle eyebrow="CATALOGO" title="Productos" right={loadingCatalog ? 'Cargando' : `${filteredProducts.length} productos`} />
              {searchingServer ? <Text style={styles.connectionHint}>Actualizando catálogo…</Text> : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((item) => (
                    <Pressable key={item} onPress={() => setCategory(item)} style={({ pressed }) => [styles.chip, category === item && styles.chipActive, pressed && styles.buttonPressed]}>
                    <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {filteredProducts.length === 0 ? (
                <Empty title="No hay productos" copy="Limpia la busqueda o cambia de categoria." />
              ) : (
                <View style={styles.productGrid}>
                  {filteredProducts.slice(0, productRenderLimit).map((item) => <ProductCard key={String(item.id)} item={item} width={productCardWidth} simpleView={simpleView} highlighted={addedProductPulse.startsWith(`${String(item.id)}-`)} onPress={addProduct} />)}
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
              <Empty title={searchText ? 'Sin boletas' : 'No hay ventas'} copy={searchText ? 'No hay historial que coincida con la busqueda.' : 'Las ventas guardadas apareceran aqui.'} />
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
              <View style={styles.periodTabs}>
                {(['dia', 'mes', 'ano', 'historico'] as ReportPeriod[]).map((period) => (
                    <Pressable key={period} onPress={() => setReportPeriod(period)} style={({ pressed }) => [styles.periodTab, reportPeriod === period && styles.periodTabActive, pressed && styles.buttonPressed]}>
                    <Text style={[styles.periodTabText, reportPeriod === period && styles.periodTabTextActive]}>{period === 'dia' ? 'Diario' : period === 'mes' ? 'Mensual' : period === 'ano' ? 'Anual' : 'Histórico'}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.calendarPanel}>
                <View style={styles.calendarHeader}>
                  <View style={styles.rowText}>
                    <Text style={styles.eyebrow}>CALENDARIO</Text>
                    <Text style={styles.calendarTitle}>{calendarMonthLabel}</Text>
                  </View>
                  <View style={styles.calendarNav}>
                    <Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.buttonPressed]}><ChevronLeft size={18} color="#174f42" /></Pressable>
                    <Pressable onPress={() => setCalendarMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.buttonPressed]}><ChevronRight size={18} color="#174f42" /></Pressable>
                  </View>
                </View>
                <View style={styles.calendarWeekRow}>
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => <Text key={`${day}-${index}`} style={styles.calendarWeekDay}>{day}</Text>)}
                </View>
                <View style={styles.calendarGrid}>
                  {calendarCells.map((day, index) => {
                    if (!day) return <View key={`empty-${index}`} style={styles.calendarCell} />;
                    const date = calendarDateKey(calendarYear, calendarMonthIndex, day);
                    const saleCount = calendarCounts[date] || 0;
                    const hasSales = saleCount > 0;
                    return (
                      <Pressable key={date} onPress={() => void openReportDay(date)} style={({ pressed }) => [styles.calendarCell, saleCount >= 5 ? styles.calendarCellBusy : saleCount >= 2 ? styles.calendarCellActive : hasSales && styles.calendarCellMarked, pressed && styles.buttonPressed]}>
                        <Text style={[styles.calendarDayText, hasSales && styles.calendarDayTextMarked]}>{day}</Text>
                        {hasSales ? <View style={styles.calendarDot} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.calendarHintRow}><CalendarDays size={14} color="#6a716d" /><Text style={styles.calendarHint}>Toca un día para ver sus ventas</Text></View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reportSummaryScroll}>
                <View style={styles.reportKpiSlot}><Kpi label={reportPeriodLabel(reportPeriod)} value={money(reportSummary.total)} tone="green" compact={isNarrow} /></View>
                <View style={styles.reportKpiSlot}><Kpi label="Operaciones" value={String(reportSummary.count)} tone="blue" compact={isNarrow} /></View>
                <View style={styles.reportKpiSlot}><Kpi label="Promedio" value={money(reportSummary.average)} tone="amber" compact={isNarrow} /></View>
              </ScrollView>
              <View style={[styles.panelLarge, isNarrow && styles.panelLargeMobile]}>
                <SectionTitle compact={isNarrow} eyebrow={`MOVIMIENTO · POR ${chartUnit.toUpperCase()}`} title={reportPeriod === 'historico' ? 'Ventas históricas' : reportPeriod === 'ano' ? 'Ventas del año' : reportPeriod === 'mes' ? 'Ventas del mes' : 'Ventas recientes'} right={reportLoading ? 'Cargando…' : 'Actualizar'} onRight={() => loadReport(reportPeriod)} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {reportSeries.length === 0 ? <Empty title="Sin ventas en este periodo" copy="Cambia a otro periodo o registra una venta." compact /> : <View style={[styles.chartLarge, reportSeries.length > 14 && styles.chartLargeWide]}>
                    {reportSeries.map((item) => {
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
              <View style={[styles.panelLarge, isNarrow && styles.panelLargeMobile]}>
                <SectionTitle compact={isNarrow} eyebrow="HISTÓRICO" title="Ventas acumuladas" />
                <Text style={styles.muted}>Desde {remoteReport?.historical?.firstDate ? reportDateLabel(remoteReport.historical.firstDate, 'mes') : 'el inicio'} hasta {remoteReport?.historical?.lastDate ? reportDateLabel(remoteReport.historical.lastDate, 'mes') : 'hoy'}.</Text>
                <View style={styles.historicalRow}>
                  <Stat label="Total histórico" value={money(remoteReport?.historical?.total ?? reportTotal)} />
                  <Stat label="Boletas" value={String(remoteReport?.historical?.count ?? filteredSales.length)} />
                </View>
              </View>
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
                <SectionTitle compact={isNarrow} eyebrow="LECTURA" title="Resumen" />
                <Stat label="Pendientes" value={String(pendingCount)} />
                <Stat label="Estado API" value={online ? 'Conectada' : 'Offline'} />
                <Stat label="Filtro activo" value={searchText || 'Sin filtro'} />
               </View>
               <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="COBROS" title="Medios de pago" />
                {paymentBreakdown.map((item) => (
                  <RankRow key={item.label} label={item.label} value={money(item.total)} percent={item.total / maxPaymentTotal} compact />
                ))}
              </View>
              <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="DETALLE" title="Últimas ventas" />
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
              <View style={styles.panel}>
                <SectionTitle compact={isNarrow} eyebrow="PERSONAS" title="Ventas por vendedor" />
                {sellerBreakdown.length === 0 ? (
                  <Empty title="Sin vendedores" copy="Los nombres aparecerán al registrar ventas." compact />
                ) : (
                  sellerBreakdown.map((item) => (
                    <RankRow key={item.label} label={item.label} detail={`${item.count} ${item.count === 1 ? 'venta' : 'ventas'}`} value={money(item.total)} percent={item.total / maxSellerTotal} compact />
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
              <View style={styles.panel}>
                <SectionTitle eyebrow="APLICACIÓN" title="Actualización" />
                <Text style={styles.muted}>Versión instalada: {installedVersion} · Código {installedVersionCode}</Text>
                <Text style={styles.muted}>Las nuevas versiones se descargan desde GitHub Releases y se instalan como APK.</Text>
                {availableUpdate ? (
                  <View style={styles.updateNotice}>
                    <Text style={styles.preferenceTitle}>{availableUpdate.name}</Text>
                    <Text style={styles.muted}>Nueva versión {availableUpdate.version}</Text>
                    <Text style={styles.muted} numberOfLines={4}>{availableUpdate.notes}</Text>
                    <Pressable onPress={installUpdate} disabled={updateInstalling} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                      <Text style={styles.primaryText}>{updateInstalling ? 'Descargando APK…' : 'Descargar e instalar'}</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Pressable onPress={checkForUpdate} disabled={updateChecking} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>{updateChecking ? 'Revisando GitHub…' : 'Buscar actualización'}</Text>
                </Pressable>
              </View>
               <View style={styles.panel}>
                <SectionTitle eyebrow="SINCRONIZACION" title="Estado local" />
                <Stat label="Ventas pendientes" value={String(pendingCount)} />
                <Stat label="Servidor" value={online ? 'Conectado' : 'Sin conexión'} />
                <Stat label="API detectada" value={apiBase} />
                <TextInput value={apiBase} onChangeText={setApiBaseState} autoCapitalize="none" autoCorrect={false} placeholder="http://IP-DE-LA-LAPTOP:8090" style={styles.input} />
                {savedApiBases.length > 0 ? <Text style={styles.muted}>Servidores guardados</Text> : null}
                {savedApiBases.map((base) => <Pressable key={base} onPress={() => setApiBaseState(base)} style={({ pressed }) => [styles.savedServer, pressed && styles.buttonPressed]}><Text style={styles.savedServerText}>{base}</Text></Pressable>)}
                <Pressable onPress={saveServer} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Guardar servidor y probar</Text>
                </Pressable>
               <Pressable onPress={syncNow} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Reconectar y sincronizar</Text>
                </Pressable>
                <Pressable onPress={openScanner} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Escanear QR de la laptop</Text>
                </Pressable>
                {lastSyncAt ? <Text style={styles.muted}>Última sincronización: {saleTime(lastSyncAt)}</Text> : null}
              </View>
              <View style={styles.panel}>
                <SectionTitle eyebrow="PRUEBAS" title="Simular una venta" />
                <Text style={styles.muted}>Crea una venta local de prueba para revisar el historial, el estado pendiente y el detalle sin enviar datos reales.</Text>
                <Pressable onPress={simulateSale} style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.secondaryText}>Crear venta de prueba</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {selectedDay ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedDay(null)} style={styles.dayModalDismiss} />
          <View style={styles.dayModalCard}>
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

      {selectedSale ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setSelectedSale(null)} style={styles.dayModalDismiss} />
          <View style={styles.dayModalCard}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}>
                <Text style={styles.eyebrow}>DETALLE DE BOLETA</Text>
                <Text style={styles.dayModalTitle} numberOfLines={1}>{reportDateLabel(selectedSale.createdAt, 'dia')}</Text>
                <Text style={styles.muted}>{saleTime(selectedSale.createdAt)} · {selectedSale.seller}</Text>
              </View>
              <Pressable onPress={() => setSelectedSale(null)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            <View style={styles.saleDetailMeta}>
              <Text style={styles.saleDetailMetaText}>{selectedSale.status === 'synced' ? 'Sincronizada' : 'Pendiente'}</Text>
              <Text style={styles.saleDetailMetaText}>{selectedSale.paymentMethod === 'digital' ? 'Pago digital' : 'Efectivo'}</Text>
            </View>
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

      {historyModalOpen ? (
        <View style={styles.dayModalOverlay}>
          <Pressable onPress={() => setHistoryModalOpen(false)} style={styles.dayModalDismiss} />
          <View style={styles.historyModalCard}>
            <View style={styles.dayModalHeader}>
              <View style={styles.dayModalHeaderCopy}><Text style={styles.eyebrow}>HISTORIAL COMPLETO</Text><Text style={styles.dayModalTitle} numberOfLines={1}>Ventas guardadas</Text></View>
              <Pressable onPress={() => setHistoryModalOpen(false)} style={styles.closeButton}><X size={20} color="#174f42" /></Pressable>
            </View>
            <ScrollView style={styles.historyModalList}>{visibleSales.map((sale) => <View key={sale.id} style={styles.historyModalItem}><SaleRow sale={sale} onPress={() => { setHistoryModalOpen(false); setSelectedSale(sale); }} onDelete={() => cancelSale(sale)} /></View>)}</ScrollView>
          </View>
        </View>
      ) : null}

      {cart.length > 0 && !cartOpen && screen === 'sale' ? (
          <Pressable onPress={() => setCartOpen(true)} style={({ pressed }) => [styles.cartFab, { bottom: 96 + insets.bottom }, pressed && styles.buttonPressed]}>
          <Text style={styles.cartFabText}>Ver carrito · {cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'producto' : 'productos'}</Text>
          <Text style={styles.cartFabTotal}>{money(cartTotal)}</Text>
        </Pressable>
      ) : null}

      {cartOpen ? <>
        <Pressable accessibilityLabel="Cerrar pedido" onPress={() => setCartOpen(false)} style={styles.sheetBackdrop} />
        <CartSheet cart={cart} total={cartTotal} paymentMethod={paymentMethod} simpleView={simpleView} paymentConfig={paymentConfig} onPaymentMethod={setPaymentMethod} safeBottom={insets.bottom} onClose={() => setCartOpen(false)} onAdd={addProduct} onRemoveOne={removeOne} onRemove={removeProduct} onConfirm={confirmSale} />
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
