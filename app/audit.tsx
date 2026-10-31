import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import type { AuditCursor, AuditEntry, DeletedMovement } from '@/domain/audit';
import { auditRepository } from '@/infrastructure/audit-repository';
import { describeAudit, movementKinds } from '@/application/audit-description';
import { formatPEN } from '@/domain/money';
import { useFinance } from '@/presentation/finance-provider';
import { Card, Chip, ScreenHeader } from '@/presentation/components';
import { colors, spacing } from '@/theme';

export default function AuditScreen() {
  const { refresh, revision, allAccounts = [], allCategories = [] } = useFinance();
  const names = Object.fromEntries(
    [...allAccounts, ...allCategories].map((item) => [item.id, item.name]),
  );
  const [mode, setMode] = useState<'audit' | 'deleted'>('audit');
  const [items, setItems] = useState<(AuditEntry | DeletedMovement)[]>([]);
  const [cursor, setCursor] = useState<AuditCursor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DeletedMovement | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const busy = useRef(false);
  const savingRef = useRef(false);
  const load = useCallback(
    async (after: AuditCursor | null, reset: boolean) => {
      if (busy.current && !reset) return;
      if (reset) generation.current++;
      const current = generation.current;
      busy.current = true;
      setLoading(true);
      setError(null);
      if (reset) {
        setItems([]);
        setCursor(null);
      }
      try {
        const page =
          mode === 'audit'
            ? await auditRepository.page(after)
            : await auditRepository.deletedPage(after);
        if (current !== generation.current) return;
        setItems((old) =>
          reset
            ? page.items
            : [...old, ...page.items.filter((item) => !old.some((row) => row.id === item.id))],
        );
        setCursor(page.nextCursor);
      } catch (cause) {
        if (current === generation.current)
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar.');
      } finally {
        if (current === generation.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [mode],
  );
  useFocusEffect(
    useCallback(() => {
      void revision; // A committed finance write invalidates the visible page.
      void load(null, true);
      return () => {
        generation.current++;
        busy.current = false;
      };
    }, [load, revision]),
  );
  async function restore() {
    if (!selected || savingRef.current) return;
    if (!reason.trim()) {
      setSaveError('Escribe el motivo de restauración.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const changed = await auditRepository.restoreTransaction(selected.id, reason);
      setSelected(null);
      setReason('');
      setNotice(changed ? 'Movimiento restaurado.' : 'El movimiento ya estaba restaurado.');
      try {
        await refresh();
      } catch {
        setNotice('Restaurado. No se pudo actualizar la vista; vuelve a abrirla.');
      }
      await load(null, true);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'No se pudo restaurar.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior="height">
        <View style={styles.header}>
          <ScreenHeader title="Auditoría y restauración" />
          <Text style={styles.text}>
            Los nombres de cuentas y categorías corresponden al catálogo actual; los importes
            históricos solo se muestran si el evento los conserva.
          </Text>
          <Action label="Volver" onPress={() => router.back()} disabled={saving} />
          <View style={styles.row}>
            <Chip
              label="Auditoría"
              selected={mode === 'audit'}
              onPress={() => {
                if (!savingRef.current) setMode('audit');
              }}
            />
            <Chip
              label="Eliminados"
              selected={mode === 'deleted'}
              onPress={() => {
                if (!savingRef.current) setMode('deleted');
              }}
            />
          </View>
          {notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {notice}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <View style={styles.header}>
            <Text style={styles.title}>Restaurar {formatPEN(selected.amountCents)}</Text>
            <Text style={styles.text}>
              {selected.accountName} · {new Date(selected.occurredAt).toLocaleString('es-PE')}
            </Text>
            <Text style={styles.text}>
              Se recuperará el mismo movimiento y volverá a afectar saldos y presupuestos. No se
              reactivan cuentas ni categorías archivadas.
            </Text>
            <TextInput
              accessibilityLabel="Motivo de restauración"
              placeholder="Motivo de restauración"
              placeholderTextColor={colors.muted}
              value={reason}
              onChangeText={setReason}
              editable={!saving}
              style={styles.input}
              multiline
            />
            {saveError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {saveError}
              </Text>
            ) : null}
            <Action
              label={saving ? 'Restaurando…' : 'Confirmar restauración'}
              onPress={() => void restore()}
              disabled={saving}
            />
            <Action
              label="Cancelar"
              onPress={() => {
                setSelected(null);
                setReason('');
                setSaveError(null);
              }}
              disabled={saving}
            />
          </View>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Card>
              {'action' in item ? (
                <>
                  <Text style={styles.title}>{describeAudit(item, names).title}</Text>
                  <Text style={styles.text}>
                    {new Date(item.occurredAt).toLocaleString('es-PE')}
                  </Text>
                  <Text selectable style={styles.text}>
                    Referencia: {item.entityId}
                  </Text>
                  {describeAudit(item, names).details.map((line, i) => (
                    <Text key={i} style={styles.text}>
                      {line}
                    </Text>
                  ))}
                </>
              ) : (
                <>
                  <Text style={styles.title}>
                    {movementKinds[item.kind] ?? item.kind} · {formatPEN(item.amountCents)}
                  </Text>
                  <Text style={styles.text}>
                    {item.accountName}
                    {item.accountArchived ? ' (archivada)' : ''}
                    {item.destinationName ? ` → ${item.destinationName}` : ''}
                  </Text>
                  <Text style={styles.text}>
                    {item.categoryName ?? 'Sin categoría'}
                    {item.categoryArchived ? ' (archivada)' : ''}
                  </Text>
                  <Text style={styles.text}>
                    Movimiento: {new Date(item.occurredAt).toLocaleString('es-PE')}
                  </Text>
                  <Text style={styles.text}>
                    Eliminado: {new Date(item.deletedAt).toLocaleString('es-PE')}
                  </Text>
                  <Action
                    label="Restaurar"
                    onPress={() => {
                      setSelected(item);
                      setReason('');
                      setSaveError(null);
                    }}
                    disabled={saving || selected !== null}
                  />
                </>
              )}
            </Card>
          )}
          ListEmptyComponent={
            !loading && !error ? (
              <Text style={styles.text}>
                No hay {mode === 'audit' ? 'eventos' : 'movimientos eliminados'}.
              </Text>
            ) : null
          }
          ListFooterComponent={
            <View>
              {loading ? <Text style={styles.text}>Cargando…</Text> : null}
              {error ? (
                <>
                  <Text accessibilityRole="alert" style={styles.error}>
                    {error}
                  </Text>
                  <Action
                    label="Reintentar"
                    onPress={() => void load(cursor, items.length === 0)}
                  />
                </>
              ) : null}
              {cursor && !error ? (
                <Action
                  label="Cargar más"
                  onPress={() => void load(cursor, false)}
                  disabled={loading}
                />
              ) : null}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: spacing.md, gap: 8 },
  list: { padding: spacing.md, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  text: { color: colors.muted, marginVertical: 4 },
  error: { color: colors.red },
  button: { minHeight: 48, justifyContent: 'center' },
  link: { color: colors.green, fontWeight: '700' },
  input: {
    color: colors.ink,
    padding: 12,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 52,
  },
});
