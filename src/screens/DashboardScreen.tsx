import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { useAuth } from '../auth/AuthContext'
import {
  useDashboardSummary,
  useLowStock,
  usePaymentMethodTotals,
  useSalesByBranch,
  useSalesTrend,
  useTopItems,
} from '../hooks/useDashboard'
import type { RootStackParamList } from '../../App'
import type { DashboardSummary } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' })

const BRAND = '#2563eb'
const BRAND_LIGHT = '#60a5fa'
const GOLD = '#b58a2a'

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

const PAYMENT_COLOR: Record<string, string> = {
  cash: BRAND,
  card: GOLD,
  transfer: BRAND_LIGHT,
}

function TrendArea({ data }: { data: { day: string; total: number }[] }) {
  const width = 300
  const height = 120
  const padding = 8
  const max = Math.max(1, ...data.map((d) => d.total))
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const points = data.map((d, i) => ({
    x: padding + stepX * i,
    y: height - padding - (d.total / max) * (height - padding * 2),
    total: d.total,
    day: d.day,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const baseline = height - padding
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`
      : ''

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {points.length > 0 && (
          <>
            <Path d={areaPath} fill="url(#trendFill)" />
            <Path
              d={linePath}
              fill="none"
              stroke={BRAND}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p) => (
              <Circle key={p.day} cx={p.x} cy={p.y} r={3} fill={BRAND} />
            ))}
          </>
        )}
      </Svg>
      <View style={styles.trendLabels}>
        {data.map((d) => (
          <Text key={d.day} style={styles.trendLabel}>
            {weekday.format(new Date(`${d.day}T00:00:00`))}
          </Text>
        ))}
      </View>
    </View>
  )
}

function PaymentDonut({ data }: { data: { method: string; total: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <View style={styles.donutRow}>
      <View style={styles.donutChart}>
        <Svg width={128} height={128} viewBox="0 0 100 100" style={styles.donutSvg}>
          <Circle cx={50} cy={50} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={14} />
          {total > 0 &&
            data.map((d) => {
              const fraction = d.total / total
              const length = fraction * circumference
              const el = (
                <Circle
                  key={d.method}
                  cx={50}
                  cy={50}
                  r={radius}
                  fill="none"
                  stroke={PAYMENT_COLOR[d.method] ?? '#9ca3af'}
                  strokeWidth={14}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              )
              offset += length
              return el
            })}
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutCenterLabel}>TOTAL</Text>
          <Text style={styles.donutCenterValue}>{currency.format(total)}</Text>
        </View>
      </View>
      <View style={styles.donutLegend}>
        {data.map((d) => (
          <View key={d.method} style={styles.donutLegendRow}>
            <View style={[styles.donutDot, { backgroundColor: PAYMENT_COLOR[d.method] ?? '#9ca3af' }]} />
            <Text style={styles.donutLegendLabel}>{PAYMENT_LABEL[d.method] ?? d.method}</Text>
            <Text style={styles.donutLegendValue}>{currency.format(d.total)}</Text>
          </View>
        ))}
        {data.length === 0 && <Text style={styles.emptyText}>Sin pagos todavía.</Text>}
      </View>
    </View>
  )
}

function SummaryCard({
  label,
  value,
  loading,
  tone = 'brand',
}: {
  label: string
  value: string
  loading: boolean
  tone?: 'brand' | 'danger'
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone === 'danger' && styles.textDanger]}>
        {loading ? '—' : value}
      </Text>
    </View>
  )
}

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>

export default function DashboardScreen({ navigation }: Props) {
  const { membership } = useAuth()
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary()

  if (!membership) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={styles.loading} color={BRAND} />
      </View>
    )
  }

  const isManager = membership.role === 'administrador' || membership.role === 'gerente'

  return isManager ? (
    <ManagerDashboard summary={summary} loadingSummary={loadingSummary} navigation={navigation} />
  ) : (
    <VendorDashboard summary={summary} loadingSummary={loadingSummary} navigation={navigation} />
  )
}

function VendorDashboard({
  summary,
  loadingSummary,
  navigation,
}: {
  summary?: DashboardSummary
  loadingSummary: boolean
  navigation: Props['navigation']
}) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <SummaryCard
        label="Ventas de hoy"
        value={`${currency.format(summary?.total ?? 0)} · ${summary?.salesCount ?? 0} ventas`}
        loading={loadingSummary}
      />
      <SummaryCard
        label="Cajas abiertas en tu sucursal"
        value={String(summary?.openCashSessions ?? 0)}
        loading={loadingSummary}
      />
      <TouchableOpacity style={styles.posBanner} onPress={() => navigation.navigate('Pos')}>
        <Text style={styles.posBannerText}>Ir al punto de venta →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBanner} onPress={() => navigation.navigate('Caja')}>
        <Text style={styles.secondaryBannerText}>Ir a caja →</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function ManagerDashboard({
  summary,
  loadingSummary,
  navigation,
}: {
  summary?: DashboardSummary
  loadingSummary: boolean
  navigation: Props['navigation']
}) {
  const { data: byBranch } = useSalesByBranch()
  const { data: trend } = useSalesTrend(7)
  const { data: paymentMethods } = usePaymentMethodTotals(7)
  const { data: topItems } = useTopItems(30, 5)
  const { data: lowStock } = useLowStock()

  const maxBranch = Math.max(1, ...(byBranch ?? []).map((b) => b.total))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('Pos')}
        >
          <Text style={styles.quickActionText}>Punto de venta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickAction, styles.quickActionSecondary]}
          onPress={() => navigation.navigate('Caja')}
        >
          <Text style={[styles.quickActionText, styles.quickActionTextSecondary]}>Caja</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard
          label="Venta de hoy"
          value={`${currency.format(summary?.total ?? 0)} · ${summary?.salesCount ?? 0} ventas`}
          loading={loadingSummary}
        />
        <SummaryCard
          label="Cajas abiertas"
          value={String(summary?.openCashSessions ?? 0)}
          loading={loadingSummary}
        />
        <SummaryCard
          label="Stock bajo"
          value={String(lowStock?.length ?? 0)}
          loading={false}
          tone={lowStock && lowStock.length > 0 ? 'danger' : 'brand'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ventas — últimos 7 días</Text>
        {trend && trend.length > 0 ? (
          <TrendArea data={trend} />
        ) : (
          <Text style={styles.emptyText}>Sin datos todavía.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Métodos de pago (7 días)</Text>
        <PaymentDonut data={paymentMethods ?? []} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Venta por sucursal (hoy)</Text>
        {(byBranch ?? []).map((branch) => (
          <View key={branch.branchId} style={styles.branchRow}>
            <Text style={styles.branchName} numberOfLines={1}>
              {branch.branchName}
            </Text>
            <View style={styles.branchBarTrack}>
              <View
                style={[styles.branchBarFill, { width: `${(branch.total / maxBranch) * 100}%` }]}
              />
            </View>
            <Text style={styles.branchTotal}>{currency.format(branch.total)}</Text>
          </View>
        ))}
        {(!byBranch || byBranch.length === 0) && (
          <Text style={styles.emptyText}>Sin sucursales todavía.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Más vendidos (30 días)</Text>
        {(topItems ?? []).map((item) => (
          <View key={`${item.itemType}-${item.name}`} style={styles.topItemRow}>
            <Text style={styles.topItemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.topItemValue}>
              {item.quantity} · {currency.format(item.total)}
            </Text>
          </View>
        ))}
        {(!topItems || topItems.length === 0) && (
          <Text style={styles.emptyText}>Aún no hay ventas.</Text>
        )}
      </View>

      {lowStock && lowStock.length > 0 && (
        <View style={[styles.card, styles.lowStockCard]}>
          <Text style={[styles.cardTitle, styles.textDanger]}>Stock bajo</Text>
          {lowStock.map((item) => (
            <View key={`${item.businessProductId}-${item.branchId}`} style={styles.topItemRow}>
              <Text style={styles.topItemName} numberOfLines={1}>
                {item.name} — {item.branchName}
              </Text>
              <Text style={styles.textDanger}>
                {item.stock} / mín. {item.minimumStock}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loading: {
    marginTop: 32,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  posBanner: {
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: 'center',
  },
  posBannerText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBanner: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBannerText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAction: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickActionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  quickActionTextSecondary: {
    color: '#334155',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  trendLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  donutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
  },
  donutChart: {
    width: 128,
    height: 128,
  },
  donutSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  donutCenterValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  donutLegend: {
    gap: 6,
  },
  donutLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donutDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendLabel: {
    width: 100,
    fontSize: 13,
    color: '#64748b',
  },
  donutLegendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  branchName: {
    width: 72,
    fontSize: 12,
    color: '#64748b',
  },
  branchBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  branchBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  branchTotal: {
    width: 76,
    fontSize: 12,
    textAlign: 'right',
    color: '#334155',
  },
  topItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  topItemName: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    color: '#334155',
  },
  topItemValue: {
    fontSize: 13,
    color: '#94a3b8',
  },
  lowStockCard: {
    borderColor: '#fecaca',
  },
  textDanger: {
    color: '#dc2626',
  },
})
