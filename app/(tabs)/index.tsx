import { useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildAnalysisView } from '@/application/analysis-view-model';
import { formatPEN } from '@/domain/money';
import {
  Card,
  Chip,
  EmptyState,
  LoadingView,
  MetricCard,
  ScreenHeader,
} from '@/presentation/components';
import { BudgetSummary } from '@/presentation/budget-summary';
import { useFinance } from '@/presentation/finance-provider';
import { colors, spacing } from '@/theme';

export default function DashboardScreen() {
  const { transactions, allAccounts, allCategories, allTags, balances, insights, loading, error } =
    useFinance();
  const [accountId, setAccountId] = useState<string | null>(null);
  const account = allAccounts.find((a) => a.id === accountId);
  const model = useMemo(
    () => buildAnalysisView(transactions, 'month', accountId, allCategories, allTags),
    [transactions, accountId, allCategories, allTags],
  );
  const balance = accountId
    ? (balances[accountId] ?? 0)
    : Object.values(balances).reduce((s, v) => s + v, 0);
  const insight =
    insights.find((i) => i.confidence === 'strong') ??
    insights.find((i) => i.confidence === 'emerging');
  if (loading) return <LoadingView />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Tu resumen" eyebrow="Registrar primero. Entender después." />
        <Link href="/new" asChild>
          <Pressable accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryText}>+ Registrar gasto</Text>
          </Pressable>
        </Link>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <MetricCard
          label={account ? 'Saldo actual · ' + account.name : 'Patrimonio registrado'}
          value={formatPEN(balance)}
          hint={
            account
              ? 'Saldo actual; no limitado al mes'
              : 'Todas las cuentas, incluidas las archivadas'
          }
        />
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
              label={a.name + (a.isArchived ? ' (archivada)' : '')}
              selected={a.id === accountId}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </ScrollView>
        <Link href="/accounts" style={styles.link}>
          Administrar cuentas y conciliar
        </Link>
        {accountId ? (
          <Link
            href={{ pathname: '/account-detail', params: { id: accountId } }}
            style={styles.link}
          >
            Ver detalle, historial y conciliación de esta cuenta →
          </Link>
        ) : null}
        <Card>
          <Text style={styles.title}>Este mes, hasta hoy</Text>
          <Text style={styles.help}>
            {account?.name ?? 'Todas las cuentas'} · {model.start.toLocaleDateString('es-PE')} –{' '}
            {new Date(model.end.getTime() - 1).toLocaleDateString('es-PE')}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Entradas</Text>
            <Text style={styles.amount}>{formatPEN(model.incomeCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gastos</Text>
            <Text style={styles.amount}>{formatPEN(model.expenseCents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Flujo neto</Text>
            <Text
              style={[styles.amount, { color: model.netCents < 0 ? colors.red : colors.green }]}
            >
              {formatPEN(model.netCents)}
            </Text>
          </View>
          <Text style={styles.help}>
            Entradas incluye reembolsos. Transferencias y conciliaciones no consumen el gasto
            mensual.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.secondary}
            onPress={() =>
              router.push({
                pathname: '/analysis',
                params: accountId ? { account: accountId } : {},
              })
            }
          >
            <Text style={styles.link}>Explorar flujo, gastos e informes →</Text>
          </Pressable>
        </Card>
        <Text style={styles.help}>
          Presupuestos con sus propios periodos y ámbitos, independientes del filtro de cuenta
          anterior.
        </Text>
        <BudgetSummary />
        <Card>
          <View style={styles.row}>
            <Text style={styles.title}>Movimientos recientes</Text>
            <Link href="/(tabs)/movements" style={styles.link}>
              Ver todos
            </Link>
          </View>
          <Text style={styles.help}>
            Hasta 5 registros de este mes · {account?.name ?? 'todas las cuentas'}
          </Text>
          {model.rows.slice(0, 5).map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/transaction-edit', params: { id: t.id } })}
              style={styles.recent}
            >
              <Text style={styles.label}>
                {t.merchant ||
                  t.source ||
                  allCategories.find((c) => c.id === t.categoryId)?.name ||
                  {
                    expense: 'Gasto',
                    income: 'Ingreso',
                    transfer: 'Transferencia',
                    refund: 'Reembolso',
                    adjustment: 'Conciliación',
                  }[t.kind]}
              </Text>
              <Text style={styles.help}>
                {allAccounts.find((a) => a.id === t.accountId)?.name} ·{' '}
                {new Date(t.occurredAt).toLocaleDateString('es-PE')}
              </Text>
              <Text style={styles.amount}>
                {t.kind === 'expense'
                  ? '-'
                  : t.kind === 'transfer'
                    ? '↔ '
                    : t.amountCents >= 0
                      ? '+'
                      : ''}
                {formatPEN(t.amountCents)}
              </Text>
            </Pressable>
          ))}
          {!model.rows.length ? (
            <EmptyState
              title="Todavía no hay movimientos"
              body="Registra un gasto o cambia la cuenta seleccionada."
            />
          ) : null}
        </Card>
        <Card>
          <Text style={styles.title}>Hallazgo prioritario</Text>
          <Text style={styles.help}>
            Análisis global de todas las cuentas; conserva su propio periodo y evidencia.
          </Text>
          <Text style={styles.label}>{insight?.title ?? 'Aún estamos reuniendo evidencia'}</Text>
          <Text style={styles.help}>
            {insight?.summary ??
              'No mostramos conclusiones hasta contar con una muestra suficiente.'}
          </Text>
          {insight ? (
            <Text style={styles.help}>
              {insight.period} · {insight.sampleSize} registros
            </Text>
          ) : null}
          <Link href="/insights" style={styles.link}>
            Ver patrones y evidencia →
          </Link>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: 16, paddingBottom: 40 },
  primary: { padding: 18, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '800', color: colors.onAccent },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, flexShrink: 1 },
  help: { fontSize: 13, lineHeight: 20, color: colors.muted, marginVertical: 6 },
  label: { color: colors.ink, flex: 1, fontSize: 15 },
  amount: { fontWeight: '800', color: colors.ink, fontSize: 17, flexShrink: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', gap: 8 },
  link: { color: colors.green, fontWeight: '700', paddingVertical: 10 },
  secondary: { marginTop: 12, paddingVertical: 6 },
  recent: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  error: { color: colors.red },
});
