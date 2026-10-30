import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ledgerRepository } from '@/infrastructure/ledger-repository';
import type { FinanceTransaction } from '@/domain/types';
import { formatPEN } from '@/domain/money';
import { Card, LoadingView, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { useLedgerStore } from '@/presentation/ledger-store';
import { colors, spacing } from '@/theme';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { allAccounts, balances, loading } = useFinance();
  const account = allAccounts.find((a) => a.id === id);
  const [items, setItems] = useState<FinanceTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPending(true);
      setError(null);
      setItems([]);
      if (!id) {
        setPending(false);
        return;
      }
      void ledgerRepository
        .page({ accountId: id })
        .then((page) => {
          if (active) setItems(page.items.slice(0, 5));
        })
        .catch((cause) => {
          if (active)
            setError(cause instanceof Error ? cause.message : 'No se cargó el historial.');
        })
        .finally(() => {
          if (active) setPending(false);
        });
      return () => {
        active = false;
      };
    }, [id]),
  );
  if (loading) return <LoadingView />;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={account?.name ?? 'Cuenta no disponible'} eyebrow="Detalle de cuenta" />
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.link}>Volver</Text>
        </Pressable>
        {account ? (
          <>
            <Card>
              <Text style={styles.help}>
                {account.isArchived ? 'Archivada · historial conservado' : 'Cuenta activa'} · PEN
              </Text>
              <Text style={styles.balance}>{formatPEN(balances[account.id] ?? 0)}</Text>
              <Text style={styles.help}>
                Saldo actual, incluidos transferencias y ajustes. No es el flujo del mes.
              </Text>
            </Card>
            {!account.isArchived ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/accounts', params: { reconcile: account.id } })
                }
              >
                <Text style={styles.link}>Conciliar con el saldo real →</Text>
              </Pressable>
            ) : (
              <Text style={styles.help}>
                Restaura la cuenta en Administrar cuentas antes de conciliar.
              </Text>
            )}
            <Pressable accessibilityRole="button" onPress={() => router.push('/accounts')}>
              <Text style={styles.link}>Administrar cuentas</Text>
            </Pressable>
            <Text style={styles.title}>Últimos movimientos</Text>
            {pending ? <Text style={styles.help}>Cargando…</Text> : null}
            {error ? (
              <Text accessibilityRole="alert" style={styles.help}>
                {error}
              </Text>
            ) : null}
            {!pending && !error && !items.length ? (
              <Text style={styles.help}>Todavía no hay movimientos en esta cuenta.</Text>
            ) : null}
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/transaction-edit', params: { id: item.id } })
                }
              >
                <Card>
                  <Text style={styles.title}>
                    {item.merchant ||
                      item.source ||
                      item.note ||
                      {
                        expense: 'Gasto',
                        income: 'Ingreso',
                        transfer: 'Transferencia',
                        refund: 'Reembolso',
                        adjustment: 'Conciliación',
                      }[item.kind]}
                  </Text>
                  <Text style={styles.help}>
                    {new Date(item.occurredAt).toLocaleDateString('es-PE')} ·{' '}
                    {formatPEN(item.amountCents)}
                  </Text>
                  {item.kind === 'transfer' ? (
                    <Text style={styles.help}>
                      {item.accountId === id ? 'Transferencia enviada' : 'Transferencia recibida'}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void useLedgerStore.getState().setQuery({ accountId: account.id });
                router.push({ pathname: '/(tabs)/movements', params: { account: account.id } });
              }}
            >
              <Text style={styles.link}>Ver historial completo de esta cuenta →</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.help}>Vuelve a Resumen y selecciona una cuenta existente.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 80 },
  link: { color: colors.green, fontWeight: '700', paddingVertical: 12 },
  help: { color: colors.muted },
  title: { color: colors.ink, fontWeight: '700' },
  balance: { color: colors.ink, fontSize: 30, fontWeight: '800', marginVertical: 12 },
});
