import { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import {
  BarChart3,
  ClipboardList,
  Minus,
  Maximize2,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  Settings,
  ShoppingCart,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  money,
  saleTime,
  shortDate,
  type CartItem,
  type Product,
  type Screen,
} from './domain';
import type { OfflineSale } from './offline';

export function screenTitle(screen: Screen) {
  if (screen === 'history') return 'Historial';
  if (screen === 'report') return 'Reporte';
  if (screen === 'settings') return 'Ajustes';
  if (screen === 'payments') return 'Medios de pago';
  return 'Nueva venta';
}

export function SectionTitle({ eyebrow, title, right, onRight, compact }: { eyebrow: string; title: string; right?: string; onRight?: () => void; compact?: boolean }) {
  return (
    <View style={[styles.sectionHeading, compact && styles.sectionHeadingCompact]}>
      <View style={styles.rowText}>
        <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{eyebrow}</Text>
        <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{title}</Text>
      </View>
      {right ? (
        <Pressable onPress={onRight} disabled={!onRight}>
          <Text style={[styles.sectionRight, compact && styles.sectionRightCompact]}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CartSummary({ cart, total, onOpen }: { cart: CartItem[]; total: number; onOpen: () => void }) {
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
            <Pressable onPress={onOpen} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Abrir carrito</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

export function CartSheet({ cart, total, paymentMethod, simpleView, paymentConfig, onPaymentMethod, safeBottom, onClose, onAdd, onRemoveOne, onRemove, onConfirm }: { cart: CartItem[]; total: number; paymentMethod: 'cash' | 'digital'; simpleView: boolean; paymentConfig: { yapeEnabled: boolean; plinEnabled: boolean; bbvaEnabled: boolean; yapeQrUri?: string; plinQrUri?: string; bbvaQrUri?: string }; onPaymentMethod: (method: 'cash' | 'digital') => void; safeBottom: number; onClose: () => void; onAdd: (product: Product) => void; onRemoveOne: (product: CartItem) => void; onRemove: (product: CartItem) => void; onConfirm: () => void }) {
  const [qrExpanded, setQrExpanded] = useState(false);
  const [digitalProvider, setDigitalProvider] = useState<'yape' | 'plin' | 'bbva'>('yape');
  const digitalOptions = [
    { key: 'yape' as const, label: 'Yape', enabled: paymentConfig.yapeEnabled, uri: paymentConfig.yapeQrUri },
    { key: 'plin' as const, label: 'Plin', enabled: paymentConfig.plinEnabled, uri: paymentConfig.plinQrUri },
    { key: 'bbva' as const, label: 'BBVA', enabled: paymentConfig.bbvaEnabled, uri: paymentConfig.bbvaQrUri },
  ];
  const activeDigital = digitalOptions.find((item) => item.key === digitalProvider && item.enabled) || digitalOptions.find((item) => item.enabled) || digitalOptions[0];
  useEffect(() => {
    if (paymentMethod !== 'digital') {
      setQrExpanded(false);
      return;
    }
    const timer = setTimeout(() => setQrExpanded(true), 1000);
    return () => clearTimeout(timer);
  }, [paymentMethod]);
  useEffect(() => {
    if (!digitalOptions.find((item) => item.key === digitalProvider && item.enabled)) {
      const next = digitalOptions.find((item) => item.enabled);
      if (next) setDigitalProvider(next.key);
    }
  }, [paymentConfig.yapeEnabled, paymentConfig.plinEnabled, paymentConfig.bbvaEnabled, digitalProvider]);
  return (
    <>
    <Animated.View style={[styles.sheet, { bottom: 96 + safeBottom }]}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <View style={styles.rowText}>
          <Text style={styles.eyebrow}>VENTA ACTUAL</Text>
          <Text style={styles.sheetTitle}>Tu pedido</Text>
        </View>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}>
          <X size={20} color="#174f42" strokeWidth={2.5} />
        </Pressable>
      </View>
      <ScrollView style={styles.sheetItems}>
        {cart.map((item) => (
          <View key={String(item.id)} style={styles.cartRow}>
            <View style={styles.rowText}>
              <Text style={styles.cartName} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
              <Text style={styles.muted}>Cantidad: {item.quantity}</Text>
            </View>
            <Text style={styles.simpleLineTotal}>{money(Number(item.price) * item.quantity)}</Text>
            <Pressable onPress={() => onRemoveOne(item)} style={({ pressed }) => [styles.stepper, styles.stepperMinus, pressed && styles.buttonPressed]}><Minus size={18} color="#a74035" /></Pressable>
            <Text style={styles.qty}>{item.quantity}</Text>
            <Pressable onPress={() => onAdd(item)} style={({ pressed }) => [styles.stepper, styles.stepperPlus, pressed && styles.buttonPressed]}><Plus size={18} color="#174f42" /></Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.paymentBox}>
        <Text style={styles.paymentLabel}>Medio de pago</Text>
        <View style={styles.segmented}>
          <Pressable onPress={() => onPaymentMethod('cash')} style={({ pressed }) => [styles.segment, paymentMethod === 'cash' && [styles.segmentActive, styles.segmentCashActive], pressed && styles.buttonPressed]}>
            <WalletCards size={16} color={paymentMethod === 'cash' ? '#141a18' : '#6a716d'} />
            <Text style={[styles.segmentText, paymentMethod === 'cash' && styles.segmentTextActive]}>Efectivo</Text>
          </Pressable>
          <Pressable disabled={!paymentConfig.yapeEnabled && !paymentConfig.plinEnabled && !paymentConfig.bbvaEnabled} onPress={() => onPaymentMethod('digital')} style={({ pressed }) => [styles.segment, paymentMethod === 'digital' && [styles.segmentActive, styles.segmentDigitalActive], (!paymentConfig.yapeEnabled && !paymentConfig.plinEnabled && !paymentConfig.bbvaEnabled) && styles.segmentDisabled, pressed && styles.buttonPressed]}>
            <WalletCards size={16} color={paymentMethod === 'digital' ? '#141a18' : '#6a716d'} />
            <Text style={[styles.segmentText, paymentMethod === 'digital' && styles.segmentTextActive]}>Digital</Text>
          </Pressable>
        </View>
        {paymentMethod === 'digital' ? (
          <View style={styles.digitalPayment}>
            <View style={styles.digitalChoices}>
              {digitalOptions.filter((item) => item.enabled).map((item) => (
                <Pressable key={item.key} onPress={() => setDigitalProvider(item.key)} style={({ pressed }) => [styles.digitalChoice, digitalProvider === item.key && styles.digitalChoiceActive, pressed && styles.buttonPressed]}>
                  <Text style={[styles.digitalChoiceText, digitalProvider === item.key && styles.digitalChoiceTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.digitalTitle}>QR de {activeDigital.label}</Text>
            <Pressable onPress={() => setQrExpanded(true)} style={styles.paymentQrFrame}>
              {activeDigital.uri ? <Image source={{ uri: activeDigital.uri }} style={styles.paymentQrImage} resizeMode="contain" /> : activeDigital.key === 'yape' ? <Image source={require('../yape-qr.jpg')} style={styles.paymentQrImage} resizeMode="contain" /> : <Text style={styles.qrMissingText}>Sube el QR de {activeDigital.label} en Ajustes</Text>}
              <View style={styles.qrExpandBadge}><Maximize2 size={16} color="#174f42" /></View>
            </Pressable>
            <Text style={styles.qrHint}>Toca el QR para verlo grande · Total {money(total)}</Text>
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
    </Animated.View>
    {qrExpanded ? (
      <View style={styles.qrOverlay}>
        <Pressable accessibilityLabel="Cerrar QR" onPress={() => setQrExpanded(false)} style={styles.qrOverlayDismiss} />
        <View style={styles.qrModalCard}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>QR de {activeDigital.label}</Text>
            <Pressable onPress={() => setQrExpanded(false)} style={styles.closeButton}>
              <X size={20} color="#174f42" strokeWidth={2.5} />
            </Pressable>
          </View>
          {activeDigital.uri ? <Image source={{ uri: activeDigital.uri }} style={styles.qrModalImage} resizeMode="contain" /> : activeDigital.key === 'yape' ? <Image source={require('../yape-qr.jpg')} style={styles.qrModalImage} resizeMode="contain" /> : <Text style={styles.qrMissingText}>Sin QR configurado</Text>}
          <Text style={styles.qrModalHint}>Escanéalo para pagar {money(total)}</Text>
        </View>
      </View>
    ) : null}
    </>
  );
}

// Tarjeta memoizada: al añadir un producto solo cambia el carrito, no se vuelve a
// renderizar cada una de las tarjetas del catálogo (importante con catálogos grandes).
export const ProductCard = memo(function ProductCard({ item, width, simpleView, highlighted, onPress }: { item: Product; width: DimensionValue; simpleView: boolean; highlighted?: boolean; onPress: (product: Product) => void }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const category = (item.category || 'Otros').toLowerCase();
  const categoryStyle = category.includes('agua')
    ? { background: '#dceafa', text: '#315b91', edge: '#78a9e3' }
    : category.includes('gaseosa')
      ? { background: '#f8ddd4', text: '#a34d3f', edge: '#e18a77' }
      : category.includes('cerveza')
        ? { background: '#fff0c7', text: '#926018', edge: '#e4b34f' }
        : category.includes('licor')
          ? { background: '#eadcf7', text: '#69408e', edge: '#a77bc8' }
          : category.includes('snack')
            ? { background: '#ffe0ad', text: '#995b0b', edge: '#e9a63a' }
            : category.includes('abarrote')
              ? { background: '#dff0d8', text: '#3c7440', edge: '#8fbd84' }
              : category.includes('limpieza')
                ? { background: '#d9f2f2', text: '#287071', edge: '#77bfc0' }
                : category.includes('cuidado')
                  ? { background: '#f4dff0', text: '#8a477b', edge: '#c98cbd' }
                  : { background: '#e4f1ea', text: '#174f42', edge: '#91c2aa' };
  const mark = item.name.trim().slice(0, 2).toUpperCase();
  useEffect(() => {
    if (highlighted) {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.025, duration: 90, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [highlighted, pulse]);
  return (
    <Animated.View style={[{ width }, { transform: [{ scale: pulse }] }]}>
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.productCard, { borderLeftColor: categoryStyle.edge, borderLeftWidth: 4 }, highlighted && styles.productCardHighlighted, pressed && styles.productCardPressed, { width: '100%' }]}>
      <View style={[styles.productIcon, { backgroundColor: categoryStyle.background }]}><Text style={[styles.productMarkText, { color: categoryStyle.text }]}>{mark}</Text></View>
      <View style={styles.productMain}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>{money(Number(item.price))}</Text>
      </View>
      <View style={styles.addBadge}><Plus size={20} color="#fff" strokeWidth={2.5} /></View>
    </Pressable>
    </Animated.View>
  );
});

export function BottomNav({ screen, setScreen, safeBottom }: { screen: Screen; setScreen: (screen: Screen) => void; safeBottom: number }) {
  const items: { key: Screen; icon: LucideIcon; label: string }[] = [
    { key: 'sale', icon: ShoppingCart, label: 'Vender' },
    { key: 'history', icon: ReceiptText, label: 'Historial' },
    { key: 'report', icon: BarChart3, label: 'Reporte' },
    { key: 'settings', icon: Settings, label: 'Ajustes' },
  ];
  return (
    <View style={[styles.bottomNav, { bottom: safeBottom + 12, height: 72, paddingBottom: 5 }]}>
      {items.map((item) => (
        <Pressable key={item.key} onPress={() => setScreen(item.key)} style={({ pressed }) => [styles.navItem, screen === item.key && styles.navItemActive, pressed && styles.navPressed]}>
          <View style={styles.navIconWrap}><item.icon size={19} color={screen === item.key ? '#174f42' : '#7d8580'} strokeWidth={2.2} /></View>
          <Text style={[styles.navLabel, screen === item.key && styles.navActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function DesktopNav({ screen, setScreen, sellerName, online }: { screen: Screen; setScreen: (screen: Screen) => void; sellerName: string; online: boolean }) {
  const items: { key: Screen; icon: LucideIcon; label: string; hint: string }[] = [
    { key: 'sale', icon: ShoppingCart, label: 'Vender', hint: 'Nueva operación' },
    { key: 'history', icon: ReceiptText, label: 'Historial', hint: 'Ventas guardadas' },
    { key: 'report', icon: BarChart3, label: 'Reporte', hint: 'Resumen y métricas' },
    { key: 'settings', icon: Settings, label: 'Ajustes', hint: 'Configuración' },
  ];
  return (
    <View style={styles.desktopNav}>
      <Image source={require('../papachito-logo.jpg')} style={styles.desktopLogo} />
      <Text style={styles.desktopBrand}>DONDE PAPACHITO</Text>
      <Text style={styles.desktopUser}>{sellerName || 'Vendedor'}</Text>
      <View style={styles.desktopStatus}><View style={[styles.desktopStatusDot, online ? styles.desktopDotOn : styles.desktopDotOff]} /><Text style={styles.desktopStatusText}>{online ? 'Conectado' : 'Sin conexión'}</Text></View>
      <View style={styles.desktopMenu}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={() => setScreen(item.key)} style={({ pressed }) => [styles.desktopNavItem, screen === item.key && styles.desktopNavItemActive, pressed && styles.navPressed]}>
            <item.icon size={20} color={screen === item.key ? '#fff' : '#b8d3c8'} strokeWidth={2.2} />
            <View style={styles.desktopNavText}><Text style={[styles.desktopNavLabel, screen === item.key && styles.desktopNavLabelActive]}>{item.label}</Text><Text style={styles.desktopNavHint}>{item.hint}</Text></View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.desktopFooter}>Sistema local · 8090</Text>
    </View>
  );
}

export function SaleRow({ sale, onDelete, onPress }: { sale: OfflineSale; onDelete: () => void; onPress?: () => void }) {
  return (
    <View style={styles.historyRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir boleta del ${shortDate(sale.createdAt)}`} onPress={onPress} style={({ pressed }) => [styles.historyTop, pressed && styles.buttonPressed]}>
        <View style={styles.badge}><Text style={styles.badgeText}>B</Text></View>
        <View style={styles.rowText}>
          <Text style={styles.historyTitle} numberOfLines={1}>{sale.items[0]?.name || 'Venta sin productos'}{sale.items.length > 1 ? ` + ${sale.items.length - 1} más` : ''}</Text>
          <Text style={styles.muted}>{saleTime(sale.createdAt)} · {sale.seller}</Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={styles.historyTotal}>{money(sale.total)}</Text>
          <Text style={[styles.historyStatus, sale.status === 'synced' ? styles.good : styles.warn]}>{sale.status === 'synced' ? 'ENVIADA' : 'PENDIENTE DE ENVÍO'}</Text>
        </View>
      </Pressable>
      <View style={styles.historyBottom}>
        <Text style={styles.muted}>{sale.items.length} {sale.items.length === 1 ? 'producto' : 'productos'}</Text>
        <Pressable onPress={onDelete} style={styles.deleteSaleButton}>
          <Text style={styles.deleteSaleText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Kpi({ label, value, inverse, tone, compact }: { label: string; value: string; inverse?: boolean; tone?: 'green' | 'blue' | 'amber'; compact?: boolean }) {
  const toneStyle = tone === 'green' ? styles.kpiToneGreen : tone === 'blue' ? styles.kpiToneBlue : tone === 'amber' ? styles.kpiToneAmber : null;
  return (
    <View style={[inverse ? styles.kpiInverse : styles.kpi, toneStyle, compact && styles.kpiMobile]}>
      <Text style={inverse ? styles.kpiLabelInverse : styles.kpiLabel}>{label}</Text>
      <Text style={[inverse ? styles.kpiValueInverse : styles.kpiValue, compact && styles.kpiValueMobile]}>{value}</Text>
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function RankRow({ index, label, detail, value, percent, compact }: { index?: number; label: string; detail?: string; value: string; percent: number; compact?: boolean }) {
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

export function Empty({ title, copy, compact }: { title: string; copy: string; compact?: boolean }) {
  return (
    <View style={[styles.empty, compact && styles.emptyCompact]}>
      <Text style={styles.emptyIcon}>0</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.muted}>{copy}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: '#f6f1ea', alignItems: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: 1120, backgroundColor: '#f6f1ea' },
  shellWide: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e7ded3' },
  shellDesktop: { paddingLeft: 220 },
  desktopNav: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 220, backgroundColor: '#123f35', paddingHorizontal: 18, paddingTop: 28, zIndex: 30 },
  desktopLogo: { width: 58, height: 58, borderRadius: 29, alignSelf: 'center' },
  desktopBrand: { color: '#e7f1eb', fontSize: 12, fontWeight: '900', letterSpacing: 1.6, textAlign: 'center', marginTop: 12 },
  desktopUser: { color: '#b8d3c8', textAlign: 'center', marginTop: 5, fontWeight: '800' },
  desktopStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  desktopStatusDot: { width: 8, height: 8, borderRadius: 4 },
  desktopDotOn: { backgroundColor: '#73d39d' },
  desktopDotOff: { backgroundColor: '#e8b06b' },
  desktopStatusText: { color: '#d8e8df', fontSize: 12, fontWeight: '800' },
  desktopMenu: { gap: 8, marginTop: 28 },
  desktopNavItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12 },
  desktopNavItemActive: { backgroundColor: '#2b705d' },
  desktopNavText: { flex: 1 },
  desktopNavLabel: { color: '#b8d3c8', fontSize: 15, fontWeight: '900' },
  desktopNavLabelActive: { color: '#fff' },
  desktopNavHint: { color: '#83ad9d', fontSize: 11, marginTop: 2 },
  desktopFooter: { position: 'absolute', left: 18, right: 18, bottom: 22, color: '#83ad9d', fontSize: 11, textAlign: 'center' },
  centerCard: { width: '92%', maxWidth: 420, alignSelf: 'center', marginTop: 90, backgroundColor: '#fffdfa', borderWidth: 1, borderColor: '#e6ddd2', borderRadius: 8, padding: 24, gap: 14 },
  setupLogo: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  headerCompact: { paddingHorizontal: 16, paddingTop: 18, gap: 6 },
  headerLogo: { width: 46, height: 46, borderRadius: 23, marginTop: 2 },
  userBlock: { flex: 1 },
  brand: { color: '#1b5b4e', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#141a18', fontSize: 28, fontWeight: '900', marginTop: 2 },
  userText: { color: '#5f6b65', fontWeight: '800', marginTop: 3 },
  setupTitle: { color: '#141a18', fontSize: 31, fontWeight: '900' },
  setupCopy: { color: '#6b746f', lineHeight: 21 },
  status: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  statusOnline: { backgroundColor: '#e4f1ea' },
  statusOffline: { backgroundColor: '#fff0c9' },
  statusText: { color: '#174f42', fontWeight: '900', textAlign: 'center' },
  offlineHint: { marginHorizontal: 24, marginBottom: 4, color: '#7a5a16', fontWeight: '800', fontSize: 13 },
  searchArea: { position: 'relative', zIndex: 25 },
  searchBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.16)', zIndex: 20 },
  globalSearch: { marginHorizontal: 24, marginBottom: 8, minHeight: 56, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#c9d7cf', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 9 },
  globalSearchFocused: { borderColor: '#174f42', backgroundColor: '#ffffff' },
  globalSearchCompact: { marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 17, color: '#151a18', minHeight: 52, outlineWidth: 0 },
  clearButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  clearText: { color: '#174f42', fontWeight: '900' },
  searchPanel: { position: 'absolute', top: 62, left: 24, right: 24, backgroundColor: '#fffdfa', borderRadius: 16, borderWidth: 1, borderColor: '#ded8cf', overflow: 'hidden', zIndex: 30, elevation: 10, shadowColor: '#17211d', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  searchPanelCompact: { left: 16, right: 16 },
  searchPanelHeader: { paddingHorizontal: 15, paddingTop: 13, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f7f4ee' },
  searchPanelEyebrow: { color: '#1b5b4e', fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  searchPanelTitle: { color: '#141a18', fontSize: 15, fontWeight: '900', marginTop: 3 },
  searchPanelCount: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: '#e4f1ea', color: '#174f42', fontSize: 13, fontWeight: '900', textAlign: 'center', paddingTop: 5 },
  resultRow: { minHeight: 64, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#eee7de', flexDirection: 'row', gap: 10, alignItems: 'center' },
  resultRowPressed: { backgroundColor: '#f1f7f3' },
  resultIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  resultIconSale: { backgroundColor: '#e8eef8' },
  resultIconText: { color: '#174f42', fontWeight: '900' },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: { color: '#141a18', fontWeight: '900', fontSize: 15 },
  resultSubtitle: { color: '#6b746f', fontSize: 12, fontWeight: '700', marginTop: 3 },
  resultTag: { borderRadius: 8, backgroundColor: '#e4f1ea', paddingHorizontal: 8, paddingVertical: 5 },
  resultTagSale: { backgroundColor: '#e8eef8' },
  resultTagText: { color: '#174f42', fontSize: 10, fontWeight: '900' },
  resultTagTextSale: { color: '#315b91' },
  searchEmpty: { minHeight: 70, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchEmptyCopy: { flex: 1 },
  searchEmptyTitle: { color: '#141a18', fontWeight: '900', fontSize: 14 },
  searchEmptyText: { color: '#6b746f', fontSize: 12, marginTop: 3 },
  content: { paddingHorizontal: 24, paddingBottom: 104, gap: 10 },
  contentCompact: { paddingHorizontal: 16, paddingBottom: 112 },
  connectionHint: { color: '#8a6a36', fontWeight: '800', marginTop: -5 },
  grid: { gap: 14 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  mainColumn: { flex: 1, gap: 14 },
  sideColumn: { width: '100%', gap: 14, maxWidth: 340 },
  sectionHeading: { marginTop: 2, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  sectionHeadingCompact: { marginBottom: 0, gap: 8 },
  eyebrow: { color: '#1b5b4e', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  eyebrowCompact: { fontSize: 10, letterSpacing: 1.5 },
  sectionTitle: { color: '#141a18', fontSize: 24, fontWeight: '900' },
  sectionTitleCompact: { fontSize: 21, lineHeight: 25 },
  sectionRight: { color: '#174f42', fontWeight: '900', fontSize: 15 },
  sectionRightCompact: { fontSize: 13 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 8, backgroundColor: '#ebe5dc', paddingHorizontal: 15, paddingVertical: 10 },
  chipActive: { backgroundColor: '#174f42' },
  chipText: { color: '#5e6762', fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  productCard: { backgroundColor: '#fffdfa', borderColor: '#e5ddd3', borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11 },
  productIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  productMarkText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  productCardPressed: { borderColor: '#174f42', backgroundColor: '#f1f7f3', transform: [{ scale: 0.985 }] },
  productCardHighlighted: { borderColor: '#5baf84', borderWidth: 2 },
  productMain: { flex: 1, minWidth: 0, gap: 5 },
  productName: { color: '#141a18', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  productDescription: { color: '#4d5853', marginTop: 8, lineHeight: 19 },
  stockText: { color: '#7b6659', fontWeight: '800', marginTop: 6, fontSize: 12 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8 },
  productPrice: { color: '#174f42', fontSize: 18, fontWeight: '900' },
  addBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#174f42', alignItems: 'center', justifyContent: 'center' },
  addBadgeText: { color: '#fff', fontSize: 22, fontWeight: '500', lineHeight: 24 },
  panel: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 16, gap: 12 },
  updateNotice: { backgroundColor: '#eef7f1', borderRadius: 10, borderWidth: 1, borderColor: '#b8d8c2', padding: 12, gap: 8 },
  panelLarge: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 18, gap: 14 },
  panelLargeMobile: { padding: 14, gap: 10, borderRadius: 12 },
  periodTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodTab: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ebe5dc' },
  periodTabActive: { backgroundColor: '#174f42' },
  periodTabText: { color: '#5e6762', fontWeight: '900' },
  periodTabTextActive: { color: '#fff' },
  calendarPanel: { backgroundColor: '#fffdfa', borderRadius: 12, borderWidth: 1, borderColor: '#e6ddd2', padding: 14, gap: 10 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  calendarTitle: { color: '#141a18', fontSize: 18, fontWeight: '900', textTransform: 'capitalize', marginTop: 3 },
  calendarNav: { flexDirection: 'row', gap: 6 },
  calendarNavButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  calendarWeekDay: { width: '14.28%', textAlign: 'center', color: '#8a918c', fontSize: 11, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  calendarCell: { width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, gap: 2 },
  calendarCellMarked: { backgroundColor: '#e4f1ea' },
  calendarCellActive: { backgroundColor: '#fff0c9' },
  calendarCellBusy: { backgroundColor: '#d9e8fb' },
  calendarDayText: { color: '#5e6762', fontWeight: '800' },
  calendarDayTextMarked: { color: '#174f42', fontWeight: '900' },
  calendarDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1b6b58' },
  calendarHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calendarHint: { color: '#6a716d', fontSize: 12, fontWeight: '700' },
  dayModalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 30, alignItems: 'center', justifyContent: 'center', padding: 16 },
  dayModalDismiss: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.58)' },
  dayModalCard: { width: '100%', maxWidth: 560, maxHeight: '76%', minWidth: 0, alignSelf: 'center', overflow: 'hidden', backgroundColor: '#fffdfa', borderRadius: 20, padding: 16, gap: 12, zIndex: 31, elevation: 16 },
  dayModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minWidth: 0 },
  dayModalHeaderCopy: { flex: 1, minWidth: 0 },
  dayModalTitle: { color: '#141a18', fontSize: 23, fontWeight: '900', marginTop: 3, textTransform: 'capitalize' },
  daySalesList: { maxHeight: 330 },
  daySaleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#eee7dc', paddingVertical: 11 },
  daySaleTitle: { color: '#141a18', fontWeight: '900' },
  daySaleTotal: { color: '#174f42', fontSize: 16, fontWeight: '900' },
  saleDetailMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  saleDetailMetaText: { color: '#174f42', backgroundColor: '#e4f1ea', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '900' },
  saleDetailItems: { maxHeight: 330 },
  saleDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#eee7dc', paddingVertical: 12 },
  saleDetailName: { color: '#141a18', fontWeight: '900' },
  dayModalTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff0c9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dayModalTotalLabel: { color: '#141a18', fontWeight: '900' },
  dayModalTotalValue: { color: '#141a18', fontSize: 20, fontWeight: '900' },
  historicalRow: { flexDirection: 'row', gap: 28, flexWrap: 'wrap' },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  paymentSettingsCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f1f7f3', borderRadius: 12, borderWidth: 1, borderColor: '#cfe2d5', padding: 14 },
  paymentMethodCard: { backgroundColor: '#fffdfa', borderRadius: 14, borderWidth: 1, borderColor: '#e5ddd3', borderLeftWidth: 5, padding: 14, gap: 14 },
  paymentMethodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentMethodTitle: { color: '#141a18', fontSize: 17, fontWeight: '900' },
  qrUploadRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qrPreviewSmall: { width: 86, height: 86, borderRadius: 12, borderWidth: 1, borderColor: '#d9e1db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  qrPreviewImage: { width: 80, height: 80 },
  qrPreviewText: { color: '#6a716d', fontWeight: '900' },
  uploadButton: { paddingVertical: 10, marginTop: 8 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  backLinkText: { color: '#174f42', fontWeight: '900' },
  preferenceTitle: { color: '#141a18', fontWeight: '900', fontSize: 16 },
  savedServer: { borderRadius: 10, borderWidth: 1, borderColor: '#d9e6de', backgroundColor: '#f1f7f3', paddingHorizontal: 12, paddingVertical: 10 },
  savedServerText: { color: '#174f42', fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: '#fffdfa', borderColor: '#d9d3c9', borderWidth: 1, borderRadius: 12, minHeight: 54, paddingHorizontal: 15, fontSize: 16, color: '#151a18' },
  inputLocked: { backgroundColor: '#f0eee9', color: '#6a716d' },
  primaryButton: { backgroundColor: '#174f42', borderRadius: 8, padding: 15, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryButton: { borderRadius: 8, borderColor: '#174f42', borderWidth: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#174f42', fontWeight: '900' },
  inlineActions: { flexDirection: 'row', gap: 10 },
  cartFab: { position: 'absolute', left: 24, right: 24, bottom: 78, maxWidth: 560, alignSelf: 'center', backgroundColor: '#174f42', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cartFabText: { color: '#fff', fontWeight: '900' },
  cartFabTotal: { color: '#fff', fontWeight: '900', fontSize: 18 },
  sheetBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.42)', zIndex: 11 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 78, maxWidth: 620, maxHeight: '72%', alignSelf: 'center', backgroundColor: '#fffdfa', borderRadius: 24, padding: 16, gap: 8, borderWidth: 1, borderColor: '#e5ddd3', zIndex: 12, elevation: 12 },
  sheetHandle: { width: 72, height: 6, borderRadius: 6, backgroundColor: '#d8d4ce', alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: '#141a18', fontSize: 26, fontWeight: '900' },
  closeButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#edf0ec', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#174f42', fontSize: 22, fontWeight: '900' },
  sheetItems: { maxHeight: 132 },
  cartRow: { borderTopColor: '#e7dfd4', borderTopWidth: 1, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { flex: 1 },
  cartName: { color: '#141a18', fontSize: 15, fontWeight: '900' },
  removeText: { color: '#a74035', fontWeight: '900', marginTop: 8 },
  stepper: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperMinus: { backgroundColor: '#fde8e5', borderColor: '#e2b2aa' },
  stepperPlus: { backgroundColor: '#e4f1ea', borderColor: '#a7cfb8' },
  stepperText: { color: '#174f42', fontSize: 22, fontWeight: '900' },
  qty: { minWidth: 34, textAlign: 'center', color: '#315b91', backgroundColor: '#e8eef8', borderRadius: 8, paddingVertical: 8, fontSize: 19, fontWeight: '900' },
  simpleLineTotal: { color: '#315b91', fontSize: 16, fontWeight: '900' },
  paymentBox: { backgroundColor: '#f1f2ed', borderRadius: 8, padding: 12, gap: 8 },
  paymentLabel: { color: '#141a18', fontWeight: '900' },
  segmented: { minHeight: 54, borderRadius: 12, backgroundColor: '#e2e4dd', flexDirection: 'row', padding: 5, gap: 5 },
  segmentActive: { flex: 1, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentCashActive: { backgroundColor: '#fff0c9', borderColor: '#e5c978', borderWidth: 1 },
  segmentDigitalActive: { backgroundColor: '#e8eef8', borderColor: '#b9c9e3', borderWidth: 1 },
  segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segmentText: { color: '#6a716d', fontWeight: '900' },
  segmentTextActive: { color: '#141a18' },
  segmentDisabled: { opacity: 0.45 },
  digitalPayment: { alignItems: 'center', gap: 4, paddingVertical: 2 },
  digitalTitle: { color: '#174f42', fontWeight: '900', fontSize: 16 },
  paymentQrFrame: { width: 150, height: 150, borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  paymentQrImage: { width: 138, height: 138 },
  qrMissingText: { color: '#6a716d', fontWeight: '800', textAlign: 'center', paddingHorizontal: 18 },
  digitalChoices: { flexDirection: 'row', gap: 6, width: '100%' },
  digitalChoice: { flex: 1, minHeight: 36, borderRadius: 8, backgroundColor: '#edf0ec', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  digitalChoiceActive: { backgroundColor: '#e4f1ea', borderWidth: 1, borderColor: '#9ac9ae' },
  digitalChoiceText: { color: '#6a716d', fontWeight: '900', fontSize: 12 },
  digitalChoiceTextActive: { color: '#174f42' },
  qrExpandBadge: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  qrHint: { color: '#174f42', fontSize: 12, fontWeight: '800' },
  qrOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 40, alignItems: 'center', justifyContent: 'center' },
  qrOverlayDismiss: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.82)' },
  qrModalCard: { width: '88%', maxWidth: 440, backgroundColor: '#fffdfa', borderRadius: 22, padding: 16, alignItems: 'center', gap: 10, elevation: 18 },
  qrModalHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qrModalTitle: { color: '#141a18', fontSize: 22, fontWeight: '900' },
  qrModalImage: { width: '100%', height: 340, backgroundColor: '#fff' },
  qrModalHint: { color: '#174f42', fontWeight: '900', fontSize: 16, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff0c9' },
  totalLabel: { color: '#141a18', fontSize: 20, fontWeight: '900' },
  totalValue: { color: '#141a18', fontSize: 32, fontWeight: '900' },
  bottomNav: { position: 'absolute', left: 14, right: 14, bottom: 0, height: 72, paddingHorizontal: 8, paddingTop: 7, backgroundColor: 'rgba(255,253,250,0.97)', borderColor: '#ded8cf', borderWidth: 1, borderRadius: 28, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 70, minHeight: 58, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 2 },
  navItemActive: { backgroundColor: '#e4f1ea' },
  navPressed: { opacity: 0.72, backgroundColor: '#d7ebe0' },
  navIconWrap: { width: 34, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navLabel: { color: '#8a8f8b', fontSize: 12, fontWeight: '900', marginTop: 2 },
  scannerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,26,24,0.72)', justifyContent: 'center', padding: 18, zIndex: 20 },
  scannerPanel: { backgroundColor: '#fffdfa', borderRadius: 18, padding: 18, gap: 12 },
  scannerTitle: { color: '#141a18', fontSize: 24, fontWeight: '900' },
  scannerCamera: { width: '100%', height: 300, borderRadius: 14, overflow: 'hidden' },
  navActive: { color: '#174f42' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  summaryCard: { backgroundColor: '#f6f1ea', borderRadius: 14, flexDirection: 'row', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' },
  reportSummaryScroll: { gap: 8, paddingRight: 8 },
  reportKpiSlot: { width: 150 },
  historyRow: { backgroundColor: '#fffdfa', borderRadius: 12, padding: 14, borderColor: '#e5ddd3', borderWidth: 1, gap: 10 },
  historySections: { gap: 18 },
  historySection: { gap: 8 },
  historyMoreButton: { backgroundColor: '#e4f1ea', borderColor: '#a7cfb8', borderWidth: 1, borderRadius: 12, padding: 15, alignItems: 'center' },
  historyMoreText: { color: '#174f42', fontWeight: '900' },
  historyModalCard: { width: '100%', maxWidth: 620, maxHeight: '82%', backgroundColor: '#fffdfa', borderRadius: 20, padding: 16, gap: 12, zIndex: 31, elevation: 16 },
  historyModalList: { maxHeight: 600 },
  historyModalItem: { marginBottom: 10 },
  historyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 66, minHeight: 28 },
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
  kpiToneGreen: { backgroundColor: '#e4f1ea', borderColor: '#a7cfb8' },
  kpiToneBlue: { backgroundColor: '#e8eef8', borderColor: '#b9c9e3' },
  kpiToneAmber: { backgroundColor: '#fff0c9', borderColor: '#e5c978' },
  kpiInverse: { minWidth: 120, flex: 1, backgroundColor: '#174f42', borderRadius: 12, padding: 14 },
  kpiMobile: { minWidth: 0, padding: 12, borderRadius: 12 },
  kpiLabel: { color: '#6a716d', fontWeight: '800' },
  kpiLabelInverse: { color: '#bfd0ca', fontWeight: '800' },
  kpiValue: { color: '#141a18', fontWeight: '900', fontSize: 28, marginTop: 4 },
  kpiValueInverse: { color: '#fff', fontWeight: '900', fontSize: 28, marginTop: 4 },
  kpiValueMobile: { fontSize: 22, marginTop: 2 },
  reportHero: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 18, gap: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  reportHeroText: { flex: 1, minWidth: 220 },
  reportHeroTitle: { color: '#141a18', fontSize: 24, fontWeight: '900', marginTop: 4 },
  reportHeroCopy: { color: '#6a716d', marginTop: 8, lineHeight: 20 },
  reportHeroBadge: { backgroundColor: '#174f42', borderRadius: 8, padding: 16, minWidth: 150 },
  reportHeroBadgeLabel: { color: '#bfd0ca', fontWeight: '800' },
  reportHeroBadgeValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 6 },
  reportHeroBadgeTotal: { color: '#fff', fontWeight: '900', marginTop: 4 },
  chart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  chartLarge: { height: 178, minWidth: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 4, paddingTop: 6 },
  chartLargeWide: { minWidth: 760 },
  chartCol: { flex: 1, minWidth: 34, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBarTrack: { width: 22, height: 128, justifyContent: 'flex-end', backgroundColor: '#edf1ed', borderRadius: 11, overflow: 'hidden' },
  chartBar: { width: '100%', minHeight: 5, backgroundColor: '#1b6b58', borderRadius: 11 },
  chartValue: { color: '#5f6964', fontSize: 10, fontWeight: '900', maxWidth: 48, height: 16 },
  chartLabel: { color: '#6a716d', fontSize: 10, marginTop: 2, fontWeight: '800', maxWidth: 46, textAlign: 'center' },
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
