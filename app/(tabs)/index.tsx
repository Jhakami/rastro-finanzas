import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildDailyExpenseTrend } from '@/application/analytics';
import { formatPEN } from '@/domain/money';
import { Card, EmptyState, LoadingView, MetricCard, ScreenHeader } from '@/presentation/components';
import { AreaTrendChart, DonutChart, PastelBarChart, ScatterChart } from '@/presentation/charts';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const weekdayShort = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export default function DashboardScreen() {
  const [trendDays, setTrendDays] = useState<7 | 14 | 30>(7);
  const [trendMode, setTrendMode] = useState<'area' | 'bars'>('area');
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
  const dailyTrend = useMemo(
    () => buildDailyExpenseTrend(transactions, trendDays),
    [transactions, trendDays],
  );
  const trendData = dailyTrend.map((point) => ({
    label:
      trendDays === 7
        ? (weekdayShort[point.weekday] ?? '?')
        : String(Number(point.dateKey.slice(-2))),
    value: point.amountCents,
    color: point.count > 1 ? colors.mauve : colors.blue,
  }));
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
          label="Patrimonio registrado"
          value={formatPEN(totalBalance)}
          hint="Incluye cuentas archivadas para no ocultar saldo"
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
              <View style={styles.donutRow}>
                <DonutChart
                  data={categoryBars.map((bar) => ({
                    label: bar.category?.name ?? 'Sin categoría',
                    value: bar.amount,
                    color: bar.category?.color ?? colors.green,
                  }))}
                  centerValue={categoryBars.length.toString()}
                  centerLabel={categoryBars.length === 1 ? 'categoría' : 'categorías'}
                />
                <View style={styles.donutSummary}>
                  <Text style={styles.summaryLabel}>TOTAL DEL MES</Text>
                  <Text style={styles.summaryValue}>{formatPEN(expenseTotal)}</Text>
                  <Text style={styles.evidence}>
                    Toca una sección para ver su monto; tócala otra vez para cerrarlo.
                  </Text>
                </View>
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
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.cardKicker}>Tendencia</Text>
              <Text style={styles.cardTitle}>Evolución del gasto diario</Text>
            </View>
            <View style={styles.modeRow}>
              {(['area', 'bars'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setTrendMode(mode)}
                  style={[styles.iconToggle, trendMode === mode && styles.toggleActive]}
                >
                  <Ionicons
                    name={mode === 'area' ? 'trending-up' : 'bar-chart'}
                    size={16}
                    color={trendMode === mode ? colors.crust : colors.muted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.periodRow}>
            {([7, 14, 30] as const).map((days) => (
              <Pressable
                key={days}
                onPress={() => setTrendDays(days)}
                style={[styles.periodChip, trendDays === days && styles.periodChipActive]}
              >
                <Text style={[styles.periodText, trendDays === days && styles.periodTextActive]}>
                  {days} días
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.chartHint}>
            Toca una barra o punto para consultar el monto; repite el toque para cerrarlo.
          </Text>
          {dailyTrend.some((point) => point.amountCents > 0) ? (
            trendMode === 'area' ? (
              <AreaTrendChart data={trendData} />
            ) : (
              <PastelBarChart data={trendData} />
            )
          ) : (
            <Text style={styles.evidence}>Registra gastos para observar su evolución diaria.</Text>
          )}
        </Card>
        <Card>
          <Text style={styles.cardKicker}>Dispersión</Text>
          <Text style={styles.cardTitle}>Monto según hora de compra</Text>
          <Text style={styles.evidence}>
            Hasta 30 gastos del mes · toca un punto para ver monto y hora.
          </Text>
          {scatter.length >= 3 ? (
            <ScatterChart
              points={scatter.map((point) => ({
                id: point.id,
                x: point.hour,
                y: point.amountCents,
              }))}
            />
          ) : (
            <Text style={styles.evidence}>
              Se necesitan al menos 3 gastos para evitar conclusiones engañosas.
            </Text>
          )}
          {scatter.length >= 3 ? (
            <View style={styles.scatterLegend}>
              {[
                [colors.teal, 'Monto bajo'],
                [colors.blue, 'Monto medio'],
                [colors.pink, 'Monto alto'],
              ].map(([color, label]) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donutSummary: { flex: 1, gap: 5 },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  summaryValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  legendLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  barTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: { height: 9, borderRadius: 5 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeRow: { flexDirection: 'row', gap: 6 },
  iconToggle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.mauve },
  periodRow: { flexDirection: 'row', gap: 7, marginTop: 14 },
  periodChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface1,
  },
  periodChipActive: { backgroundColor: colors.blue },
  periodText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  periodTextActive: { color: colors.crust },
  chartHint: { color: colors.muted, fontSize: 11, marginTop: 9 },
  scatterLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
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
