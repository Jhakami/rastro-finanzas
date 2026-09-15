import 'react-native-gesture-handler';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FinanceProvider } from '@/presentation/finance-provider';
import {
  isBiometricLockSuspended,
  subscribeBiometricPreference,
} from '@/application/biometric-lock';
import { repository } from '@/infrastructure/repository';
import { colors } from '@/theme';

function LockGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const enabledRef = useRef(false);
  const authenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquea Rastro',
        fallbackLabel: 'Usar PIN del dispositivo',
      });
      setUnlocked(result.success);
    } finally {
      authenticatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const applyPreference = (nextEnabled: boolean) => {
      enabledRef.current = nextEnabled;
      if (!nextEnabled) setUnlocked(true);
    };
    const unsubscribePreference = subscribeBiometricPreference(applyPreference);
    repository
      .getSetting('biometricEnabled', 'false')
      .then((value) => {
        if (!mounted) return;
        const nextEnabled = value === 'true';
        applyPreference(nextEnabled);
        if (nextEnabled) void authenticate();
      })
      .catch(() => applyPreference(false))
      .finally(() => {
        if (mounted) setPreferenceLoaded(true);
      });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && enabledRef.current && !isBiometricLockSuspended()) {
        setUnlocked(false);
      } else if (state === 'active' && enabledRef.current && !isBiometricLockSuspended()) {
        void authenticate();
      }
    });
    return () => {
      mounted = false;
      unsubscribePreference();
      subscription.remove();
    };
  }, [authenticate]);

  if (!preferenceLoaded)
    return (
      <View style={styles.boot}>
        <Text style={styles.bootMark}>R</Text>
        <Text style={styles.bootText}>Preparando Rastro…</Text>
      </View>
    );

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
          <StatusBar style="light" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="accounts" options={{ presentation: 'modal' }} />
            <Stack.Screen name="insights" />
          </Stack>
        </LockGate>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  bootMark: { color: colors.green, fontSize: 42, fontWeight: '900' },
  bootText: { color: colors.muted, fontWeight: '700' },
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
    backgroundColor: colors.primary,
    color: colors.onAccent,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 64,
  },
  lockTitle: { marginTop: 20, fontSize: 22, fontWeight: '800', color: colors.ink },
  unlockButton: {
    marginTop: 20,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  unlockText: { color: colors.onAccent, fontWeight: '800' },
});
