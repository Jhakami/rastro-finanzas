import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { suspendBiometricLock } from './biometric-lock';
import { approximateLocation, type ApproximateCell } from '@/domain/location';

export type LocationCaptureErrorCode =
  'permission-denied' | 'permission-blocked' | 'services-disabled' | 'position-unavailable';

export class LocationCaptureError extends Error {
  constructor(
    readonly code: LocationCaptureErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LocationCaptureError';
  }
}

export async function captureApproximateLocation(): Promise<ApproximateCell> {
  const resumeBiometricLock = suspendBiometricLock();
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new LocationCaptureError(
        permission.canAskAgain ? 'permission-denied' : 'permission-blocked',
        permission.canAskAgain
          ? 'Android no concedió el permiso de ubicación.'
          : 'El permiso está bloqueado. Actívalo desde los ajustes de Rastro.',
      );
    }

    if (!(await Location.hasServicesEnabledAsync())) {
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
        } catch {
          throw new LocationCaptureError(
            'services-disabled',
            'Activa la ubicación del teléfono y el modo de precisión mejorada.',
          );
        }
      } else {
        throw new LocationCaptureError(
          'services-disabled',
          'Activa los servicios de ubicación del teléfono.',
        );
      }
    }

    const last = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60_000,
      requiredAccuracy: 500,
    });

    let position = last;
    try {
      position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }),
        20_000,
      );
    } catch {
      position ??= await Location.getLastKnownPositionAsync({
        maxAge: 24 * 60 * 60_000,
        requiredAccuracy: 2_000,
      });
    }

    if (!position) {
      throw new LocationCaptureError(
        'position-unavailable',
        'No hubo señal suficiente. Prueba cerca de una ventana o con GPS y Wi-Fi activos.',
      );
    }
    return approximateLocation(position.coords.latitude, position.coords.longitude);
  } finally {
    resumeBiometricLock();
  }
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location-timeout')), milliseconds);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (cause) => {
        clearTimeout(timer);
        reject(cause);
      },
    );
  });
}
