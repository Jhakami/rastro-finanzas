import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  BudgetOverlapError,
  type Budget,
  type BudgetPeriod,
  type SaveBudgetInput,
} from '@/domain/budgets';
import { parseAmountToCents } from '@/domain/money';
import { getCategoryPath } from '@/domain/categories';
import { requestBudgetNotifications } from '@/application/budget-notifications';
import { Card, Chip, ScreenHeader } from '@/presentation/components';
import { BudgetProgressCard, periodLabels } from '@/presentation/budget-summary';
import { useBudgetStore } from '@/presentation/budget-store';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

export default function BudgetsScreen() {
  const { allAccounts, allCategories, allTags } = useFinance();
  const { items, progress, error, loading, refresh, save, archive, move } = useBudgetStore();
  const [editing, setEditing] = useState<Budget | null>(null),
    [open, setOpen] = useState(false);
  const [name, setName] = useState(''),
    [amount, setAmount] = useState(''),
    [warning, setWarning] = useState('80');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly'),
    [notify, setNotify] = useState(false);
  const [accountIds, setAccountIds] = useState<string[]>([]),
    [categoryIds, setCategoryIds] = useState<string[]>([]),
    [tagIds, setTagIds] = useState<string[]>([]);
  const [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false),
    [askingPermission, setAskingPermission] = useState(false);
  const lock = useRef(false),
    scroll = useRef<ScrollView>(null);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  function edit(budget?: Budget) {
    setEditing(budget ?? null);
    setName(budget?.name ?? '');
    setAmount(budget ? (budget.amountCents / 100).toFixed(2) : '');
    setWarning(String(budget?.warningPercent ?? 80));
    setPeriod(budget?.period ?? 'monthly');
    setNotify(budget?.notify ?? false);
    setAccountIds(budget?.scope.accountIds ?? []);
    setCategoryIds(budget?.scope.categoryIds ?? []);
    setTagIds(budget?.scope.tagIds ?? []);
    setSearch('');
    setOpen(true);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }
  async function perform(operation: (confirmed: boolean) => Promise<void>, confirmed = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await operation(confirmed);
    } catch (cause) {
      if (cause instanceof BudgetOverlapError)
        Alert.alert('Presupuestos que se solapan', cause.message, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar de todas formas',
            onPress: () => {
              void perform(operation, true);
            },
          },
        ]);
      else
        Alert.alert('No se guardó', cause instanceof Error ? cause.message : 'Intenta nuevamente.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function submit() {
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      Alert.alert('Revisa el monto', 'Introduce un monto mayor a cero con hasta dos decimales.');
      return;
    }
    const input: SaveBudgetInput = {
      name,
      amountCents,
      warningPercent: Number(warning),
      period,
      notify,
      scope: { accountIds, categoryIds, tagIds },
    };
    const id = editing?.id;
    void perform(async (confirmed) => {
      await save(input, id, confirmed);
      setOpen(false);
    });
  }
  async function toggleNotifications(value: boolean) {
    if (!value) {
      setNotify(false);
      return;
    }
    setAskingPermission(true);
    try {
      const granted = await requestBudgetNotifications();
      setNotify(granted);
      if (!granted)
        Alert.alert(
          'Avisos no activados',
          'Puedes guardar el presupuesto y consultar su estado dentro de Rastro. Activa el permiso en Ajustes de Android si quieres recibir avisos.',
        );
    } finally {
      setAskingPermission(false);
    }
  }
  function toggle(ids: string[], id: string) {
    return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
  }
  const visibleCategories = allCategories.filter(
    (c) =>
      (!c.isArchived || editing?.scope.categoryIds.includes(c.id)) &&
      (categoryIds.includes(c.id) ||
        getCategoryPath(c.id, allCategories)
          .toLocaleLowerCase('es')
          .includes(search.toLocaleLowerCase('es'))),
  );
  const selectedCategories = visibleCategories.filter((c) => categoryIds.includes(c.id));
  const choices = visibleCategories.filter((c) => !categoryIds.includes(c.id)).slice(0, 15);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title="Presupuestos"
          eyebrow="Cuánto puedes gastar"
          action={
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text style={styles.link}>Volver</Text>
            </Pressable>
          }
        />
        <Text style={styles.help}>
          El gasto se cuenta una vez por presupuesto. Solo incluye gastos activos; transferencias,
          ingresos y conciliaciones no consumen el límite. Cada presupuesto se evalúa por separado.
        </Text>
        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => void refresh()}>
              <Text style={styles.link}>Reintentar</Text>
            </Pressable>
          </Card>
        ) : null}
        <Pressable disabled={busy} style={styles.button} onPress={() => edit()}>
          <Text style={styles.buttonText}>Crear presupuesto</Text>
        </Pressable>
        {open ? (
          <Card>
            <Text style={styles.title}>{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              accessibilityLabel="Nombre del presupuesto"
              value={name}
              onChangeText={setName}
              maxLength={50}
              style={styles.input}
            />
            <Text style={styles.label}>Monto en soles</Text>
            <TextInput
              accessibilityLabel="Monto del presupuesto"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.label}>Periodo</Text>
            <View style={styles.chips}>
              {(Object.keys(periodLabels) as BudgetPeriod[]).map((p) => (
                <Chip
                  key={p}
                  label={periodLabels[p]}
                  selected={period === p}
                  onPress={() => setPeriod(p)}
                />
              ))}
            </View>
            <Text style={styles.help}>
              Se renueva por calendario: mes, semana de lunes a domingo o año. No acumula el
              disponible de periodos anteriores.
            </Text>
            <Text style={styles.label}>Avisar al (%)</Text>
            <TextInput
              accessibilityLabel="Umbral de aviso"
              value={warning}
              onChangeText={setWarning}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.label}>Cuentas · sin selección incluye todas</Text>
            <View style={styles.chips}>
              {allAccounts
                .filter((a) => !a.isArchived || editing?.scope.accountIds.includes(a.id))
                .map((a) => (
                  <Chip
                    key={a.id}
                    label={`${a.name}${a.isArchived ? ' (archivada)' : ''}`}
                    selected={accountIds.includes(a.id)}
                    onPress={() => setAccountIds((ids) => toggle(ids, a.id))}
                  />
                ))}
            </View>
            <Text style={styles.label}>Categorías · sin selección incluye todas</Text>
            <Text style={styles.help}>
              Una familia incluye sus subcategorías. Basta coincidir con una categoría seleccionada.
            </Text>
            <TextInput
              accessibilityLabel="Buscar categorías"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar categoría"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.chips}>
              {[...selectedCategories, ...choices].map((c) => (
                <Chip
                  key={c.id}
                  label={`${getCategoryPath(c.id, allCategories)}${c.isArchived ? ' (archivada)' : ''}`}
                  selected={categoryIds.includes(c.id)}
                  onPress={() => setCategoryIds((ids) => toggle(ids, c.id))}
                />
              ))}
            </View>
            <Text style={styles.label}>Etiquetas · sin selección incluye todas</Text>
            <View style={styles.chips}>
              {allTags
                .filter((t) => !t.isArchived || editing?.scope.tagIds.includes(t.id))
                .map((t) => (
                  <Chip
                    key={t.id}
                    label={`${t.name}${t.isArchived ? ' (archivada)' : ''}`}
                    selected={tagIds.includes(t.id)}
                    onPress={() => setTagIds((ids) => toggle(ids, t.id))}
                  />
                ))}
            </View>
            <Text style={styles.help}>
              Basta una etiqueta seleccionada. Si eliges cuentas, categorías y etiquetas, el gasto
              debe cumplir las tres condiciones.
            </Text>
            <View style={styles.switch}>
              <Text style={styles.label}>Avisos en el teléfono (opcional)</Text>
              <Switch
                accessibilityLabel="Avisos en el teléfono"
                value={notify}
                disabled={askingPermission}
                onValueChange={(value) => void toggleNotifications(value)}
              />
            </View>
            <Text style={styles.help}>
              Se comprueban al registrar cambios o abrir Rastro. Sin permiso, los indicadores siguen
              disponibles aquí.
            </Text>
            <View style={styles.chips}>
              <Pressable style={styles.button} disabled={busy || askingPermission} onPress={submit}>
                <Text style={styles.buttonText}>{busy ? 'Guardando…' : 'Guardar presupuesto'}</Text>
              </Pressable>
              <Pressable style={styles.secondary} disabled={busy} onPress={() => setOpen(false)}>
                <Text style={styles.link}>Cancelar</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
        {loading ? <Text style={styles.help}>Cargando presupuestos…</Text> : null}
        {!loading && !items.length ? (
          <Text style={styles.help}>
            Crea tu primer presupuesto mensual. Puedes empezar por un límite general.
          </Text>
        ) : null}
        {items.map((budget) => (
          <View key={budget.id} style={{ gap: 4 }}>
            {progress.find((p) => p.budget.id === budget.id) ? (
              <BudgetProgressCard progress={progress.find((p) => p.budget.id === budget.id)!} />
            ) : (
              <Card>
                <Text style={styles.title}>
                  {budget.name}
                  {budget.enabled ? '' : ' · Archivado'}
                </Text>
              </Card>
            )}
            <Text style={styles.help}>
              {budget.scope.accountIds
                .map((id) => allAccounts.find((a) => a.id === id)?.name ?? 'Cuenta')
                .join(', ') || 'Todas las cuentas'}{' '}
              ·{' '}
              {budget.scope.categoryIds
                .map((id) => getCategoryPath(id, allCategories))
                .join(', ') || 'Todas las categorías'}{' '}
              ·{' '}
              {budget.scope.tagIds
                .map((id) => allTags.find((t) => t.id === id)?.name ?? 'Etiqueta')
                .join(', ') || 'Sin filtro de etiquetas'}
            </Text>
            <View style={styles.chips}>
              <Pressable
                disabled={busy}
                style={styles.secondary}
                accessibilityLabel={`Editar ${budget.name}`}
                onPress={() => edit(budget)}
              >
                <Text style={styles.link}>Editar</Text>
              </Pressable>
              {budget.enabled ? (
                <>
                  <Pressable
                    disabled={busy}
                    style={styles.secondary}
                    accessibilityLabel={`Subir ${budget.name}`}
                    onPress={() => void perform(() => move(budget.id, 'up'))}
                  >
                    <Text style={styles.link}>Subir</Text>
                  </Pressable>
                  <Pressable
                    disabled={busy}
                    style={styles.secondary}
                    accessibilityLabel={`Bajar ${budget.name}`}
                    onPress={() => void perform(() => move(budget.id, 'down'))}
                  >
                    <Text style={styles.link}>Bajar</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                disabled={busy}
                style={styles.secondary}
                accessibilityLabel={`${budget.enabled ? 'Archivar' : 'Restaurar'} ${budget.name}`}
                onPress={() =>
                  void perform((confirmed) => archive(budget.id, !budget.enabled, confirmed))
                }
              >
                <Text style={styles.link}>{budget.enabled ? 'Archivar' : 'Restaurar'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 60 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  label: { color: colors.ink, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  help: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  error: { color: colors.red },
  link: { color: colors.green, fontWeight: '700' },
  input: {
    padding: 12,
    backgroundColor: colors.mantle,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  button: {
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  buttonText: { color: colors.onAccent, fontWeight: '800' },
  secondary: { minHeight: 44, padding: 12 },
  switch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
