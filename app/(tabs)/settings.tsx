import { useEffect, useState } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';
import { publishBiometricPreference } from '@/application/biometric-lock';
import { createEncryptedBackup } from '@/application/backup-service';
import { exportTransactionsCsv } from '@/application/export-service';
import { formatPEN, parseAmountToCents } from '@/domain/money';
import { Card, ScreenHeader } from '@/presentation/components';
import { useFinance } from '@/presentation/finance-provider';
import { repository } from '@/infrastructure/repository';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const {
    accounts,
    balances,
    transactions,
    categories,
    microThresholdCents,
    updateMicroThreshold,
  } = useFinance();
  const [threshold, setThreshold] = useState((microThresholdCents / 100).toFixed(2));
  const [biometric, setBiometric] = useState(false);
  const [changingBiometric, setChangingBiometric] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    repository
      .getSetting('biometricEnabled', 'false')
      .then((value) => setBiometric(value === 'true'));
  }, []);

  async function toggleBiometric(value: boolean) {
    setChangingBiometric(true);
    try {
      if (value) {
        const available =
          (await LocalAuthentication.hasHardwareAsync()) &&
          (await LocalAuthentication.isEnrolledAsync());
        if (!available) {
          Alert.alert('Biometría no disponible', 'Configura huella o bloqueo seguro en Android.');
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirma el bloqueo de Rastro',
          fallbackLabel: 'Usar PIN del dispositivo',
        });
        if (!result.success) return;
      }
      await repository.setSetting('biometricEnabled', String(value));
      setBiometric(value);
      publishBiometricPreference(value);
    } catch {
      Alert.alert('No se cambió la biometría', 'Intenta nuevamente.');
    } finally {
      setChangingBiometric(false);
    }
  }
  async function saveThreshold() {
    const cents = parseAmountToCents(threshold);
    if (cents === null) {
      Alert.alert('Umbral inválido');
      return;
    }
    await updateMicroThreshold(cents);
    Alert.alert(
      'Guardado',
      `Las compras de hasta ${formatPEN(cents)} se analizarán como pequeñas.`,
    );
  }
  async function backup() {
    setBusy(true);
    try {
      await createEncryptedBackup(backupPassword);
      setBackupPassword('');
    } catch (cause) {
      Alert.alert(
        'No se creó la copia',
        cause instanceof Error ? cause.message : 'Intenta nuevamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="Todo bajo tu control" title="Ajustes" />
        <Text style={styles.section}>Cuentas</Text>
        <Card>
          {accounts.map((account, index) => (
            <View key={account.id} style={[styles.account, index > 0 && styles.divider]}>
              <View style={[styles.dot, { backgroundColor: account.color }]} />
              <View style={styles.grow}>
                <Text style={styles.accountName}>
                  {account.name}
                  {account.isDefault ? ' · principal' : ''}
                </Text>
                <Text style={styles.hint}>{formatPEN(balances[account.id] ?? 0)}</Text>
              </View>
            </View>
          ))}
        </Card>
        <Text style={styles.section}>Análisis</Text>
        <Card>
          <Text style={styles.label}>Umbral de compras pequeñas</Text>
          <Text style={styles.hint}>Es un indicador; la categoría real nunca cambia.</Text>
          <View style={styles.inline}>
            <View style={styles.inputWrap}>
              <Text style={styles.prefix}>S/</Text>
              <TextInput
                value={threshold}
                onChangeText={setThreshold}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
            <Pressable onPress={() => void saveThreshold()} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Guardar</Text>
            </Pressable>
          </View>
        </Card>
        <Text style={styles.section}>Privacidad</Text>
        <Card>
          <View style={styles.switchRow}>
            <View style={styles.grow}>
              <Text style={styles.label}>Bloqueo biométrico</Text>
              <Text style={styles.hint}>Se solicitará al volver a abrir la app.</Text>
            </View>
            <Switch
              value={biometric}
              disabled={changingBiometric}
              onValueChange={(value) => void toggleBiometric(value)}
              trackColor={{ false: colors.line, true: colors.accentActive }}
              thumbColor={biometric ? colors.accent : colors.muted}
            />
          </View>
          <View style={[styles.switchRow, styles.divider]}>
            <View style={styles.grow}>
              <Text style={styles.label}>Ubicación responsable</Text>
              <Text style={styles.hint}>
                Solo permiso aproximado al guardar; nunca en segundo plano.
              </Text>
            </View>
            <Text style={styles.ok}>ACTIVA</Text>
          </View>
        </Card>
        <Text style={styles.section}>Tus datos</Text>
        <Card>
          <Text style={styles.label}>Exportar para Excel</Text>
          <Text style={styles.hint}>
            Elige conscientemente si el CSV contiene zonas aproximadas.
          </Text>
          <View style={styles.buttonStack}>
            <Pressable
              style={styles.outlineButton}
              onPress={() => void exportTransactionsCsv(transactions, accounts, categories, false)}
            >
              <Text style={styles.outlineText}>CSV sin ubicaciones</Text>
            </Pressable>
            <Pressable
              style={styles.outlineButton}
              onPress={() =>
                Alert.alert(
                  'Incluir zonas',
                  'El archivo revelará tus patrones geográficos aproximados.',
                  [
                    { text: 'Cancelar' },
                    {
                      text: 'Incluir',
                      onPress: () =>
                        void exportTransactionsCsv(transactions, accounts, categories, true),
                    },
                  ],
                )
              }
            >
              <Text style={styles.outlineText}>CSV con ubicaciones</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>Copia completa cifrada</Text>
          <Text style={styles.hint}>Guarda la contraseña: no puede recuperarse.</Text>
          <TextInput
            value={backupPassword}
            onChangeText={setBackupPassword}
            secureTextEntry
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.muted}
            style={styles.password}
          />
          <Pressable
            disabled={busy}
            style={[styles.primaryButton, busy && { opacity: 0.5 }]}
            onPress={() => void backup()}
          >
            <Text style={styles.primaryText}>{busy ? 'Cifrando…' : 'Crear copia .finbackup'}</Text>
          </Pressable>
        </Card>
        <Text style={styles.version}>Rastro 0.1.2 · local-first · PEN</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  section: { color: colors.ink, fontWeight: '900', fontSize: 18, marginTop: 4 },
  account: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  grow: { flex: 1 },
  accountName: { color: colors.ink, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    marginTop: 12,
    paddingTop: 12,
  },
  label: { color: colors.ink, fontWeight: '800' },
  inline: { flexDirection: 'row', gap: 10, marginTop: 12 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.canvas,
    paddingHorizontal: 12,
  },
  prefix: { color: colors.muted, fontWeight: '800' },
  input: { flex: 1, padding: 11, color: colors.ink, fontWeight: '800' },
  smallButton: {
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
  },
  smallButtonText: { color: colors.onAccent, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  ok: { color: colors.green, fontSize: 10, fontWeight: '900' },
  buttonStack: { gap: 8, marginTop: 12 },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  outlineText: { color: colors.green, fontWeight: '800' },
  password: {
    marginTop: 10,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
  },
  primaryButton: {
    marginTop: 10,
    padding: 13,
    alignItems: 'center',
    backgroundColor: colors.green,
    borderRadius: radius.sm,
  },
  primaryText: { color: colors.onAccent, fontWeight: '900' },
  version: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
