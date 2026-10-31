import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCategoryPath, isLeafCategory } from '@/domain/categories';
import { parseAmountToCents } from '@/domain/money';
import type { FinanceTransaction, TransactionKind } from '@/domain/types';
import { Card, Chip, LoadingView, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { useLocalQuery } from '@/presentation/use-local-query';
import { transactionReader } from '@/infrastructure/transaction-reader';
import { colors, radius, spacing } from '@/theme';

type EditableKind = Extract<TransactionKind, 'expense' | 'income' | 'transfer'>;

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const finance = useFinance();
  const result = useLocalQuery(
    useCallback(() => transactionReader.byId(id), [id]),
    finance.revision,
  );
  const transaction = result.data;

  if (finance.loading || result.loading) return <LoadingView />;
  if (result.error) return <UnavailableTransaction message={result.error} />;
  if (!transaction)
    return <UnavailableTransaction message="Este movimiento ya no está disponible." />;
  if (transaction.kind === 'adjustment' || transaction.kind === 'refund') {
    return (
      <UnavailableTransaction
        message={
          transaction.kind === 'adjustment'
            ? 'Los ajustes de conciliación no se editan. Concilia nuevamente la cuenta si el saldo real cambió.'
            : 'Un reembolso conserva su relación con el gasto original y no se edita directamente.'
        }
      />
    );
  }

  return <CorrectionForm key={transaction.id} transaction={transaction} />;
}

function UnavailableTransaction({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.unavailable}>
        <Ionicons name="lock-closed-outline" size={28} color={colors.muted} />
        <Text style={styles.unavailableText}>{message}</Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Volver</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CorrectionForm({ transaction }: { transaction: FinanceTransaction }) {
  const { allAccounts, categories, allCategories, correctTransaction } = useFinance();
  const [kind, setKind] = useState<EditableKind>(transaction.kind as EditableKind);
  const [amount, setAmount] = useState((Math.abs(transaction.amountCents) / 100).toFixed(2));
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [destinationAccountId, setDestinationAccountId] = useState(
    transaction.destinationAccountId ??
      allAccounts.find((account) => !account.isArchived && account.id !== transaction.accountId)
        ?.id ??
      '',
  );
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? 'category-other');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [merchant, setMerchant] = useState(transaction.merchant ?? '');
  const [note, setNote] = useState(transaction.note ?? '');
  const [source, setSource] = useState(transaction.source ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const availableAccounts = useMemo(
    () =>
      allAccounts.filter(
        (account) =>
          !account.isArchived || account.id === accountId || account.id === destinationAccountId,
      ),
    [allAccounts, accountId, destinationAccountId],
  );
  const categoryMatches = useMemo(() => {
    const query = normalizeSearch(categoryQuery);
    if (!query) return [];
    return categories
      .filter((category) => isLeafCategory(category, categories))
      .filter((category) =>
        normalizeSearch(getCategoryPath(category.id, categories)).includes(query),
      )
      .slice(0, 8);
  }, [categories, categoryQuery]);

  async function save() {
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      Alert.alert('Revisa el monto', 'Escribe un monto mayor a cero con hasta dos decimales.');
      return;
    }
    if (!accountId) {
      Alert.alert('Elige la cuenta de pago');
      return;
    }
    if (kind === 'transfer' && (!destinationAccountId || destinationAccountId === accountId)) {
      Alert.alert('Elige otra cuenta de destino');
      return;
    }
    if (kind === 'expense' && !categoryId) {
      Alert.alert('Elige una categoría');
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Explica la corrección', 'La razón es obligatoria y debe ser clara.');
      return;
    }
    setSaving(true);
    try {
      await correctTransaction(transaction.id, {
        kind,
        amountCents,
        accountId,
        destinationAccountId: kind === 'transfer' ? destinationAccountId : null,
        categoryId: kind === 'expense' ? categoryId : null,
        merchant: merchant.trim() || null,
        note: note.trim() || null,
        source: kind === 'income' ? source.trim() || null : null,
        reason,
      });
      router.back();
    } catch (cause) {
      Alert.alert(
        'No se guardó la corrección',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="Corrección con trazabilidad"
            title="Editar movimiento"
            action={
              <Pressable onPress={() => router.back()} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            }
          />

          <Card>
            <Text style={styles.notice}>
              Puedes corregir, por ejemplo, un pago registrado en Efectivo que realmente salió de
              Yape. La fecha, las etiquetas y la zona se conservarán.
            </Text>
          </Card>

          <Text style={styles.label}>Tipo</Text>
          <View style={styles.chips}>
            {(
              [
                ['expense', 'Gasto'],
                ['income', 'Ingreso'],
                ['transfer', 'Transferencia'],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={kind === value}
                color={
                  value === 'expense' ? colors.red : value === 'income' ? colors.green : colors.blue
                }
                onPress={() => setKind(value)}
              />
            ))}
          </View>

          <Text style={styles.label}>Monto</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.overlay1}
            style={styles.input}
          />

          <Text style={styles.label}>
            {kind === 'transfer' ? 'Cuenta de origen' : 'Cuenta de pago'}
          </Text>
          <View style={styles.chips}>
            {availableAccounts.map((account) => (
              <Chip
                key={account.id}
                label={`${account.name}${account.isArchived ? ' (archivada)' : ''}`}
                selected={accountId === account.id}
                color={account.color}
                onPress={() => {
                  setAccountId(account.id);
                  if (destinationAccountId === account.id) {
                    setDestinationAccountId(
                      availableAccounts.find((candidate) => candidate.id !== account.id)?.id ?? '',
                    );
                  }
                }}
              />
            ))}
          </View>

          {kind === 'transfer' ? (
            <>
              <Text style={styles.label}>Cuenta de destino</Text>
              <View style={styles.chips}>
                {availableAccounts
                  .filter((account) => account.id !== accountId)
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
              <Text style={styles.label}>Categoría</Text>
              <Text style={styles.selectedValue}>{getCategoryPath(categoryId, allCategories)}</Text>
              <TextInput
                value={categoryQuery}
                onChangeText={setCategoryQuery}
                placeholder="Buscar otra categoría"
                placeholderTextColor={colors.overlay1}
                style={styles.input}
              />
              {categoryMatches.length ? (
                <View style={styles.chips}>
                  {categoryMatches.map((category) => (
                    <Chip
                      key={category.id}
                      label={getCategoryPath(category.id, categories)}
                      selected={category.id === categoryId}
                      color={category.color}
                      onPress={() => {
                        setCategoryId(category.id);
                        setCategoryQuery('');
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {kind === 'income' ? (
            <>
              <Text style={styles.label}>Origen del ingreso</Text>
              <TextInput
                value={source}
                onChangeText={setSource}
                placeholder="Ej. sueldo o familia"
                placeholderTextColor={colors.overlay1}
                style={styles.input}
              />
            </>
          ) : null}

          {kind !== 'transfer' ? (
            <>
              <Text style={styles.label}>Comercio o persona</Text>
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Opcional"
                placeholderTextColor={colors.overlay1}
                style={styles.input}
              />
            </>
          ) : null}

          <Text style={styles.label}>Nota</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Opcional"
            placeholderTextColor={colors.overlay1}
            style={styles.input}
          />

          <Text style={styles.label}>Razón de la corrección</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            maxLength={200}
            multiline
            placeholder="Ej. elegí Efectivo, pero pagué con Yape"
            placeholderTextColor={colors.overlay1}
            style={[styles.input, styles.reasonInput]}
          />

          <View style={styles.actions}>
            <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => void save()}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              <Text style={styles.primaryText}>{saving ? 'Guardando…' : 'Guardar corrección'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 60, gap: spacing.sm },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  notice: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  label: { color: colors.subtext1, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  reasonInput: { minHeight: 82, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedValue: { color: colors.green, fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.lg },
  primaryButton: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryText: { color: colors.onAccent, fontWeight: '900' },
  secondaryButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryText: { color: colors.ink, fontWeight: '800' },
  disabled: { opacity: 0.4 },
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: 32,
  },
  unavailableText: { color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
