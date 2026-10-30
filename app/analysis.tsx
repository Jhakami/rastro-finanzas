import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { buildAnalysisView, type AnalysisPeriod } from '@/application/analysis-view-model';
import { calculateMetrics } from '@/application/analytics';
import { formatPEN } from '@/domain/money';
import { Card, Chip, EmptyState, LoadingView, ScreenHeader } from '@/presentation/components';
import { DonutChart, ScatterChart } from '@/presentation/charts';
import { FlowChart } from '@/presentation/flow-chart';
import { useFinance } from '@/presentation/finance-provider';
import { colors, spacing } from '@/theme';

export default function AnalysisScreen() {
  const params = useLocalSearchParams<{ account?: string }>();
  const {
    transactions,
    allAccounts,
    allCategories,
    allTags,
    balances,
    microThresholdCents,
    loading,
    error,
  } = useFinance();
  const [period, setPeriod] = useState<AnalysisPeriod>('month');
  const [selectedAccountId, setAccountId] = useState<string | null>(params.account ?? null);
  const accountId = allAccounts.some((a) => a.id === selectedAccountId) ? selectedAccountId : null;
  const [section, setSection] = useState<'flow' | 'expense' | 'report'>('flow');
  const [group, setGroup] = useState<'category' | 'tag'>('category');
  const [cumulative, setCumulative] = useState(false);
  const model = useMemo(
    () => buildAnalysisView(transactions, period, accountId, allCategories, allTags),
    [transactions, period, accountId, allCategories, allTags],
  );
  const groups = group === 'category' ? model.categoryTotals : model.tagTotals;
  const metrics = useMemo(
    () => calculateMetrics(model.rows, microThresholdCents),
    [model.rows, microThresholdCents],
  );
  const account = allAccounts.find((a) => a.id === accountId);
  const currentBalance = accountId
    ? (balances[accountId] ?? 0)
    : Object.values(balances).reduce((s, v) => s + v, 0);
  const scope = `${account?.name ?? 'Todas las cuentas'} · ${model.start.toLocaleDateString('es-PE')} – ${new Date(model.end.getTime() - 1).toLocaleDateString('es-PE')}`;
  if (loading) return <LoadingView />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Análisis"
          eyebrow="Entiende tu dinero"
          action={
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text style={styles.link}>Volver</Text>
            </Pressable>
          }
        />
        <Text style={styles.help}>
          El mismo periodo y cuenta se aplican al flujo, gastos e informes. El saldo actual se
          indica por separado.
        </Text>
        <View style={styles.chips}>
          {(
            [
              ['month', 'Este mes'],
              ['7d', '7 días'],
              ['30d', '30 días'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={period === value}
              onPress={() => setPeriod(value)}
            />
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="Todas las cuentas"
            selected={!accountId}
            onPress={() => setAccountId(null)}
          />
          {allAccounts.map((a) => (
            <Chip
              key={a.id}
              label={`${a.name}${a.isArchived ? ' (archivada)' : ''}`}
              selected={accountId === a.id}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </ScrollView>
        <Text style={styles.help}>{scope}</Text>
        <View style={styles.chips}>
          {(
            [
              ['flow', 'Flujo'],
              ['expense', 'Gastos'],
              ['report', 'Informes'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={section === value}
              onPress={() => setSection(value)}
            />
          ))}
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.help}>
            {error}
          </Text>
        ) : null}
        {section === 'flow' ? (
          <>
            <Card>
              <Text style={styles.title}>Saldo actual</Text>
              <Text style={styles.value}>{formatPEN(currentBalance)}</Text>
              <Text style={styles.help}>
                Saldo registrado de {account?.name ?? 'todas las cuentas, incluidas las archivadas'}
                . No es el flujo del periodo.
              </Text>
            </Card>
            <Card>
              <Text style={styles.title}>¿Entró más dinero del que salió?</Text>
              <Text
                style={[styles.value, { color: model.netCents < 0 ? colors.red : colors.green }]}
              >
                {formatPEN(model.netCents)}
              </Text>
              <AmountRow label="Entradas" value={model.incomeCents} />
              <AmountRow label="Gastos" value={model.expenseCents} />
              <Text style={styles.help}>
                Entradas incluye ingresos y reembolsos. Transferencias y conciliaciones no son
                ingresos ni gastos.
              </Text>
            </Card>
            <Card>
              <Text style={styles.title}>Flujo de caja</Text>
              <Text style={styles.help}>¿Qué días entró o salió más dinero?</Text>
              <View style={styles.chips}>
                <Chip
                  label="Tendencia"
                  selected={!cumulative}
                  onPress={() => setCumulative(false)}
                />
                <Chip label="Acumulado" selected={cumulative} onPress={() => setCumulative(true)} />
              </View>
              {model.incoming.length + model.expenses.length ? (
                <FlowChart
                  key={`${period}:${accountId}`}
                  data={model.daily}
                  cumulative={cumulative}
                />
              ) : (
                <EmptyState
                  title="Sin flujo registrado"
                  body="No hay ingresos ni gastos en este periodo y cuenta. No dibujamos movimientos ficticios."
                />
              )}
              <Text style={styles.help}>
                El acumulado empieza en cero al inicio del periodo; no representa el saldo de la
                cuenta.
              </Text>
            </Card>
          </>
        ) : null}
        {section === 'expense' ? (
          <>
            <Card>
              <Text style={styles.title}>¿En qué se fue el dinero?</Text>
              <Text style={styles.value}>{formatPEN(model.expenseCents)}</Text>
              <View style={styles.chips}>
                <Chip
                  label="Categorías"
                  selected={group === 'category'}
                  onPress={() => setGroup('category')}
                />
                <Chip
                  label="Etiquetas"
                  selected={group === 'tag'}
                  onPress={() => setGroup('tag')}
                />
              </View>
              {groups.length ? (
                <>
                  {group === 'category' ? (
                    <DonutChart
                      key={`${period}:${accountId}`}
                      data={groups}
                      centerValue={String(groups.length)}
                      centerLabel="categorías"
                    />
                  ) : (
                    <Text style={styles.help}>
                      Un gasto puede tener varias etiquetas. Estos importes se solapan: no deben
                      sumarse ni representarse como partes de una dona.
                    </Text>
                  )}
                  {groups.map((g) => (
                    <View key={g.id} style={styles.group}>
                      <AmountRow label={g.label} value={g.value} />
                      <View style={styles.track}>
                        <View
                          style={{
                            height: 7,
                            width: `${model.expenseCents ? (g.value / model.expenseCents) * 100 : 0}%`,
                            backgroundColor: g.color ?? colors.blue,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <EmptyState
                  title="Sin gastos"
                  body="Cambia de cuenta o periodo, o registra tu primer gasto."
                />
              )}
            </Card>
            <Card>
              <Text style={styles.title}>Tus 5 gastos mayores</Text>
              <Text style={styles.help}>Toca un gasto para consultar o corregir su registro.</Text>
              {model.topExpenses.map((t) => (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/transaction-edit', params: { id: t.id } })
                  }
                >
                  <AmountRow
                    label={
                      t.merchant ||
                      allCategories.find((c) => c.id === t.categoryId)?.name ||
                      'Gasto'
                    }
                    value={t.amountCents}
                  />
                </Pressable>
              ))}
              {!model.topExpenses.length ? (
                <Text style={styles.help}>Sin registros para este filtro.</Text>
              ) : null}
            </Card>
            <Card>
              <Text style={styles.title}>Monto y hora</Text>
              <Text style={styles.help}>
                Hasta 30 gastos del filtro seleccionado; toca un punto para consultar su valor.
              </Text>
              {model.expenses.length >= 3 ? (
                <ScatterChart
                  points={model.expenses.slice(0, 30).map((t) => ({
                    id: t.id,
                    x: new Date(t.occurredAt).getHours() + new Date(t.occurredAt).getMinutes() / 60,
                    y: t.amountCents,
                  }))}
                />
              ) : (
                <Text style={styles.help}>
                  Se necesitan al menos 3 gastos para mostrar la dispersión.
                </Text>
              )}
            </Card>
          </>
        ) : null}
        {section === 'report' ? (
          <Card>
            <Text style={styles.title}>El periodo en números</Text>
            <Text style={styles.help}>{scope}</Text>
            <Text style={styles.help}>
              {model.incoming.length} entradas · {model.expenses.length} gastos ·{' '}
              {model.daily.length} días calendario
            </Text>
            <AmountRow label="Total de entradas" value={model.incomeCents} />
            <AmountRow label="Total de gastos" value={model.expenseCents} />
            <AmountRow label="Flujo neto" value={model.netCents} />
            <AmountRow label="Gasto promedio por día" value={model.dailyExpenseAverageCents} />
            <AmountRow
              label="Gasto promedio por registro"
              value={model.recordExpenseAverageCents}
            />
            <Text style={styles.help}>
              El promedio diario incluye días sin gastos. Los importes se redondean a céntimos. No
              se calculan porcentajes contra una base vacía.
            </Text>
            <AmountRow label="Compras pequeñas" value={metrics.microExpenseCents} />
            <Text style={styles.help}>
              {metrics.microCount} gastos según tu umbral y las excepciones manuales.
            </Text>
            {period === 'month' && model.expenses.length > 0 ? (
              <>
                <AmountRow
                  label="Proyección de gasto al cierre del mes"
                  value={metrics.projectedExpenseCents}
                />
                <Text style={styles.help}>
                  Estimación lineal según el ritmo observado; no es un saldo futuro ni incorpora
                  pagos planificados.
                </Text>
              </>
            ) : null}
          </Card>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/new')}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>+ Registrar gasto</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
function AmountRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{formatPEN(value)}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: 16, paddingBottom: 40 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  value: { color: colors.ink, fontSize: 28, fontWeight: '800', marginVertical: 10 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 20, marginVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: { color: colors.green, paddingVertical: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  label: { color: colors.ink, flex: 1 },
  amount: { color: colors.ink, fontWeight: '700', flexShrink: 1 },
  group: { marginVertical: 6 },
  track: { height: 7, backgroundColor: colors.line, borderRadius: 4, overflow: 'hidden' },
  primary: { padding: 16, backgroundColor: colors.primary, borderRadius: 16, alignItems: 'center' },
  primaryText: { color: colors.onAccent, fontWeight: '800' },
});
