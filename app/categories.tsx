import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { groupCategories } from '@/domain/categories';
import type { Category } from '@/domain/types';
import { Card, Chip, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const {
    categories,
    allCategories,
    addCategory,
    editCategory,
    moveCategory,
    setCategoryArchived,
  } = useFinance();
  const groups = useMemo(() => groupCategories(categories), [categories]);
  const families = useMemo(
    () => categories.filter((category) => !category.parentId && category.id !== 'category-other'),
    [categories],
  );
  const archived = useMemo(
    () => allCategories.filter((category) => category.isArchived && isCustom(category)),
    [allCategories],
  );
  const [selectedFamilyId, setSelectedFamilyId] = useState(families[0]?.id ?? '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [formFamilyId, setFormFamilyId] = useState(families[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  const activeFamilyId = families.some((family) => family.id === selectedFamilyId)
    ? selectedFamilyId
    : families[0]?.id;
  const activeGroup = groups.find((group) => group.parent.id === activeFamilyId);

  function resetForm(nextFamilyId = activeFamilyId ?? families[0]?.id ?? '') {
    setEditingId(null);
    setName('');
    setFormFamilyId(nextFamilyId);
  }

  function beginEdit(category: Category) {
    if (!isCustom(category)) return;
    setEditingId(category.id);
    setName(category.name);
    setFormFamilyId(category.parentId ?? families[0]?.id ?? '');
  }

  async function save() {
    const parentId = formFamilyId || activeFamilyId;
    if (!parentId) {
      Alert.alert('Elige una familia');
      return;
    }
    setBusy(true);
    try {
      if (editingId) await editCategory(editingId, { name, parentId });
      else await addCategory(name, parentId);
      setSelectedFamilyId(parentId);
      resetForm(parentId);
    } catch (cause) {
      Alert.alert(
        editingId ? 'No se editó la categoría' : 'No se creó la categoría',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive(category: Category) {
    Alert.alert(
      `Archivar ${category.name}`,
      'Dejará de aparecer en movimientos nuevos, pero conservará su nombre en todo el historial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => void changeArchiveState(category, true),
        },
      ],
    );
  }

  async function changeArchiveState(category: Category, nextArchived: boolean) {
    try {
      await setCategoryArchived(category.id, nextArchived);
      if (editingId === category.id) resetForm();
    } catch (cause) {
      Alert.alert(
        nextArchived ? 'No se archivó la categoría' : 'No se restauró la categoría',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    }
  }

  async function reorder(id: string, direction: 'up' | 'down') {
    try {
      await moveCategory(id, direction);
    } catch (cause) {
      Alert.alert(
        'No se cambió el orden',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="Sprint 2 · parametrización"
          title="Tus categorías"
          action={
            <Pressable
              accessibilityLabel="Volver"
              onPress={() => router.back()}
              style={styles.back}
            >
              <Ionicons name="close" size={24} color={colors.ink} />
            </Pressable>
          }
        />
        <Text style={styles.intro}>
          Las opciones incluidas con Rastro están protegidas. Tus categorías pueden cambiar de
          nombre o familia, ordenarse y archivarse sin perder movimientos históricos.
        </Text>

        <Card>
          <Text style={styles.cardTitle}>
            {editingId ? 'Editar categoría propia' : 'Nueva categoría propia'}
          </Text>
          <Text style={styles.label}>Nombre específico</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={50}
            placeholder="Ej. Empanada, Steam o Perfume"
            placeholderTextColor={colors.overlay1}
            style={styles.input}
          />
          <Text style={styles.label}>Familia</Text>
          <View style={styles.chips}>
            {families.map((family) => (
              <Chip
                key={family.id}
                label={family.name}
                selected={formFamilyId === family.id}
                color={family.color}
                variant="family"
                onPress={() => setFormFamilyId(family.id)}
              />
            ))}
          </View>
          <View style={styles.formActions}>
            {editingId ? (
              <Pressable onPress={() => resetForm()} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={busy}
              onPress={() => void save()}
              style={[styles.primaryButton, busy && styles.disabled]}
            >
              <Text style={styles.primaryText}>{busy ? 'Guardando…' : 'Guardar categoría'}</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={styles.section}>Revisar una familia</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.familyChips}
        >
          {families.map((family) => (
            <Chip
              key={family.id}
              label={family.name}
              selected={activeFamilyId === family.id}
              color={family.color}
              variant="family"
              onPress={() => {
                setSelectedFamilyId(family.id);
                if (!editingId) setFormFamilyId(family.id);
              }}
            />
          ))}
        </ScrollView>

        <Card>
          <View style={styles.familyTitleRow}>
            <View
              style={[
                styles.familyDot,
                { backgroundColor: activeGroup?.parent.color ?? colors.muted },
              ]}
            />
            <View>
              <Text style={styles.cardTitle}>{activeGroup?.parent.name ?? 'Familia'}</Text>
              <Text style={styles.meta}>Protegida · orden aplicado al registro de gastos</Text>
            </View>
          </View>
          {activeGroup?.children.map((category, index, children) => {
            const custom = isCustom(category);
            return (
              <View key={category.id} style={[styles.categoryRow, index > 0 && styles.divider]}>
                <Ionicons
                  name={custom ? 'pricetag' : 'shield-checkmark-outline'}
                  size={18}
                  color={custom ? category.color : colors.overlay1}
                />
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.meta}>
                    {custom ? 'Creada por ti' : 'Incluida y protegida'}
                  </Text>
                </View>
                {custom ? (
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityLabel={`Subir ${category.name}`}
                      disabled={index === 0}
                      onPress={() => void reorder(category.id, 'up')}
                      style={[styles.iconButton, index === 0 && styles.disabled]}
                    >
                      <Ionicons name="arrow-up" size={17} color={colors.ink} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Bajar ${category.name}`}
                      disabled={index === children.length - 1}
                      onPress={() => void reorder(category.id, 'down')}
                      style={[styles.iconButton, index === children.length - 1 && styles.disabled]}
                    >
                      <Ionicons name="arrow-down" size={17} color={colors.ink} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Editar ${category.name}`}
                      onPress={() => beginEdit(category)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="pencil" size={17} color={colors.blue} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Archivar ${category.name}`}
                      onPress={() => confirmArchive(category)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="archive" size={17} color={colors.peach} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>

        {archived.length ? (
          <>
            <Text style={styles.section}>Archivadas · {archived.length}</Text>
            <Card>
              {archived.map((category, index) => {
                const family = allCategories.find((item) => item.id === category.parentId);
                return (
                  <View key={category.id} style={[styles.categoryRow, index > 0 && styles.divider]}>
                    <Ionicons name="archive-outline" size={18} color={colors.overlay1} />
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.meta}>
                        {family?.name ?? 'Familia desconocida'} · conserva su historial
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void changeArchiveState(category, false)}
                      style={styles.restoreButton}
                    >
                      <Text style={styles.restoreText}>Restaurar</Text>
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function isCustom(category: Category): boolean {
  return category.id.startsWith('category-custom-');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, paddingBottom: 60, gap: spacing.md },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  intro: { color: colors.muted, lineHeight: 20, marginTop: -spacing.md },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  label: { color: colors.subtext1, fontSize: 12, fontWeight: '800', marginTop: spacing.md },
  input: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.mantle,
    color: colors.ink,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  familyChips: { gap: 8, paddingRight: spacing.md },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.md },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryText: { color: colors.onAccent, fontWeight: '900' },
  secondaryButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryText: { color: colors.ink, fontWeight: '800' },
  disabled: { opacity: 0.3 },
  section: { color: colors.green, fontSize: 13, fontWeight: '900', textTransform: 'uppercase' },
  familyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: spacing.sm },
  familyDot: { width: 16, height: 16, borderRadius: 8 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  categoryInfo: { flex: 1, minWidth: 90 },
  categoryName: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 3 },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.mantle,
  },
  restoreButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  restoreText: { color: colors.green, fontSize: 12, fontWeight: '900' },
});
