import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCategoryPath } from '@/domain/categories';
import { formatPEN } from '@/domain/money';
import { Card, Chip, EmptyState, LoadingView, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { useLedgerStore } from '@/presentation/ledger-store';
import { ledgerDateRange } from '@/domain/ledger';
import type { TransactionKind } from '@/domain/types';
import { colors, radius, spacing } from '@/theme';

type Filter = 'all' | TransactionKind;

export default function MovementsScreen() {
  const {
    allAccounts: accounts,
    allCategories,
    allTags,
    deleteTransaction,
    loading,
  } = useFinance();
  const savedQuery = useLedgerStore.getState().query;
  const [filter, setFilter] = useState<Filter>(savedQuery.kind ?? 'all');
  const [query, setQuery] = useState(savedQuery.text ?? '');
  const params = useLocalSearchParams<{ account?: string }>();
  const lastRouteAccount = useRef<string | undefined>(undefined);
  const [accountId, setAccountId] = useState(params.account ?? savedQuery.accountId ?? '');
  const [categoryId, setCategoryId] = useState(savedQuery.categoryId ?? '');
  const [tagIds, setTagIds] = useState<string[]>(savedQuery.tagIds ?? []);
  const [from, setFrom] = useState(
    savedQuery.from ? format(new Date(savedQuery.from), 'yyyy-MM-dd') : '',
  );
  const [through, setThrough] = useState(
    savedQuery.until ? format(new Date(Date.parse(savedQuery.until) - 1), 'yyyy-MM-dd') : '',
  );
  const [expanded, setExpanded] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const visible = useLedgerStore((state) => state.items);
  const pageLoading = useLedgerStore((state) => state.loading);
  const pageError = useLedgerStore((state) => state.error);
  const cursor = useLedgerStore((state) => state.cursor);
  const applied = useLedgerStore((state) => state.query);
  const setLedgerQuery = useLedgerStore((state) => state.setQuery);
  const loadMore = useLedgerStore((state) => state.loadMore);
  const refreshPage = useLedgerStore((state) => state.refresh);
  useFocusEffect(
    useCallback(() => {
      // Navigating back from correction reloads from page one, retaining applied filters.
      const current = useLedgerStore.getState().query;
      setAccountId(current.accountId ?? '');
      setFilter(current.kind ?? 'all');
      setQuery(current.text ?? '');
      setCategoryId(current.categoryId ?? '');
      setTagIds(current.tagIds ?? []);
      setFrom(current.from ? format(new Date(current.from), 'yyyy-MM-dd') : '');
      setThrough(
        current.until ? format(new Date(Date.parse(current.until) - 1), 'yyyy-MM-dd') : '',
      );
      if (params.account && params.account !== lastRouteAccount.current) {
        lastRouteAccount.current = params.account;
        setAccountId(params.account);
        void setLedgerQuery({ ...useLedgerStore.getState().query, accountId: params.account });
      } else void refreshPage();
    }, [
      params.account,
      refreshPage,
      setLedgerQuery,
      setAccountId,
      setFilter,
      setQuery,
      setCategoryId,
      setTagIds,
      setFrom,
      setThrough,
    ]),
  );
  function applyFilters() {
    try {
      const dates = ledgerDateRange(from, through);
      setFilterError(null);
      void setLedgerQuery({
        text: query,
        accountId: accountId || undefined,
        categoryId: categoryId || undefined,
        kind: filter === 'all' ? undefined : filter,
        tagIds,
        ...dates,
      });
      setExpanded(false);
    } catch (cause) {
      setFilterError(cause instanceof Error ? cause.message : 'Revisa las fechas.');
    }
  }
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
                <Ionicons name="add" size={24} color={colors.onAccent} />
              </Pressable>
            </Link>
          }
        />
        <Link href="/new" asChild>
          <Pressable accessibilityRole="button" style={styles.registerExpense}>
            <Text style={styles.registerExpenseText}>+ Registrar gasto</Text>
          </Pressable>
        </Link>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar comercio, nota, categoría o etiqueta"
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
              ['refund', 'Reembolsos'],
              ['adjustment', 'Conciliaciones'],
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 }}>
          <Chip
            label={expanded ? 'Ocultar filtros' : 'Cuenta, fechas y etiquetas'}
            onPress={() => setExpanded(!expanded)}
          />
          <Chip label="Aplicar filtros" onPress={applyFilters} />
          <Chip
            label="Limpiar"
            onPress={() => {
              setQuery('');
              setFilter('all');
              setAccountId('');
              setCategoryId('');
              setTagIds([]);
              setFrom('');
              setThrough('');
              setFilterError(null);
              void setLedgerQuery({});
            }}
          />
        </View>
        {expanded ? (
          <ScrollView style={{ maxHeight: 240 }}>
            <Text style={styles.tip}>
              Los filtros se combinan. Selecciona y pulsa Aplicar filtros.
            </Text>
            <ScrollView horizontal contentContainerStyle={styles.filters}>
              <Chip
                label="Todas las cuentas"
                selected={!accountId}
                onPress={() => setAccountId('')}
              />
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name + (a.isArchived ? ' (archivada)' : '')}
                  selected={accountId === a.id}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </ScrollView>
            <TextInput
              accessibilityLabel="Desde, AAAA-MM-DD"
              placeholder="Desde: AAAA-MM-DD"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={from}
              onChangeText={setFrom}
            />
            <TextInput
              accessibilityLabel="Hasta, AAAA-MM-DD"
              placeholder="Hasta: AAAA-MM-DD (incluido)"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={through}
              onChangeText={setThrough}
            />
            <ScrollView horizontal contentContainerStyle={styles.filters}>
              <Chip
                label="Todas las categorías"
                selected={!categoryId}
                onPress={() => setCategoryId('')}
              />
              {allCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={getCategoryPath(c.id, allCategories)}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </ScrollView>
            <Text style={styles.tip}>Debe contener todas las etiquetas seleccionadas.</Text>
            <ScrollView horizontal contentContainerStyle={styles.filters}>
              {allTags.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  selected={tagIds.includes(t.id)}
                  onPress={() =>
                    setTagIds((ids) =>
                      ids.includes(t.id) ? ids.filter((id) => id !== t.id) : [...ids, t.id],
                    )
                  }
                />
              ))}
            </ScrollView>
          </ScrollView>
        ) : null}
        {filterError || pageError ? (
          <Text accessibilityRole="alert" style={styles.tip}>
            {filterError || pageError}
          </Text>
        ) : null}
        <FlatList
          ListHeaderComponent={
            <Text style={styles.tip}>
              Filtros aplicados:{' '}
              {accounts.find((a) => a.id === applied.accountId)?.name ?? 'Todas las cuentas'}
              {applied.text ? ` · texto: ${applied.text}` : ''}
              {applied.kind
                ? ` · ${{ expense: 'Gastos', income: 'Ingresos', transfer: 'Transferencias', refund: 'Reembolsos', adjustment: 'Conciliaciones' }[applied.kind]}`
                : ''}
              {applied.categoryId ? ` · ${getCategoryPath(applied.categoryId, allCategories)}` : ''}
              {applied.tagIds?.length ? ` · ${applied.tagIds.length} etiquetas` : ''}
              {applied.from ? ` · desde ${format(new Date(applied.from), 'dd/MM/yyyy')}` : ''}
              {applied.until
                ? ` · hasta ${format(new Date(Date.parse(applied.until) - 1), 'dd/MM/yyyy')}`
                : ''}
            </Text>
          }
          data={visible}
          keyExtractor={(item) => item.id}
          style={styles.listScroller}
          contentContainerStyle={styles.list}
          refreshing={pageLoading && !visible.length}
          onRefresh={() => void refreshPage()}
          renderItem={({ item }) => {
            const account = accounts.find((candidate) => candidate.id === item.accountId);
            const category = allCategories.find((candidate) => candidate.id === item.categoryId);
            const incoming =
              item.kind === 'income' ||
              item.kind === 'refund' ||
              (item.kind === 'adjustment' && item.amountCents > 0);
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({ pathname: '/transaction-edit', params: { id: item.id } })
                }
                onLongPress={() =>
                  Alert.alert(
                    'Eliminar movimiento',
                    'Se ocultará del historial y quedará registrado en la auditoría.',
                    [
                      { text: 'Cancelar' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: () =>
                          void deleteTransaction(item.id).catch((cause) =>
                            Alert.alert(
                              'No se eliminó',
                              cause instanceof Error ? cause.message : 'Intenta nuevamente.',
                            ),
                          ),
                      },
                    ],
                  )
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
                        {getCategoryPath(item.categoryId, allCategories)}
                      </Text>
                    ) : null}
                    {item.tagIds?.length ? (
                      <View style={styles.tagRow}>
                        {item.tagIds.map((tagId) => {
                          const tag = allTags.find((candidate) => candidate.id === tagId);
                          if (!tag) return null;
                          return (
                            <View key={tag.id} style={[styles.tag, { borderColor: tag.color }]}>
                              <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.amount, incoming && styles.income]}>
                    {incoming ? '+' : item.kind === 'transfer' ? '→ ' : '-'}
                    {formatPEN(Math.abs(item.amountCents))}
                  </Text>
                </Card>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            !pageLoading ? (
              <EmptyState
                icon="receipt-outline"
                title="Sin movimientos"
                body="No hay registros para los filtros aplicados. Puedes limpiarlos o registrar un gasto."
              />
            ) : (
              <Text style={styles.tip}>Cargando movimientos…</Text>
            )
          }
          ListFooterComponent={
            <View>
              {cursor ? (
                <Chip
                  label={pageLoading ? 'Cargando…' : 'Cargar 50 más'}
                  onPress={() => void loadMore()}
                />
              ) : null}
              {pageError ? (
                <Chip
                  label="Reintentar"
                  onPress={() => void (cursor ? loadMore() : refreshPage())}
                />
              ) : null}
              <Text style={styles.tip}>
                Toca un movimiento para corregirlo. Mantenlo presionado para eliminarlo con
                trazabilidad.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  registerExpense: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  registerExpenseText: { color: colors.onAccent, fontWeight: '800', fontSize: 16 },
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
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '800' },
  amount: { color: colors.red, fontWeight: '900', fontSize: 14, flexShrink: 0 },
  income: { color: colors.green },
  tip: { color: colors.muted, textAlign: 'center', fontSize: 12, padding: spacing.md },
});
