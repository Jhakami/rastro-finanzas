import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Account } from '@/domain/types';
import { formatPEN, parseBalanceToCents } from '@/domain/money';
import { Card, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { colors, radius, spacing } from '@/theme';

const ACCOUNT_COLORS = [
  colors.mauve,
  colors.blue,
  colors.green,
  colors.peach,
  colors.pink,
  colors.teal,
  colors.yellow,
  colors.red,
] as const;

export default function AccountsScreen() {
  const router = useRouter();
  const {
    accounts,
    allAccounts,
    balances,
    addAccount,
    editAccount,
    moveAccount,
    setAccountArchived,
    reconcileAccount,
  } = useFinance();
  const archivedAccounts = useMemo(
    () => allAccounts.filter((account) => account.isArchived),
    [allAccounts],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(colors.mauve);
  const [busy, setBusy] = useState(false);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [targetBalance, setTargetBalance] = useState('');
  const [reconciliationReason, setReconciliationReason] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const reconcilingAccount = accounts.find((account) => account.id === reconcilingId);
  const parsedTargetBalance = parseBalanceToCents(targetBalance);
  const reconciliationDifference = reconcilingAccount
    ? parsedTargetBalance === null
      ? null
      : parsedTargetBalance - (balances[reconcilingAccount.id] ?? 0)
    : null;

  function resetForm() {
    setEditingId(null);
    setName('');
    setColor(colors.mauve);
  }

  function beginEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setColor(account.color);
  }

  function beginReconciliation(account: Account) {
    setReconcilingId(account.id);
    setTargetBalance(((balances[account.id] ?? 0) / 100).toFixed(2));
    setReconciliationReason('');
  }

  function cancelReconciliation() {
    setReconcilingId(null);
    setTargetBalance('');
    setReconciliationReason('');
  }

  async function saveReconciliation() {
    if (!reconcilingAccount || parsedTargetBalance === null) {
      Alert.alert('Revisa el saldo', 'Escribe el saldo real con hasta dos decimales.');
      return;
    }
    if (reconciliationReason.trim().length < 3) {
      Alert.alert('Explica el ajuste', 'La razón es obligatoria y debe ser clara.');
      return;
    }
    setReconciling(true);
    try {
      await reconcileAccount(reconcilingAccount.id, {
        targetBalanceCents: parsedTargetBalance,
        reason: reconciliationReason,
      });
      cancelReconciliation();
      Alert.alert('Saldo conciliado', 'Rastro guardó un ajuste auditable sin borrar el historial.');
    } catch (cause) {
      Alert.alert(
        'No se concilió el saldo',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setReconciling(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      if (editingId) await editAccount(editingId, { name, color });
      else await addAccount({ name, color });
      resetForm();
    } catch (cause) {
      Alert.alert(
        editingId ? 'No se editó la cuenta' : 'No se creó la cuenta',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmArchive(account: Account) {
    Alert.alert(
      `Archivar ${account.name}`,
      'Dejará de aparecer al registrar movimientos, pero conservará su historial y saldo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => void changeArchiveState(account, true),
        },
      ],
    );
  }

  async function changeArchiveState(account: Account, archived: boolean) {
    try {
      await setAccountArchived(account.id, archived);
      if (editingId === account.id) resetForm();
    } catch (cause) {
      Alert.alert(
        archived ? 'No se archivó la cuenta' : 'No se restauró la cuenta',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    }
  }

  async function reorder(id: string, direction: 'up' | 'down') {
    try {
      await moveAccount(id, direction);
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
          title="Tus cuentas"
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
          Ordena las cuentas que usas. Archivar nunca elimina movimientos ni cambia tu patrimonio.
          Yape permanece como cuenta principal.
        </Text>

        <Card>
          <Text style={styles.cardTitle}>{editingId ? 'Editar cuenta' : 'Nueva cuenta'}</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={30}
            placeholder="Ej. Ahorros o Billetera"
            placeholderTextColor={colors.overlay1}
            style={styles.input}
          />
          <Text style={styles.label}>Color</Text>
          <View style={styles.palette}>
            {ACCOUNT_COLORS.map((option) => (
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
              <Text style={styles.primaryText}>{busy ? 'Guardando…' : 'Guardar cuenta'}</Text>
            </Pressable>
          </View>
        </Card>

        {reconcilingAccount ? (
          <Card>
            <Text style={styles.cardTitle}>Conciliar saldo · {reconcilingAccount.name}</Text>
            <Text style={styles.helpText}>
              Úsalo si el saldo real no coincide. Se creará un ajuste con trazabilidad; los
              movimientos anteriores no se modificarán.
            </Text>
            <View style={styles.balanceSummary}>
              <View>
                <Text style={styles.summaryLabel}>Saldo en Rastro</Text>
                <Text style={styles.summaryValue}>
                  {formatPEN(balances[reconcilingAccount.id] ?? 0)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.muted} />
              <View style={styles.summaryRight}>
                <Text style={styles.summaryLabel}>Saldo real</Text>
                <Text style={styles.summaryValue}>
                  {parsedTargetBalance === null ? '—' : formatPEN(parsedTargetBalance)}
                </Text>
              </View>
            </View>
            <Text style={styles.label}>Saldo real en soles</Text>
            <TextInput
              value={targetBalance}
              onChangeText={setTargetBalance}
              keyboardType="decimal-pad"
              placeholder="Ej. 124.50"
              placeholderTextColor={colors.overlay1}
              style={styles.input}
            />
            <Text style={styles.label}>Razón obligatoria</Text>
            <TextInput
              value={reconciliationReason}
              onChangeText={setReconciliationReason}
              maxLength={200}
              multiline
              placeholder="Ej. saldo inicial incorrecto o efectivo contado"
              placeholderTextColor={colors.overlay1}
              style={[styles.input, styles.reasonInput]}
            />
            {reconciliationDifference !== null ? (
              <Text style={styles.difference}>
                Ajuste que quedará registrado: {reconciliationDifference >= 0 ? '+' : ''}
                {formatPEN(reconciliationDifference)}
              </Text>
            ) : null}
            <View style={styles.formActions}>
              <Pressable onPress={cancelReconciliation} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                disabled={reconciling}
                onPress={() => void saveReconciliation()}
                style={[styles.primaryButton, reconciling && styles.disabled]}
              >
                <Text style={styles.primaryText}>
                  {reconciling ? 'Conciliando…' : 'Guardar ajuste'}
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Text style={styles.section}>Activas · {accounts.length}</Text>
        <Card>
          {accounts.map((account, index) => {
            const cannotMoveUp = Boolean(index === 0 || accounts[index - 1]?.isDefault);
            const cannotMoveDown = Boolean(index === accounts.length - 1 || account.isDefault);
            return (
              <View key={account.id} style={[styles.accountRow, index > 0 && styles.divider]}>
                <View style={[styles.accountDot, { backgroundColor: account.color }]} />
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={styles.accountMeta}>
                    {formatPEN(balances[account.id] ?? 0)}
                    {account.isDefault ? ' · principal protegida' : ''}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityLabel={`Subir ${account.name}`}
                    disabled={cannotMoveUp}
                    onPress={() => void reorder(account.id, 'up')}
                    style={[styles.iconButton, cannotMoveUp && styles.disabled]}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.ink} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Bajar ${account.name}`}
                    disabled={cannotMoveDown}
                    onPress={() => void reorder(account.id, 'down')}
                    style={[styles.iconButton, cannotMoveDown && styles.disabled]}
                  >
                    <Ionicons name="arrow-down" size={18} color={colors.ink} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Conciliar saldo de ${account.name}`}
                    onPress={() => beginReconciliation(account)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="calculator" size={17} color={colors.green} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Editar ${account.name}`}
                    onPress={() => beginEdit(account)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="pencil" size={17} color={colors.blue} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Archivar ${account.name}`}
                    disabled={Boolean(account.isDefault)}
                    onPress={() => confirmArchive(account)}
                    style={[styles.iconButton, account.isDefault && styles.disabled]}
                  >
                    <Ionicons name="archive" size={17} color={colors.peach} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </Card>

        {archivedAccounts.length > 0 ? (
          <>
            <Text style={styles.section}>Archivadas · {archivedAccounts.length}</Text>
            <Card>
              {archivedAccounts.map((account, index) => (
                <View key={account.id} style={[styles.accountRow, index > 0 && styles.divider]}>
                  <View style={[styles.accountDot, { backgroundColor: account.color }]} />
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountMeta}>
                      Conserva {formatPEN(balances[account.id] ?? 0)} y todo su historial
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void changeArchiveState(account, false)}
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
  helpText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
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
  reasonInput: { minHeight: 76, textAlignVertical: 'top' },
  balanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.mantle,
  },
  summaryRight: { alignItems: 'flex-end' },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 4 },
  difference: { color: colors.blue, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
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
  accountRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  accountDot: { width: 14, height: 14, borderRadius: 7, marginRight: 11 },
  accountInfo: { flex: 1, minWidth: 90 },
  accountName: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  accountMeta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
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
});
