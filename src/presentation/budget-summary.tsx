import { Link } from 'expo-router';
import { Text, View, StyleSheet, Pressable } from 'react-native';
import { Card } from './components';
import { useBudgetStore } from './budget-store';
import type { BudgetProgress } from '@/domain/budgets';
import { formatPEN } from '@/domain/money';
import { colors } from '@/theme';

export const periodLabels = { monthly: 'Mensual', weekly: 'Semanal', yearly: 'Anual' } as const;
export function BudgetProgressCard({ progress: p }: { progress: BudgetProgress }) {
  const color =
    p.status === 'exceeded' ? colors.red : p.status === 'warning' ? colors.yellow : colors.green;
  return (
    <Card>
      <Text style={styles.title}>{p.budget.name}</Text>
      <Text style={styles.meta}>
        {periodLabels[p.budget.period]} · {new Date(p.start).toLocaleDateString('es-PE')} –{' '}
        {new Date(new Date(p.end).getTime() - 1).toLocaleDateString('es-PE')}
      </Text>
      <Text style={styles.text}>
        Gastado {formatPEN(p.spentCents)} de {formatPEN(p.budget.amountCents)}
      </Text>
      <Text style={[styles.text, { color }]}>
        {p.remainingCents < 0 ? 'Exceso' : 'Disponible'} {formatPEN(Math.abs(p.remainingCents))} ·{' '}
        {p.percentage.toFixed(0)} %
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.min(100, p.percentage),
          text: `${p.percentage.toFixed(0)} por ciento utilizado`,
        }}
        style={styles.track}
      >
        <View
          style={{ height: 8, width: `${Math.min(100, p.percentage)}%`, backgroundColor: color }}
        />
      </View>
      <Text style={[styles.meta, { color }]}>
        {p.status === 'exceeded'
          ? 'Límite alcanzado'
          : p.status === 'warning'
            ? 'Cerca del límite'
            : 'Dentro del presupuesto'}{' '}
        · {p.count} gastos
      </Text>
    </Card>
  );
}
export function BudgetSummary() {
  const progress = useBudgetStore((s) => s.progress),
    error = useBudgetStore((s) => s.error);
  return (
    <View style={{ gap: 10 }}>
      <Link href="/budgets" asChild>
        <Pressable accessibilityRole="button" style={{ paddingVertical: 12 }}>
          <Text style={styles.title}>Presupuestos · Administrar →</Text>
        </Pressable>
      </Link>
      {error ? <Text style={styles.meta}>{error}</Text> : null}
      {!progress.length ? (
        <Text style={styles.meta}>Define cuánto quieres gastar este mes.</Text>
      ) : (
        progress.slice(0, 3).map((p) => <BudgetProgressCard key={p.budget.id} progress={p} />)
      )}
      {progress.length > 1 ? (
        <Text style={styles.meta}>
          Cada presupuesto se evalúa por separado; pueden compartir gastos.
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  text: { color: colors.ink, marginTop: 8 },
  meta: { color: colors.muted, marginTop: 6, fontSize: 12 },
  track: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
});
