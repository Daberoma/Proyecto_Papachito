import { useState } from 'react';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { Package, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { money, reportDateLabel, reportPeriodLabel, saleTime, shortDate, type ReportPeriod, type Screen } from './domain';
import { BottomNav, CartSheet, CartSummary, Empty, Kpi, ProductCard, RankRow, SaleRow, SectionTitle, Stat, styles, screenTitle } from './ui';
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
  const { insets,isWide,isNarrow,productCardWidth,booting,hasProfile,setupName,sellerName,settingsName,screen,products,cart,sales,online,apiBase,loadingCatalog,search,category,quickName,quickPrice,newProductName,newProductPrice,newProductCategory,cartOpen,paymentMethod,reportPeriod,remoteReport,reportLoading,scannerOpen,searchingServer,lastSyncAt,simpleView,savedApiBases,addedProductPulse,pendingCount,cartTotal,categories,searchText,filteredProducts,filteredSales,searchResults,todaySales,todayTotal,reportTotal,reportDays,maxReport,bestDay,topProducts,paymentBreakdown,maxProductTotal,maxPaymentTotal,reportSummary,reportSeries,reportMax,cameraPermission,requestCameraPermission,setSetupName,setSellerName,setSettingsName,setScreen,setProducts,setCart,setSales,setOnline,setApiBaseState,setLoadingCatalog,setSearch,setCategory,setQuickName,setQuickPrice,setNewProductName,setNewProductPrice,setNewProductCategory,setCartOpen,setPaymentMethod,setReportPeriod,setRemoteReport,setReportLoading,setScannerOpen,setSearchingServer,setLastSyncAt,toggleSimpleView,navigateTo,refreshSales,cancelSale,loadCatalog,syncNow,openScanner,connectFromQr,loadReport,continueSetup,saveSettingsName,saveServer,addProduct,removeOne,removeProduct,addQuickProduct,createProduct,confirmSale,selectSearchResult } = app;
  const [searchFocused, setSearchFocused] = useState(false);
  return (
  <View style={styles.safe}>
    <View style={[styles.shell, isWide && styles.shellWide]}>
      <View style={[styles.header, isNarrow && styles.headerCompact]}>
        <Image source={require('../papachito-logo.jpg')} style={styles.headerLogo} />
        <View style={styles.userBlock}>
          <Text style={styles.brand}>DONDE PAPACHITO</Text>
          <Text style={styles.title}>{screenTitle(screen)}</Text>
          <Text style={styles.userText}>Atiende: {sellerName}</Text>
        </View>
        <View style={[styles.status, online ? styles.statusOnline : styles.statusOffline]}>
          <Text style={styles.statusText}>{online ? 'Conectado' : 'Offline'}</Text>
        </View>
      </View>

        <View style={[styles.globalSearch, isNarrow && styles.globalSearchCompact, searchFocused && styles.globalSearchFocused]}>
          <Search size={20} color={searchFocused ? '#174f42' : '#89918c'} strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar productos, boletas o acciones"
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

      <ScrollView nestedScrollEnabled contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.content, isNarrow && styles.contentCompact, { paddingBottom: 132 + insets.bottom }]}>
        {screen === 'sale' && (
        <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.mainColumn}>
              <SectionTitle eyebrow="CATALOGO" title="Productos" right={loadingCatalog ? 'Cargando' : `${filteredProducts.length} productos`} />
              {searchingServer ? <Text style={styles.connectionHint}>Buscando servidor en la red…</Text> : null}
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
                  {filteredProducts.map((item) => <ProductCard key={String(item.id)} item={item} width={productCardWidth} simpleView={simpleView} highlighted={addedProductPulse.startsWith(`${String(item.id)}-`)} onPress={addProduct} />)}
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
                    <Pressable key={period} onPress={() => setReportPeriod(period)} style={({ pressed }) => [styles.periodTab, reportPeriod === period && styles.periodTabActive, pressed && styles.buttonPressed]}>
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
                <Pressable onPress={saveSettingsName} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryText}>Guardar nombre</Text>
                </Pressable>
              </View>
              <View style={styles.panel}>
                <SectionTitle eyebrow="CATÁLOGO" title="Agregar producto" />
                <TextInput value={newProductName} onChangeText={setNewProductName} placeholder="Nombre del producto" style={styles.input} />
                <TextInput value={newProductPrice} onChangeText={setNewProductPrice} placeholder="Precio en soles" keyboardType="decimal-pad" style={styles.input} />
                <TextInput value={newProductCategory} onChangeText={setNewProductCategory} placeholder="Categoría" style={styles.input} />
                <Pressable onPress={createProduct} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.primaryText}>Guardar producto</Text>
                </Pressable>
              </View>
              <View style={styles.panel}>
                <SectionTitle eyebrow="PREFERENCIAS" title="Vista simple" />
                <View style={styles.preferenceRow}>
                  <View style={styles.rowText}>
                    <Text style={styles.preferenceTitle}>Solo producto y precio</Text>
                    <Text style={styles.muted}>Oculta descripción, categoría y detalles adicionales al vender.</Text>
                  </View>
                  <Switch value={simpleView} onValueChange={toggleSimpleView} trackColor={{ false: '#d8d4cc', true: '#9ac9ae' }} thumbColor={simpleView ? '#174f42' : '#fff'} />
                </View>
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
          <Text style={styles.cartFabText}>{cart.reduce((sum, item) => sum + item.quantity, 0)} productos</Text>
          <Text style={styles.cartFabTotal}>{money(cartTotal)}</Text>
        </Pressable>
      ) : null}

      {cartOpen ? <CartSheet cart={cart} total={cartTotal} paymentMethod={paymentMethod} simpleView={simpleView} onPaymentMethod={setPaymentMethod} safeBottom={insets.bottom} onClose={() => setCartOpen(false)} onAdd={addProduct} onRemoveOne={removeOne} onRemove={removeProduct} onConfirm={confirmSale} /> : null}
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
      <BottomNav screen={screen} setScreen={(next: Screen) => navigateTo(next)} safeBottom={insets.bottom} />
    </View>
  </View>
  );
}
