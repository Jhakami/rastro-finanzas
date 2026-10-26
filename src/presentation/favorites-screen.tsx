import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card, Chip, ScreenHeader } from './components';
import { useFinance } from './finance-provider';
import { useFavoriteStore } from './favorite-store';
import type {
  FavoriteAmountMode,
  FavoriteOrder,
  ManualFavorite,
  SaveFavoriteInput,
} from '@/domain/favorites';
import { formatPEN, parseAmountToCents } from '@/domain/money';
import { getCategoryPath, isLeafCategory } from '@/domain/categories';
import { colors, radius, spacing } from '@/theme';

export default function FavoritesScreen() {
  const { accounts, categories, tags } = useFinance();
  const items = useFavoriteStore((s) => s.items);
  const error = useFavoriteStore((s) => s.error);
  const order = useFavoriteStore((s) => s.order);
  const refresh = useFavoriteStore((s) => s.refresh);
  const setOrder = useFavoriteStore((s) => s.setOrder);
  const save = useFavoriteStore((s) => s.save);
  const move = useFavoriteStore((s) => s.move);
  const archive = useFavoriteStore((s) => s.archive);
  const [editing, setEditing] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState('');
  const [accountId, setAccountId] = useState('account-yape');
  const [categoryId, setCategoryId] = useState('');
  const [query, setQuery] = useState('');
  const [amountMode, setAmountMode] = useState<FavoriteAmountMode>('variable');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  function edit(item?: ManualFavorite) {
    setEditing(item?.id ?? null);
    setName(item?.name ?? '');
    setAccountId(item?.accountId ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? '');
    setCategoryId(item?.categoryId ?? '');
    setQuery('');
    setAmountMode(item?.amountMode ?? 'variable');
    setAmount(item?.amountCents ? (item.amountCents / 100).toFixed(2) : '');
    setMerchant(item?.merchant ?? '');
    setNote(item?.note ?? '');
    setTagIds(item?.tagIds.filter((id) => tags.some((t) => t.id === id)) ?? []);
    setFormVisible(true);
  }
  async function perform(operation: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
    } catch (cause) {
      Alert.alert('No se guardó', cause instanceof Error ? cause.message : 'Intenta nuevamente.');
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    const input: SaveFavoriteInput = {
      name,
      accountId,
      categoryId,
      amountMode,
      amountCents: parseAmountToCents(amount),
      merchant,
      note,
      tagIds,
    };
    await save(input, editing ?? undefined);
    setFormVisible(false);
  }
  const matches = categories
    .filter(
      (c) =>
        isLeafCategory(c, categories) &&
        (c.id === categoryId ||
          getCategoryPath(c.id, categories)
            .toLocaleLowerCase('es')
            .includes(query.toLocaleLowerCase('es'))),
    )
    .slice(0, 12);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Favoritos"
          eyebrow="Tu registro, más rápido"
          action={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.link}>Volver</Text>
            </Pressable>
          }
        />
        <Text style={styles.help}>
          Tus favoritos fijados son independientes de las sugerencias automáticas. Aplicarlos
          completa el formulario; siempre confirmas antes de guardar el gasto.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} disabled={busy} onPress={() => edit()}>
          <Text style={styles.buttonText}>Crear favorito</Text>
        </Pressable>
        {formVisible ? (
          <Card>
            <Text style={styles.title}>{editing ? 'Editar favorito' : 'Nuevo favorito'}</Text>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              accessibilityLabel="Nombre del favorito"
              value={name}
              onChangeText={setName}
              maxLength={40}
              style={styles.input}
            />
            <Text style={styles.label}>Cuenta</Text>
            <View style={styles.chips}>
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  selected={a.id === accountId}
                  color={a.color}
                  onPress={() => setAccountId(a.id)}
                />
              ))}
            </View>
            <Text style={styles.label}>
              Categoría: {categoryId ? getCategoryPath(categoryId, categories) : 'elige una'}
            </Text>
            <TextInput
              accessibilityLabel="Buscar categoría"
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar categoría"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.chips}>
              {matches.map((c) => (
                <Chip
                  key={c.id}
                  label={getCategoryPath(c.id, categories)}
                  selected={c.id === categoryId}
                  onPress={() => setCategoryId(c.id)}
                />
              ))}
            </View>
            <Text style={styles.label}>Monto</Text>
            <View style={styles.chips}>
              {(
                [
                  ['variable', 'Variable'],
                  ['suggested', 'Sugerido'],
                  ['fixed', 'Fijo'],
                ] as const
              ).map(([mode, label]) => (
                <Chip
                  key={mode}
                  label={label}
                  selected={amountMode === mode}
                  onPress={() => setAmountMode(mode)}
                />
              ))}
            </View>
            <Text style={styles.help}>
              {amountMode === 'variable'
                ? 'Escribes el monto al registrar.'
                : amountMode === 'suggested'
                  ? 'Se completa el monto y puedes modificarlo.'
                  : 'Se aplica el monto fijo; puedes desvincularlo para registrar otro importe.'}
            </Text>
            {amountMode !== 'variable' ? (
              <TextInput
                accessibilityLabel="Monto en soles"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            ) : null}
            <Text style={styles.label}>Comercio (opcional)</Text>
            <TextInput
              accessibilityLabel="Comercio"
              value={merchant}
              onChangeText={setMerchant}
              style={styles.input}
            />
            <Text style={styles.label}>Nota (opcional)</Text>
            <TextInput
              accessibilityLabel="Nota"
              value={note}
              onChangeText={setNote}
              style={styles.input}
            />
            <Text style={styles.label}>Etiquetas (opcional)</Text>
            <View style={styles.chips}>
              {tags.map((t) => (
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
            </View>
            <View style={styles.chips}>
              <Pressable disabled={busy} style={styles.button} onPress={() => void perform(submit)}>
                <Text style={styles.buttonText}>{busy ? 'Guardando…' : 'Guardar favorito'}</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                style={styles.secondary}
                onPress={() => setFormVisible(false)}
              >
                <Text style={styles.link}>Cancelar</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}
        <Text style={styles.title}>Ordenar</Text>
        <View style={styles.chips}>
          {(
            [
              ['manual', 'Manual'],
              ['recent', 'Reciente'],
              ['frequency', 'Frecuencia'],
            ] as [FavoriteOrder, string][]
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={order === value}
              onPress={() => void setOrder(value)}
            />
          ))}
        </View>
        {!items.length ? (
          <Text style={styles.help}>
            Crea tu primer favorito para reutilizar tus gastos habituales.
          </Text>
        ) : null}
        {items.map((item) => (
          <Card key={item.id}>
            <Text style={styles.title}>
              {item.name}
              {item.isArchived ? ' · Archivado' : ''}
            </Text>
            <Text style={styles.help}>
              {item.amountCents ? formatPEN(item.amountCents) : 'Monto variable'} ·{' '}
              {item.usageCount} usos
            </Text>
            {!item.available ? (
              <Text style={styles.error}>
                Cuenta o categoría archivada. Edita el favorito o restaura su referencia para
                usarlo.
              </Text>
            ) : null}
            <View style={styles.chips}>
              <Pressable disabled={busy} style={styles.secondary} onPress={() => edit(item)}>
                <Text style={styles.link}>Editar</Text>
              </Pressable>
              {!item.isArchived && order === 'manual' ? (
                <>
                  <Pressable
                    accessibilityLabel={`Subir ${item.name}`}
                    disabled={busy}
                    style={styles.secondary}
                    onPress={() => void perform(() => move(item.id, 'up'))}
                  >
                    <Text style={styles.link}>Subir</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Bajar ${item.name}`}
                    disabled={busy}
                    style={styles.secondary}
                    onPress={() => void perform(() => move(item.id, 'down'))}
                  >
                    <Text style={styles.link}>Bajar</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                disabled={busy}
                style={styles.secondary}
                onPress={() => void perform(() => archive(item.id, !item.isArchived))}
              >
                <Text style={styles.link}>{item.isArchived ? 'Restaurar' : 'Archivar'}</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, paddingBottom: 60, gap: spacing.md },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  label: { color: colors.ink, marginTop: 16, marginBottom: 8, fontWeight: '700' },
  help: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.red },
  link: { color: colors.green, fontWeight: '700' },
  input: {
    color: colors.ink,
    backgroundColor: colors.mantle,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  button: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.onAccent, fontWeight: '800' },
  secondary: { padding: 12, minHeight: 44 },
});
