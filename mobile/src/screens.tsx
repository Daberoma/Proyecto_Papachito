import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { Package, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { money, reportDateLabel, reportPeriodLabel, saleTime, shortDate, type ReportPeriod, type Screen } from './domain';
import { BottomNav, CartSheet, CartSummary, DesktopNav, Empty, Kpi, ProductCard, RankRow, SaleRow, SectionTitle, Stat, styles, screenTitle } from './ui';
import type { usePapachitoApp } from './usePapachitoApp';

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
  const { insets,isWide,isNarrow,productCardWidth,booting,hasProfile,setupName,sellerName,settingsName,screen,products,cart,sales,online,apiBase,loadingCatalog,search,category,cartOpen,paymentMethod,reportPeriod,remoteReport,reportLoading,scannerOpen,searchingServer,lastSyncAt,simpleView,paymentConfig,savedApiBases,addedProductPulse,pendingCount,cartTotal,categories,searchText,filteredProducts,filteredSales,visibleSales,searchResults,todaySales,todayTotal,reportTotal,reportDays,maxReport,bestDay,topProducts,paymentBreakdown,sellerBreakdown,maxProductTotal,maxPaymentTotal,maxSellerTotal,reportSummary,reportSeries,reportMax,cameraPermission,requestCameraPermission,setSetupName,setSellerName,setSettingsName,setScreen,setProducts,setCart,setSales,setOnline,setApiBaseState,setLoadingCatalog,setSearch,setCategory,setCartOpen,setPaymentMethod,setReportPeriod,setRemoteReport,setReportLoading,setScannerOpen,setSearchingServer,setLastSyncAt,toggleSimpleView,togglePaymentMethod,navigateTo,refreshSales,cancelSale,loadCatalog,syncNow,openScanner,connectFromQr,loadReport,continueSetup,saveSettingsName,saveServer,addProduct,removeOne,removeProduct,confirmSale,selectSearchResult } = app;
  const [searchFocused, setSearchFocused] = useState(false);
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

        <View style={[styles.globalSearch, isNarrow && styles.globalSearchCompact, searchFocused && styles.globalSearchFocused]}>
          <Search size={20} color={searchFocused ? '#174f42' : '#89918c'} strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar producto o boleta"
            style={styles.searchInput}
            placeholderTextColor="#89918c"
            selectionColor="#174f42"
            cursorColor="#174f42"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} style={({ pressed }) => [styles.clearButton, pressed && styles.buttonPressed]}>
              <X size={18} color="#174f42" />
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
                <View style={styles.resultIcon}>{result.type === 'product' ? <Package size={18} color="#174f42" /> : result.type === 'sale' ? <ReceiptText size={18} color="#174f42" /> : <SlidersHorizontal size={18} color="#174f42" />}</View>
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

      <ScrollView nestedScrollEnabled contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, isNarrow && styles.contentCompact, { paddingBottom: 184 + insets.bottom }]}>
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
              <Kpi label="Ventas de hoy" value={String(todaySales.length)} inverse />
              <Kpi label="Total real" value={money(todayTotal)} inverse />
            </View>
            <SectionTitle eyebrow="ACTIVIDAD" title="Historial" right="Actualizar" onRight={refreshSales} />
            {filteredSales.length === 0 ? (
              <Empty title={searchText ? 'Sin boletas' : 'No hay ventas'} copy={searchText ? 'No hay historial que coincida con la busqueda.' : 'Las ventas guardadas apareceran aqui.'} />
            ) : (
              visibleSales.map((sale) => <SaleRow key={sale.id} sale={sale} onDelete={() => cancelSale(sale)} />)
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
              <View style={styles.summaryCard}>
                <Kpi label={reportPeriodLabel(reportPeriod)} value={money(reportSummary.total)} tone="green" />
                <Kpi label="Operaciones" value={String(reportSummary.count)} tone="blue" />
                <Kpi label="Promedio" value={money(reportSummary.average)} tone="amber" />
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
                  {reportSeries.length === 0 ? <Empty title="Sin ventas en este periodo" copy="Cambia a otro periodo o registra una venta." compact /> : <View style={[styles.chartLarge, reportSeries.length > 14 && styles.chartLargeWide]}>
                    {reportSeries.map((item, index) => (
                      <View key={item.date} style={styles.chartCol}>
                        <Text style={styles.chartValue}>{money(Number(item.total))}</Text>
                        <View style={[styles.chartBar, { height: 22 + (Number(item.total) / reportMax) * 126, backgroundColor: ['#1b6b58', '#4b74a8', '#c98a31', '#8a5b9a'][index % 4] }]} />
                        <Text style={styles.chartLabel}>{reportDateLabel(item.date, reportPeriod)}</Text>
                      </View>
                    ))}
                  </View>}
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
              <View style={styles.panel}>
                <SectionTitle eyebrow="PERSONAS" title="Ventas por vendedor" />
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

        {screen === 'settings' && (
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <View style={styles.panel}>
                <SectionTitle eyebrow="PERFIL" title="Nombre del vendedor" />
                <TextInput value={settingsName} onChangeText={setSettingsName} placeholder="Nombre" style={styles.input} />
                <Pressable onPress={saveSettingsName} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryText}>Guardar nombre</Text>
                </Pressable>
              </View>
               <View style={styles.panel}>
                 <SectionTitle eyebrow="COBROS DIGITALES" title="Yape / Plin" />
                 <Text style={styles.muted}>Activa los medios que realmente usas al cobrar.</Text>
                 <View style={styles.preferenceRow}>
                   <View style={styles.rowText}><Text style={styles.preferenceTitle}>Yape</Text><Text style={styles.muted}>Usar QR de Yape</Text></View>
                   <Switch value={paymentConfig.yapeEnabled} onValueChange={(value) => togglePaymentMethod('yapeEnabled', value)} trackColor={{ false: '#d8d4cc', true: '#9ac9ae' }} thumbColor={paymentConfig.yapeEnabled ? '#174f42' : '#fff'} />
                 </View>
                 <View style={styles.preferenceRow}>
                   <View style={styles.rowText}><Text style={styles.preferenceTitle}>Plin</Text><Text style={styles.muted}>Preparado para su QR</Text></View>
                   <Switch value={paymentConfig.plinEnabled} onValueChange={(value) => togglePaymentMethod('plinEnabled', value)} trackColor={{ false: '#d8d4cc', true: '#9ac9ae' }} thumbColor={paymentConfig.plinEnabled ? '#174f42' : '#fff'} />
                 </View>
                 <Text style={styles.muted}>Activa los medios que realmente usas al cobrar.</Text>
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
            </View>
          </View>
        )}
      </ScrollView>

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
