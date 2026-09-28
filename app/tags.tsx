import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Tag } from '@/domain/types';
import { Card, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const TAG_COLORS = [
  colors.mauve,
  colors.blue,
  colors.green,
  colors.peach,
  colors.pink,
  colors.teal,
  colors.yellow,
  colors.red,
] as const;

export default function TagsScreen() {
  const router = useRouter();
  const { tags, allTags, addTag, editTag, moveTag, setTagArchived } = useFinance();
  const archivedTags = useMemo(() => allTags.filter((tag) => tag.isArchived), [allTags]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(colors.teal);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName('');
    setColor(colors.teal);
  }

  function beginEdit(tag: Tag) {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
  }

  async function save() {
    setBusy(true);
    try {
      if (editingId) await editTag(editingId, { name, color });
      else await addTag({ name, color });
      resetForm();
    } catch (cause) {
      Alert.alert(
        editingId ? 'No se editó la etiqueta' : 'No se creó la etiqueta',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive(tag: Tag) {
    Alert.alert(
      `Archivar ${tag.name}`,
      'No aparecerá en movimientos nuevos, pero seguirá visible en los movimientos anteriores.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => void changeArchiveState(tag, true),
        },
      ],
    );
  }

  async function changeArchiveState(tag: Tag, archived: boolean) {
    try {
      await setTagArchived(tag.id, archived);
      if (editingId === tag.id) resetForm();
    } catch (cause) {
      Alert.alert(
        archived ? 'No se archivó la etiqueta' : 'No se restauró la etiqueta',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    }
  }

  async function reorder(id: string, direction: 'up' | 'down') {
    try {
      await moveTag(id, direction);
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
          title="Tus etiquetas"
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
          Combina varias etiquetas en un movimiento para recordar su contexto. Archivar una etiqueta
          nunca la quita del historial.
        </Text>

        <Card>
          <Text style={styles.cardTitle}>{editingId ? 'Editar etiqueta' : 'Nueva etiqueta'}</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={30}
            placeholder="Ej. Trabajo, Viaje o Compartido"
            placeholderTextColor={colors.overlay1}
            style={styles.input}
          />
          <Text style={styles.label}>Color</Text>
          <View style={styles.palette}>
            {TAG_COLORS.map((option) => (
              <Pressable
                key={option}
                accessibilityLabel={`Elegir color ${option}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: color === option }}
                onPress={() => setColor(option)}
                style={[
                  styles.color,
                  { backgroundColor: option },
                  color === option && styles.colorSelected,
                ]}
              />
            ))}
          </View>
          <View style={styles.formActions}>
            {editingId ? (
              <Pressable onPress={resetForm} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={busy}
              onPress={() => void save()}
              style={[styles.primaryButton, busy && styles.disabled]}
            >
              <Text style={styles.primaryText}>{busy ? 'Guardando…' : 'Guardar etiqueta'}</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={styles.section}>Activas · {tags.length}</Text>
        {tags.length ? (
          <Card>
            {tags.map((tag, index) => (
              <View key={tag.id} style={[styles.tagRow, index > 0 && styles.divider]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <View style={styles.tagInfo}>
                  <Text style={styles.tagName}>{tag.name}</Text>
                  <Text style={styles.meta}>Disponible para movimientos nuevos</Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityLabel={`Subir ${tag.name}`}
                    disabled={index === 0}
                    onPress={() => void reorder(tag.id, 'up')}
                    style={[styles.iconButton, index === 0 && styles.disabled]}
                  >
                    <Ionicons name="arrow-up" size={17} color={colors.ink} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Bajar ${tag.name}`}
                    disabled={index === tags.length - 1}
                    onPress={() => void reorder(tag.id, 'down')}
                    style={[styles.iconButton, index === tags.length - 1 && styles.disabled]}
                  >
                    <Ionicons name="arrow-down" size={17} color={colors.ink} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Editar ${tag.name}`}
                    onPress={() => beginEdit(tag)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="pencil" size={17} color={colors.blue} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Archivar ${tag.name}`}
                    onPress={() => confirmArchive(tag)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="archive" size={17} color={colors.peach} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <Text style={styles.empty}>
              Crea tu primera etiqueta para poder asignarla al registrar.
            </Text>
          </Card>
        )}

        {archivedTags.length ? (
          <>
            <Text style={styles.section}>Archivadas · {archivedTags.length}</Text>
            <Card>
              {archivedTags.map((tag, index) => (
                <View key={tag.id} style={[styles.tagRow, index > 0 && styles.divider]}>
                  <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                  <View style={styles.tagInfo}>
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <Text style={styles.meta}>Se conserva en movimientos anteriores</Text>
                  </View>
                  <Pressable
                    onPress={() => void changeArchiveState(tag, false)}
                    style={styles.restoreButton}
                  >
                    <Text style={styles.restoreText}>Restaurar</Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm },
  label: { color: colors.subtext1, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
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
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: spacing.sm },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.surface },
  colorSelected: { borderColor: colors.text, transform: [{ scale: 1.12 }] },
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
  tagRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  tagDot: { width: 14, height: 14, borderRadius: 7, marginRight: 11 },
  tagInfo: { flex: 1, minWidth: 90 },
  tagName: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 3 },
  iconButton: {
    width: 34,
    height: 34,
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
  empty: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
