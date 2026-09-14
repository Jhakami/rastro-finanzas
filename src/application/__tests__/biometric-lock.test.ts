import {
  isBiometricLockSuspended,
  publishBiometricPreference,
  subscribeBiometricPreference,
  suspendBiometricLock,
} from '../biometric-lock';

describe('biometric lock coordinator', () => {
  it('notifica inmediatamente los cambios de preferencia', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeBiometricPreference(listener);

    publishBiometricPreference(false);
    expect(listener).toHaveBeenCalledWith(false);

    unsubscribe();
    publishBiometricPreference(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('suspende el bloqueo durante un permiso del sistema', () => {
    const resumeFirst = suspendBiometricLock();
    const resumeSecond = suspendBiometricLock();
    expect(isBiometricLockSuspended()).toBe(true);

    resumeFirst();
    expect(isBiometricLockSuspended()).toBe(true);

    resumeSecond();
    resumeSecond();
    expect(isBiometricLockSuspended()).toBe(false);
  });
});
