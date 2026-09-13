import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatPEN } from '@/domain/money';
import { Card, EmptyState, LoadingView, MetricCard, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export default function DashboardScreen() {
  const { accounts, balances, metrics, insights, categories, monthlyTransactions, loading, error } =
    useFinance();
  const totalBalance = Object.values(balances).reduce((sum, value) => sum + value, 0);
  const topCategory = categories.find((item) => item.id === metrics.topCategoryId);
  const categoryBars = useMemo(() => {
    const totals = new Map<string, number>();
    monthlyTransactions
      .filter((item) => item.kind === 'expense')
      .forEach((item) => {
        if (item.categoryId) {
          totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + item.amountCents);
        }
      });
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const maximum = rows[0]?.[1] ?? 1;
    return rows.map(([categoryId, amount]) => ({
      category: categories.find((item) => item.id === categoryId),
      amount,
      width: `${Math.max(8, (amount / maximum) * 100)}%` as `${number}%`,
    }));
  }, [categories, monthlyTransactions]);

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
                <Ionicons name="add" size={26} color={colors.white} />
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
            <Text style={styles.factValue}>{topCategory?.name ?? 'Sin datos'}</Text>
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
        </Card>
        <Card>
          <Text style={styles.cardKicker}>Distribución</Text>
          <Text style={styles.cardTitle}>Gasto por categoría</Text>
          {categoryBars.length ? (
            <View style={styles.bars}>
              {categoryBars.map((bar) => (
                <View key={bar.category?.id ?? 'unknown'}>
                  <View style={styles.barLabel}>
                    <Text style={styles.factLabel}>{bar.category?.name ?? 'Otros'}</Text>
                    <Text style={styles.factValue}>{formatPEN(bar.amount)}</Text>
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
  factLabel: { color: colors.muted },
  factValue: { color: colors.ink, fontWeight: '800' },
  bars: { gap: 13, marginTop: 16 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barFill: { height: 9, borderRadius: 5 },
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
