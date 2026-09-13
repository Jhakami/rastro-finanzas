import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { captureApproximateLocation } from '@/application/location-service';
import { getCategoryParent, getCategoryPath, groupCategories } from '@/domain/categories';
import { parseAmountToCents } from '@/domain/money';
import type { ApproximateCell } from '@/domain/location';
import type { TransactionKind } from '@/domain/types';
import { Chip, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const formSchema = z.object({
  amount: z.string().min(1),
  merchant: z.string(),
  note: z.string(),
  source: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

export default function NewTransactionScreen() {
  const { accounts, categories, favorites, addTransaction, addCategory } = useFinance();
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [accountId, setAccountId] = useState(
    accounts.find((item) => item.isDefault)?.id ?? accounts[0]?.id ?? 'account-yape',
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    accounts.find((item) => item.id !== accountId)?.id ?? '',
  );
  const [categoryId, setCategoryId] = useState('');
  const [categoryFamilyId, setCategoryFamilyId] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [location, setLocation] = useState<ApproximateCell | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: { amount: '', merchant: '', note: '', source: 'Padres' },
  });
  const categoryGroups = useMemo(() => groupCategories(categories), [categories]);
  const selectedFamily = getCategoryParent(categoryId, categories);
  const selectedGroup = categoryGroups.find((group) => group.parent.id === selectedFamily?.id);
  const activeFamilyId =
    selectedGroup?.parent.id ?? categoryFamilyId ?? categoryGroups[0]?.parent.id ?? '';
  const activeGroup = categoryGroups.find((group) => group.parent.id === activeFamilyId);
  const matchingCategories = useMemo(() => {
    const query = normalizeSearch(categoryQuery);
    if (!query) return [];
    return categoryGroups.flatMap((group) =>
      group.children
        .filter((category) =>
          normalizeSearch(`${group.parent.name} ${category.name}`).includes(query),
        )
        .map((category) => ({ category, parent: group.parent })),
    );
  }, [categoryGroups, categoryQuery]);

  async function createMissingCategory() {
    const name = categoryQuery.trim();
    if (!activeGroup || name.length < 2) {
      Alert.alert('Escribe un nombre', 'Elige una familia y escribe al menos dos caracteres.');
      return;
    }
    setCreatingCategory(true);
    try {
      const id = await addCategory(name, activeGroup.parent.id);
      setCategoryId(id);
      setCategoryFamilyId(activeGroup.parent.id);
      setCategoryQuery('');
    } catch (cause) {
      Alert.alert(
        'No se pudo crear',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  async function toggleLocation(enabled: boolean) {
    if (!enabled) {
      setLocation(null);
      return;
    }
    setLocating(true);
    try {
      const cell = await captureApproximateLocation();
      if (!cell)
        Alert.alert(
          'Ubicación no guardada',
          'Puedes seguir registrando el movimiento sin ubicación.',
        );
      setLocation(cell);
    } catch {
      Alert.alert('No se obtuvo la zona', 'Revisa el permiso o continúa sin ubicación.');
    } finally {
      setLocating(false);
    }
  }

  const submit = handleSubmit(async (values) => {
    const parsed = formSchema.safeParse(values);
    const amountCents = parseAmountToCents(values.amount);
    if (!parsed.success || amountCents === null) {
      Alert.alert('Revisa el monto', 'Escribe un monto mayor a cero con hasta dos decimales.');
      return;
    }
    if (kind === 'transfer' && (!destinationAccountId || destinationAccountId === accountId)) {
      Alert.alert('Elige otra cuenta de destino');
      return;
    }
    if (kind === 'expense' && !categoryId) {
      Alert.alert(
        'Elige una categoría específica',
        'Esto permite que el análisis no mezcle gastos diferentes.',
      );
      return;
    }
    if (
      kind === 'expense' &&
      categoryId === 'category-other' &&
      !values.merchant.trim() &&
      !values.note.trim()
    ) {
      Alert.alert(
        'Describe este gasto',
        'Si lo guardas por clasificar, escribe el comercio o una nota para identificarlo después.',
      );
      return;
    }
    setSaving(true);
    try {
      await addTransaction({
        kind,
        amountCents,
        accountId,
        destinationAccountId: kind === 'transfer' ? destinationAccountId : null,
        categoryId: kind === 'expense' ? categoryId : null,
        merchant: values.merchant.trim() || null,
        note: values.note.trim() || null,
        source: kind === 'income' ? values.source.trim() || null : null,
        location,
      });
      router.back();
    } catch (cause) {
      Alert.alert(
        'No se pudo guardar',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="En pocos toques"
            title="Nuevo movimiento"
            action={
              <Pressable onPress={() => router.back()} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            }
          />
          <View style={styles.kindRow}>
            {(
              [
                ['expense', 'Gasto'],
                ['income', 'Ingreso'],
                ['transfer', 'Transferir'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={kind === value}
                onPress={() => setKind(value)}
                color={
                  value === 'expense' ? colors.red : value === 'income' ? colors.green : colors.blue
                }
              />
            ))}
          </View>
          {kind === 'expense' ? (
            <>
              <Text style={styles.label}>Favoritos</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {favorites.map((favorite) => (
                  <Chip
                    key={favorite.id}
                    label={favorite.name}
                    onPress={() => {
                      setAccountId(favorite.accountId);
                      setCategoryId(favorite.categoryId);
                      setCategoryFamilyId(
                        getCategoryParent(favorite.categoryId, categories)?.id ?? null,
                      );
                      if (favorite.amountCents)
                        setValue('amount', (favorite.amountCents / 100).toFixed(2));
                      if (favorite.merchant) setValue('merchant', favorite.merchant);
                      if (favorite.note) setValue('note', favorite.note);
                    }}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
          <Text style={styles.label}>Monto</Text>
          <View style={styles.amountBox}>
            <Text style={styles.currency}>S/</Text>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <TextInput
                  {...field}
                  onChangeText={field.onChange}
                  autoFocus
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#9AA098"
                  style={styles.amountInput}
                />
              )}
            />
          </View>
          <Text style={styles.label}>{kind === 'transfer' ? 'Cuenta de origen' : 'Cuenta'}</Text>
          <View style={styles.chips}>
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                selected={accountId === account.id}
                color={account.color}
                onPress={() => {
                  setAccountId(account.id);
                  if (destinationAccountId === account.id)
                    setDestinationAccountId(
                      accounts.find((item) => item.id !== account.id)?.id ?? '',
                    );
                }}
              />
            ))}
          </View>
          {kind === 'transfer' ? (
            <>
              <Text style={styles.label}>Cuenta de destino</Text>
              <View style={styles.chips}>
                {accounts
                  .filter((item) => item.id !== accountId)
                  .map((account) => (
                    <Chip
                      key={account.id}
                      label={account.name}
                      selected={destinationAccountId === account.id}
                      color={account.color}
                      onPress={() => setDestinationAccountId(account.id)}
                    />
                  ))}
              </View>
            </>
          ) : null}
          {kind === 'expense' ? (
            <>
              <Text style={styles.label}>Categoría específica</Text>
              <TextInput
                value={categoryQuery}
                onChangeText={setCategoryQuery}
                placeholder="Buscar: agua, pasaje, videojuego…"
                placeholderTextColor="#9AA098"
                style={styles.input}
              />
              {categoryId ? (
                <View style={styles.categorySelection}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  <Text style={styles.categorySelectionText}>
                    {getCategoryPath(categoryId, categories)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.categoryHint}>
                  Primero elige una familia y luego el gasto exacto.
                </Text>
              )}
              {categoryQuery.trim() ? (
                <View style={styles.chips}>
                  {matchingCategories.length ? (
                    matchingCategories.map(({ category, parent }) => (
                      <Chip
                        key={category.id}
                        label={`${parent.name} · ${category.name}`}
                        selected={categoryId === category.id}
                        color={category.color}
                        onPress={() => {
                          setCategoryId(category.id);
                          setCategoryFamilyId(parent.id);
                          setCategoryQuery('');
                        }}
                      />
                    ))
                  ) : (
                    <View style={styles.noCategoryResult}>
                      <Text style={styles.categoryHint}>No hay coincidencias.</Text>
                      <Pressable
                        disabled={creatingCategory}
                        onPress={() => void createMissingCategory()}
                        style={styles.createCategory}
                      >
                        <Ionicons name="add-circle" size={18} color={colors.white} />
                        <Text style={styles.createCategoryText}>
                          {creatingCategory
                            ? 'Creando…'
                            : `Crear en ${activeGroup?.parent.name ?? 'una familia'}`}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chips}
                  >
                    {categoryGroups.map(({ parent }) => (
                      <Chip
                        key={parent.id}
                        label={parent.name}
                        selected={activeFamilyId === parent.id}
                        color={parent.color}
                        onPress={() => {
                          setCategoryFamilyId(parent.id);
                          if (selectedFamily?.id !== parent.id) setCategoryId('');
                        }}
                      />
                    ))}
                  </ScrollView>
                  <View style={styles.chips}>
                    {activeGroup?.children.map((category) => (
                      <Chip
                        key={category.id}
                        label={category.name}
                        selected={categoryId === category.id}
                        color={category.color}
                        onPress={() => setCategoryId(category.id)}
                      />
                    ))}
                  </View>
                </>
              )}
              <Pressable
                onPress={() => setCategoryId('category-other')}
                style={styles.classifyLater}
              >
                <Text style={styles.classifyLaterText}>No aparece: guardar por clasificar</Text>
              </Pressable>
            </>
          ) : null}
          {kind === 'income' ? (
            <Field
              control={control}
              name="source"
              label="Origen del ingreso"
              placeholder="Ej. Padres"
            />
          ) : (
            <Field
              control={control}
              name="merchant"
              label="Comercio o concepto (opcional)"
              placeholder="Ej. bodega, Steam"
            />
          )}
          <Field
            control={control}
            name="note"
            label="Nota (opcional)"
            placeholder="Algo que quieras recordar"
            multiline
          />
          <View style={styles.locationRow}>
            <View style={styles.locationText}>
              <Text style={styles.locationTitle}>Zona aproximada</Text>
              <Text style={styles.locationHint}>
                {location
                  ? 'Lista: se guardará en una celda de 200 m'
                  : locating
                    ? 'Buscando solo mientras usas la app…'
                    : 'Opcional; nunca rastrea en segundo plano'}
              </Text>
            </View>
            <Switch
              value={Boolean(location)}
              disabled={locating}
              onValueChange={(value) => void toggleLocation(value)}
              trackColor={{ true: colors.greenSoft }}
              thumbColor={location ? colors.green : '#AAA'}
            />
          </View>
          <Pressable
            disabled={saving}
            onPress={() => void submit()}
            style={[styles.save, saving && styles.disabled]}
          >
            <Text style={styles.saveText}>{saving ? 'Guardando…' : 'Guardar movimiento'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function Field({
  control,
  name,
  label,
  placeholder,
  multiline,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            placeholderTextColor="#9AA098"
            multiline={multiline}
            style={[styles.input, multiline && styles.multiline]}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 50 },
  close: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
  },
  currency: { fontSize: 26, color: colors.muted, fontWeight: '700' },
  amountInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 38,
    fontWeight: '900',
    paddingVertical: 14,
    marginLeft: 10,
  },
  input: {
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  categorySelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
  },
  categorySelectionText: { color: colors.green, fontWeight: '800', flex: 1 },
  categoryHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginVertical: 9 },
  noCategoryResult: { width: '100%', gap: 6 },
  createCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.green,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  createCategoryText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  classifyLater: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 5 },
  classifyLaterText: { color: colors.muted, fontSize: 12, textDecorationLine: 'underline' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  locationText: { flex: 1, paddingRight: 12 },
  locationTitle: { color: colors.ink, fontWeight: '800' },
  locationHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  save: {
    marginTop: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  saveText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  disabled: { opacity: 0.55 },
});
