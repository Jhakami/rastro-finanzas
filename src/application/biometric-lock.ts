type BiometricPreferenceListener = (enabled: boolean) => void;

const preferenceListeners = new Set<BiometricPreferenceListener>();
let suspensionCount = 0;

export function publishBiometricPreference(enabled: boolean): void {
  preferenceListeners.forEach((listener) => listener(enabled));
}

export function subscribeBiometricPreference(listener: BiometricPreferenceListener): () => void {
  preferenceListeners.add(listener);
  return () => preferenceListeners.delete(listener);
}

export function suspendBiometricLock(): () => void {
  suspensionCount += 1;
  let resumed = false;
  return () => {
    if (resumed) return;
    resumed = true;
    suspensionCount = Math.max(0, suspensionCount - 1);
  };
}

export function isBiometricLockSuspended(): boolean {
  return suspensionCount > 0;
}
