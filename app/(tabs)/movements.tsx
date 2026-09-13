import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCategoryPath } from '@/domain/categories';
import { formatPEN } from '@/domain/money';
import { Card, Chip, EmptyState, LoadingView, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

type Filter = 'all' | 'expense' | 'income' | 'transfer';

export default function MovementsScreen() {
  const { transactions, accounts, categories, deleteTransaction, loading } = useFinance();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () =>
      transactions.filter((item) => {
        if (filter !== 'all' && item.kind !== filter) return false;
        const category = getCategoryPath(item.categoryId, categories);
        return `${item.merchant ?? ''} ${item.note ?? ''} ${item.source ?? ''} ${category}`
          .toLowerCase()
          .includes(query.toLowerCase());
      }),
    [transactions, categories, filter, query],
  );
  if (loading) return <LoadingView />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <ScreenHeader
          eyebrow="Todo queda registrado"
          title="Movimientos"
          action={
            <Link href="/new" asChild>
              <Pressable style={styles.add}>
                <Ionicons name="add" size={24} color={colors.white} />
              </Pressable>
            </Link>
          }
        />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar comercio, nota o categoría"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <ScrollView
          horizontal
          style={styles.filterScroller}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(
            [
              ['all', 'Todos'],
              ['expense', 'Gastos'],
              ['income', 'Ingresos'],
              ['transfer', 'Transferencias'],
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={filter === value}
              onPress={() => setFilter(value)}
            />
          ))}
        </ScrollView>
        <ScrollView style={styles.listScroller} contentContainerStyle={styles.list}>
          {visible.length ? (
            visible.map((item) => {
              const account = accounts.find((candidate) => candidate.id === item.accountId);
              const category = categories.find((candidate) => candidate.id === item.categoryId);
              const incoming = item.kind === 'income' || item.kind === 'refund';
              return (
                <Pressable
                  key={item.id}
                  onLongPress={() =>
                    Alert.alert('Eliminar movimiento', 'Podrá recuperarse desde la auditoría.', [
                      { text: 'Cancelar' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () => void deleteTransaction(item.id),
                      },
                    ])
                  }
                >
                  <Card style={styles.row}>
                    <View
                      style={[
                        styles.icon,
                        {
                          backgroundColor: `${category?.color ?? account?.color ?? colors.muted}22`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? 'swap-vertical'}
                        size={20}
                        color={category?.color ?? account?.color ?? colors.muted}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>
                        {item.merchant || item.source || category?.name || 'Movimiento'}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {account?.name} ·{' '}
                        {format(new Date(item.occurredAt), 'd MMM, HH:mm', { locale: es })}
                        {item.location ? ' · zona guardada' : ''}
                      </Text>
                      {item.kind === 'expense' ? (
                        <Text style={styles.categoryPath}>
                          {getCategoryPath(item.categoryId, categories)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.amount, incoming && styles.income]}>
                      {incoming ? '+' : item.kind === 'transfer' ? '→ ' : '-'}
                      {formatPEN(Math.abs(item.amountCents))}
                    </Text>
                  </Card>
                </Pressable>
              );
            })
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="Sin movimientos"
              body="Registra tu primera compra o recarga con el botón +."
            />
          )}
          <Text style={styles.tip}>
            Mantén presionado un movimiento para eliminarlo con trazabilidad.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.md },
  add: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.ink, paddingVertical: 13, marginLeft: 8 },
  filterScroller: { flexGrow: 0, flexShrink: 0, height: 54 },
  filters: { gap: 8, paddingVertical: 8, alignItems: 'center' },
  listScroller: { flex: 1 },
  list: { gap: 8, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0, marginLeft: 11, marginRight: 8 },
  rowTitle: { color: colors.ink, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  categoryPath: { color: colors.green, fontSize: 11, marginTop: 3, fontWeight: '700' },
  amount: { color: colors.red, fontWeight: '900', fontSize: 14, flexShrink: 0 },
  income: { color: colors.green },
  tip: { color: colors.muted, textAlign: 'center', fontSize: 12, padding: spacing.md },
});
