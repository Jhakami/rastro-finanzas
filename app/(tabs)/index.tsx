import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildDailyExpenseTrend } from '@/application/analytics';
import { formatPEN } from '@/domain/money';
import { Card, EmptyState, LoadingView, MetricCard, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const weekdayShort = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function DashboardScreen() {
  const {
    accounts,
    balances,
    metrics,
    insights,
    categories,
    transactions,
    monthlyTransactions,
    loading,
    error,
  } = useFinance();
  const totalBalance = Object.values(balances).reduce((sum, value) => sum + value, 0);
  const pendingClassification = monthlyTransactions.filter(
    (item) => item.kind === 'expense' && item.categoryId === 'category-other',
  ).length;
  const categoryBars = useMemo(() => {
    const totals = new Map<string, number>();
    monthlyTransactions
      .filter((item) => item.kind === 'expense')
      .forEach((item) => {
        if (item.categoryId) {
          totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amountCents);
        }
      });
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const maximum = rows[0]?.[1] ?? 1;
    return rows.map(([categoryId, amount]) => ({
      category: categories.find((item) => item.id === categoryId),
      amount,
      width: `${Math.max(8, (amount / maximum) * 100)}%` as `${number}%`,
    }));
  }, [categories, monthlyTransactions]);
  const expenseTotal = categoryBars.reduce((sum, row) => sum + row.amount, 0);
  const dailyTrend = useMemo(() => buildDailyExpenseTrend(transactions, 7), [transactions]);
  const trendMaximum = Math.max(...dailyTrend.map((point) => point.amountCents), 1);
  const scatter = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.kind === 'expense')
        .slice(0, 30)
        .map((item) => {
          const date = new Date(item.occurredAt);
          return {
            id: item.id,
            amountCents: item.amountCents,
            hour: date.getHours() + date.getMinutes() / 60,
          };
        }),
    [monthlyTransactions],
  );
  const scatterMaximum = Math.max(...scatter.map((point) => point.amountCents), 1);
  const topCategoryName = metrics.topCategoryId
    ? (categories.find((item) => item.id === metrics.topCategoryId)?.name ?? 'Sin categoría')
    : 'Sin datos';

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Tu dinero, con contexto"
          title="Resumen del mes"
          action={
            <Link href="/new" asChild>
              <Pressable accessibilityLabel="Registrar movimiento" style={styles.add}>
                <Ionicons name="add" size={26} color={colors.onAccent} />
              </Pressable>
            </Link>
          }
        />
        {error ? (
          <Card style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}
        <MetricCard
          label="Saldo disponible"
          value={formatPEN(totalBalance)}
          hint="Yape + banco + efectivo"
          tone="dark"
        />
        <Text style={styles.sectionTitle}>Tus cuentas</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountRow}
        >
          {accounts.map((account) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={[styles.accountDot, { backgroundColor: account.color }]} />
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountValue}>{formatPEN(balances[account.id] ?? 0)}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.grid}>
          <MetricCard label="Gastaste" value={formatPEN(metrics.expenseCents)} hint="Este mes" />
          <MetricCard
            label="Recibiste"
            value={formatPEN(metrics.incomeCents)}
            hint={`Flujo ${formatPEN(metrics.netCents)}`}
            tone="green"
          />
          <MetricCard
            label="Proyección"
            value={formatPEN(metrics.projectedExpenseCents)}
            hint="Al cierre del mes"
          />
          <MetricCard
            label="Compras pequeñas"
            value={formatPEN(metrics.microExpenseCents)}
            hint={`${metrics.microCount} movimientos`}
          />
        </View>
        <Card>
          <View style={styles.cardHeading}>
            <View>
              <Text style={styles.cardKicker}>Lectura rápida</Text>
              <Text style={styles.cardTitle}>Dónde se concentra</Text>
            </View>
            <Ionicons name="analytics" size={22} color={colors.green} />
          </View>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>Categoría principal</Text>
            <Text style={styles.factValue}>{topCategoryName}</Text>
          </View>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>Hora con más compras</Text>
            <Text style={styles.factValue}>
              {metrics.busiestHour === null
                ? 'Sin datos'
                : `${String(metrics.busiestHour).padStart(2, '0')}:00`}
            </Text>
          </View>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>Día más activo</Text>
            <Text style={styles.factValue}>
              {metrics.busiestWeekday === null ? 'Sin datos' : weekdays[metrics.busiestWeekday]}
            </Text>
          </View>
          {pendingClassification ? (
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Pendientes de clasificar</Text>
              <Text style={styles.warningValue}>{pendingClassification}</Text>
            </View>
          ) : null}
        </Card>
        <Card>
          <Text style={styles.cardKicker}>Composición</Text>
          <Text style={styles.cardTitle}>En qué se fue el dinero</Text>
          {categoryBars.length ? (
            <View style={styles.bars}>
              <View style={styles.compositionTrack} accessibilityLabel="Composición del gasto">
                {categoryBars.map((bar) => (
                  <View
                    key={`segment-${bar.category?.id ?? 'unknown'}`}
                    style={[
                      styles.compositionSegment,
                      {
                        flex: bar.amount,
                        backgroundColor: bar.category?.color ?? colors.green,
                      },
                    ]}
                  />
                ))}
              </View>
              {categoryBars.map((bar) => (
                <View key={bar.category?.id ?? 'unknown'}>
                  <View style={styles.barLabel}>
                    <View style={styles.legendLabel}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: bar.category?.color ?? colors.green },
                        ]}
                      />
                      <Text style={styles.factLabel}>{bar.category?.name ?? 'Sin categoría'}</Text>
                    </View>
                    <Text style={styles.factValue}>
                      {expenseTotal ? `${Math.round((bar.amount / expenseTotal) * 100)} %` : '0 %'}{' '}
                      · {formatPEN(bar.amount)}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: bar.width,
                          backgroundColor: bar.category?.color ?? colors.green,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.evidence}>Registra gastos para ver la distribución.</Text>
          )}
        </Card>
        <Card>
          <Text style={styles.cardKicker}>Tendencia</Text>
          <Text style={styles.cardTitle}>Gasto diario · últimos 7 días</Text>
          {dailyTrend.some((point) => point.amountCents > 0) ? (
            <View style={styles.trendChart}>
              {dailyTrend.map((point) => (
                <View key={point.dateKey} style={styles.trendColumn}>
                  <Text style={styles.trendAmount} numberOfLines={1}>
                    {point.amountCents ? formatPEN(point.amountCents).replace('S/\u00a0', '') : '—'}
                  </Text>
                  <View style={styles.trendBarArea}>
                    <View
                      style={[
                        styles.trendBar,
                        {
                          height: point.amountCents
                            ? Math.max(8, (point.amountCents / trendMaximum) * 82)
                            : 2,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.axisLabel}>{weekdayShort[point.weekday]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.evidence}>Registra gastos para observar su evolución diaria.</Text>
          )}
        </Card>
        <Card>
          <Text style={styles.cardKicker}>Dispersión</Text>
          <Text style={styles.cardTitle}>Monto según hora de compra</Text>
          <Text style={styles.evidence}>
            Hasta 30 gastos del mes · arriba significa mayor monto.
          </Text>
          {scatter.length >= 3 ? (
            <>
              <View style={styles.scatterPlot}>
                <View style={[styles.gridLine, { bottom: '33%' }]} />
                <View style={[styles.gridLine, { bottom: '66%' }]} />
                {scatter.map((point) => (
                  <View
                    key={point.id}
                    accessibilityLabel={`${formatPEN(point.amountCents)} a las ${Math.floor(point.hour)} horas`}
                    style={[
                      styles.scatterDot,
                      {
                        left: `${Math.min(96, (point.hour / 24) * 96)}%`,
                        bottom: `${Math.min(92, (point.amountCents / scatterMaximum) * 92)}%`,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.axisRow}>
                {['00 h', '06 h', '12 h', '18 h', '24 h'].map((label) => (
                  <Text key={label} style={styles.axisLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.evidence}>
              Se necesitan al menos 3 gastos para evitar conclusiones engañosas.
            </Text>
          )}
        </Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patrones verificables</Text>
          <Link href="/insights" style={styles.link}>
            Ver todos
          </Link>
        </View>
        {insights.length ? (
          insights.slice(0, 2).map((insight) => (
            <Card key={insight.id} style={styles.insight}>
              <View style={styles.confidence}>
                <Text style={styles.confidenceText}>
                  {insight.confidence === 'insufficient'
                    ? 'EN APRENDIZAJE'
                    : insight.confidence === 'strong'
                      ? 'EVIDENCIA FUERTE'
                      : 'PATRÓN INICIAL'}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{insight.title}</Text>
              <Text style={styles.body}>{insight.summary}</Text>
              <Text style={styles.evidence}>{insight.evidence}</Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Aún no hay patrones"
            body="Tus hallazgos aparecerán cuando registres movimientos."
          />
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md },
  add: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { backgroundColor: colors.redSoft },
  errorText: { color: colors.red, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  accountRow: { gap: spacing.sm, paddingRight: spacing.md },
  accountCard: {
    width: 150,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  accountDot: { width: 10, height: 10, borderRadius: 5 },
  accountName: { marginTop: spacing.sm, color: colors.muted, fontWeight: '700' },
  accountValue: { marginTop: 4, color: colors.ink, fontWeight: '800', fontSize: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardKicker: {
    color: colors.green,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 3 },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  factLabel: { color: colors.muted, flexShrink: 1 },
  factValue: {
    color: colors.ink,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 12,
  },
  warningValue: { color: colors.red, fontWeight: '900' },
  bars: { gap: 13, marginTop: 16 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  compositionTrack: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.line,
    marginBottom: 4,
  },
  compositionSegment: { minWidth: 2 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  barTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: { height: 9, borderRadius: 5 },
  trendChart: { flexDirection: 'row', height: 138, marginTop: 14, gap: 5 },
  trendColumn: { flex: 1, alignItems: 'center' },
  trendAmount: { color: colors.muted, fontSize: 9, width: '100%', textAlign: 'center' },
  trendBarArea: { flex: 1, width: '70%', justifyContent: 'flex-end', marginVertical: 5 },
  trendBar: { width: '100%', borderRadius: 6, backgroundColor: colors.mauve },
  scatterPlot: {
    height: 150,
    marginTop: 16,
    marginHorizontal: 6,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  scatterDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    marginLeft: -4,
    marginBottom: -4,
    borderRadius: 5,
    backgroundColor: colors.teal,
    borderWidth: 1,
    borderColor: colors.crust,
  },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  axisLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { color: colors.green, fontWeight: '800' },
  insight: { gap: 7 },
  confidence: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.greenSoft,
    borderRadius: radius.pill,
  },
  confidenceText: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  body: { color: colors.ink, lineHeight: 21 },
  evidence: { color: colors.muted, fontSize: 12 },
  bottomSpace: { height: 12 },
});
