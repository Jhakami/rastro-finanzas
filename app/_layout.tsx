import 'react-native-gesture-handler';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FinanceProvider } from '@/presentation/finance-provider';
import { repository } from '@/infrastructure/repository';
import { colors } from '@/theme';

function LockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const authenticate = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea Rastro',
      fallbackLabel: 'Usar PIN del dispositivo',
    });
    setUnlocked(result.success);
  }, []);

  useEffect(() => {
    repository.getSetting('biometricEnabled', 'false').then((value) => {
      const nextEnabled = value === 'true';
      setEnabled(nextEnabled);
      if (!nextEnabled) setUnlocked(true);
      else void authenticate();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && enabled) setUnlocked(false);
    });
    return () => subscription.remove();
  }, [authenticate, enabled]);

  if (!unlocked)
    return (
      <View style={styles.lock}>
        <Text style={styles.lockMark}>R</Text>
        <Text style={styles.lockTitle}>Rastro está protegido</Text>
        <Pressable style={styles.unlockButton} onPress={() => void authenticate()}>
          <Text style={styles.unlockText}>Desbloquear</Text>
        </Pressable>
      </View>
    );
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <LockGate>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="insights" />
          </Stack>
        </LockGate>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  lock: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.green,
    color: colors.white,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 64,
  },
  lockTitle: { marginTop: 20, fontSize: 22, fontWeight: '800', color: colors.ink },
  unlockButton: {
    marginTop: 20,
    backgroundColor: colors.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  unlockText: { color: colors.white, fontWeight: '800' },
});
