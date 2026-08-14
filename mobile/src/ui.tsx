import { memo, useEffect, useState } from 'react';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import {
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
  Minimize2,
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
  type CartItem,
  type Product,
  type Screen,
} from './domain';
import type { OfflineSale } from './offline';

export function screenTitle(screen: Screen) {
  if (screen === 'history') return 'Historial';
  if (screen === 'report') return 'Reporte';
  if (screen === 'settings') return 'Ajustes';
  return 'Nueva venta';
}

export function SectionTitle({ eyebrow, title, right, onRight }: { eyebrow: string; title: string; right?: string; onRight?: () => void }) {
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

export function CartSummary({ cart, total, onOpen, onConfirm }: { cart: CartItem[]; total: number; onOpen: () => void; onConfirm: () => void }) {
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

export function CartSheet({ cart, total, paymentMethod, simpleView, onPaymentMethod, safeBottom, onClose, onAdd, onRemoveOne, onRemove, onConfirm }: { cart: CartItem[]; total: number; paymentMethod: 'cash' | 'digital'; simpleView: boolean; onPaymentMethod: (method: 'cash' | 'digital') => void; safeBottom: number; onClose: () => void; onAdd: (product: Product) => void; onRemoveOne: (product: CartItem) => void; onRemove: (product: CartItem) => void; onConfirm: () => void }) {
  const [qrExpanded, setQrExpanded] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.sheet, { bottom: 96 + safeBottom }]}>
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
              <Text style={styles.cartName}>{item.name}</Text>
              {!simpleView ? <Text style={styles.muted}>{money(Number(item.price))} x {item.quantity} · {money(Number(item.price) * item.quantity)}</Text> : null}
              {!simpleView ? <Pressable onPress={() => onRemove(item)}><Text style={styles.removeText}>Quitar producto</Text></Pressable> : null}
            </View>
            {simpleView ? <Text style={styles.simpleLineTotal}>{money(Number(item.price) * item.quantity)}</Text> : <>
              <Pressable onPress={() => onRemoveOne(item)} style={({ pressed }) => [styles.stepper, pressed && styles.buttonPressed]}><Minus size={18} color="#174f42" /></Pressable>
              <Text style={styles.qty}>{item.quantity}</Text>
              <Pressable onPress={() => onAdd(item)} style={({ pressed }) => [styles.stepper, pressed && styles.buttonPressed]}><Plus size={18} color="#174f42" /></Pressable>
            </>}
          </View>
        ))}
      </ScrollView>
      <View style={styles.paymentBox}>
        <Text style={styles.paymentLabel}>Medio de pago</Text>
        <View style={styles.segmented}>
          <Pressable onPress={() => onPaymentMethod('cash')} style={({ pressed }) => [styles.segment, paymentMethod === 'cash' && styles.segmentActive, pressed && styles.buttonPressed]}>
            <WalletCards size={16} color={paymentMethod === 'cash' ? '#141a18' : '#6a716d'} />
            <Text style={[styles.segmentText, paymentMethod === 'cash' && styles.segmentTextActive]}>Efectivo</Text>
          </Pressable>
          <Pressable onPress={() => onPaymentMethod('digital')} style={({ pressed }) => [styles.segment, paymentMethod === 'digital' && styles.segmentActive, pressed && styles.buttonPressed]}>
            <WalletCards size={16} color={paymentMethod === 'digital' ? '#141a18' : '#6a716d'} />
            <Text style={[styles.segmentText, paymentMethod === 'digital' && styles.segmentTextActive]}>Yape / Plin</Text>
          </Pressable>
        </View>
        {paymentMethod === 'digital' ? (
          <View style={styles.digitalPayment}>
            <Text style={styles.digitalTitle}>Escanea para pagar</Text>
            <Pressable onPress={() => setQrExpanded((current) => !current)} style={[styles.paymentQrFrame, qrExpanded && styles.paymentQrFrameExpanded]}>
              <Image source={require('../yape-qr.jpg')} style={[styles.paymentQrImage, qrExpanded && styles.paymentQrImageExpanded]} resizeMode="contain" />
              <View style={styles.qrExpandBadge}>{qrExpanded ? <Minimize2 size={16} color="#174f42" /> : <Maximize2 size={16} color="#174f42" />}</View>
            </Pressable>
            <Text style={styles.qrHint}>{qrExpanded ? 'Toca para reducir' : 'Toca el QR para ampliar'}</Text>
            {!simpleView ? (
              <Text style={styles.muted}>Después de confirmar el pago, pulsa “Guardar venta pagada”.</Text>
            ) : null}
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
  );
}

// Tarjeta memoizada: al añadir un producto solo cambia el carrito, no se vuelve a
// renderizar cada una de las tarjetas del catálogo (importante con catálogos grandes).
export const ProductCard = memo(function ProductCard({ item, width, simpleView, highlighted, onPress }: { item: Product; width: DimensionValue; simpleView: boolean; highlighted?: boolean; onPress: (product: Product) => void }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (highlighted) pulse.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 150 }));
  }, [highlighted, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.025 }] }));
  return (
    <Animated.View style={[{ width }, pulseStyle]}>
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.productCard, highlighted && styles.productCardHighlighted, pressed && styles.productCardPressed, { width: '100%' }]}>
      <View style={styles.productCardTop}>
        <View style={styles.productIcon}><Package size={20} color="#174f42" strokeWidth={2.2} /></View>
        <Text style={styles.stockText}>{item.stock ?? 0} disponibles</Text>
      </View>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      {!simpleView ? <Text style={styles.productDescription} numberOfLines={2}>{item.description || 'Producto de venta'}</Text> : null}
      {!simpleView ? <Text style={styles.muted}>{item.category || 'General'}</Text> : null}
      <View style={styles.productFooter}>
        <Text style={styles.productPrice}>{money(Number(item.price))}</Text>
        <View style={styles.addBadge}><Plus size={20} color="#fff" strokeWidth={2.5} /></View>
      </View>
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

export function SaleRow({ sale, onDelete }: { sale: OfflineSale; onDelete: () => void }) {
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

export function Kpi({ label, value, inverse }: { label: string; value: string; inverse?: boolean }) {
  return (
    <View style={inverse ? styles.kpiInverse : styles.kpi}>
      <Text style={inverse ? styles.kpiLabelInverse : styles.kpiLabel}>{label}</Text>
      <Text style={inverse ? styles.kpiValueInverse : styles.kpiValue}>{value}</Text>
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
  globalSearch: { marginHorizontal: 24, marginBottom: 10, minHeight: 56, backgroundColor: '#fffdfa', borderRadius: 14, borderWidth: 1, borderColor: '#e1d8cc', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  globalSearchFocused: { borderColor: '#174f42', backgroundColor: '#ffffff' },
  globalSearchCompact: { marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#151a18', minHeight: 54, outlineWidth: 0 },
  clearButton: { paddingHorizontal: 14, alignSelf: 'stretch', justifyContent: 'center' },
  clearText: { color: '#174f42', fontWeight: '900' },
  searchPanel: { marginHorizontal: 24, marginBottom: 10, backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', overflow: 'hidden' },
  resultRow: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#eee7de', flexDirection: 'row', gap: 10, alignItems: 'center' },
  resultIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  resultIconText: { color: '#174f42', fontWeight: '900' },
  resultType: { width: 64, color: '#174f42', fontWeight: '900', fontSize: 11 },
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
  productCard: { backgroundColor: '#fffdfa', borderColor: '#e5ddd3', borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 168, gap: 5 },
  productCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  productIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  productCardPressed: { borderColor: '#174f42', backgroundColor: '#f1f7f3', transform: [{ scale: 0.985 }] },
  productCardHighlighted: { borderColor: '#5baf84', borderWidth: 2 },
  productName: { color: '#141a18', fontSize: 16, fontWeight: '900' },
  productDescription: { color: '#4d5853', marginTop: 8, lineHeight: 19 },
  stockText: { color: '#7b6659', fontWeight: '800', marginTop: 6, fontSize: 12 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8 },
  productPrice: { color: '#174f42', fontSize: 20, fontWeight: '900' },
  addBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#174f42', alignItems: 'center', justifyContent: 'center' },
  addBadgeText: { color: '#fff', fontSize: 22, fontWeight: '500', lineHeight: 24 },
  panel: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 16, gap: 12 },
  panelLarge: { backgroundColor: '#fffdfa', borderRadius: 8, borderWidth: 1, borderColor: '#e6ddd2', padding: 18, gap: 14 },
  periodTabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  periodTab: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ebe5dc' },
  periodTabActive: { backgroundColor: '#174f42' },
  periodTabText: { color: '#5e6762', fontWeight: '900' },
  periodTabTextActive: { color: '#fff' },
  historicalRow: { flexDirection: 'row', gap: 28, flexWrap: 'wrap' },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  preferenceTitle: { color: '#141a18', fontWeight: '900', fontSize: 16 },
  savedServer: { borderRadius: 10, borderWidth: 1, borderColor: '#d9e6de', backgroundColor: '#f1f7f3', paddingHorizontal: 12, paddingVertical: 10 },
  savedServerText: { color: '#174f42', fontSize: 13, fontWeight: '800' },
  input: { backgroundColor: '#fffdfa', borderColor: '#d9d3c9', borderWidth: 1, borderRadius: 12, minHeight: 54, paddingHorizontal: 15, fontSize: 16, color: '#151a18' },
  primaryButton: { backgroundColor: '#174f42', borderRadius: 8, padding: 15, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryButton: { borderRadius: 8, borderColor: '#174f42', borderWidth: 1, padding: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#174f42', fontWeight: '900' },
  inlineActions: { flexDirection: 'row', gap: 10 },
  cartFab: { position: 'absolute', left: 24, right: 24, bottom: 78, maxWidth: 560, alignSelf: 'center', backgroundColor: '#174f42', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  cartFabText: { color: '#fff', fontWeight: '900' },
  cartFabTotal: { color: '#fff', fontWeight: '900', fontSize: 18 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 78, maxWidth: 620, maxHeight: '86%', alignSelf: 'center', backgroundColor: '#fffdfa', borderRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: '#e5ddd3', zIndex: 12 },
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
  simpleLineTotal: { color: '#174f42', fontSize: 16, fontWeight: '900' },
  paymentBox: { backgroundColor: '#f1f2ed', borderRadius: 8, padding: 16, gap: 12 },
  paymentLabel: { color: '#141a18', fontWeight: '900' },
  segmented: { minHeight: 54, borderRadius: 12, backgroundColor: '#e2e4dd', flexDirection: 'row', padding: 5, gap: 5 },
  segmentActive: { flex: 1, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segment: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segmentText: { color: '#6a716d', fontWeight: '900' },
  segmentTextActive: { color: '#141a18' },
  digitalPayment: { alignItems: 'center', gap: 8, paddingVertical: 6 },
  digitalTitle: { color: '#174f42', fontWeight: '900', fontSize: 16 },
  paymentQrFrame: { width: 190, height: 150, borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center' },
  paymentQrImage: { width: 190, height: 338, transform: [{ translateY: -130 }] },
  paymentQrFrameExpanded: { width: 280, height: 280, borderRadius: 18 },
  paymentQrImageExpanded: { width: 260, height: 260, transform: [{ translateY: 0 }] },
  qrExpandBadge: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: '#e4f1ea', alignItems: 'center', justifyContent: 'center' },
  qrHint: { color: '#174f42', fontSize: 12, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
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
