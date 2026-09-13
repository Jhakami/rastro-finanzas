import * as Location from 'expo-location';
import { approximateLocation, type ApproximateCell } from '@/domain/location';

export async function captureApproximateLocation(): Promise<ApproximateCell | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const last = await Location.getLastKnownPositionAsync({
    maxAge: 60_000,
    requiredAccuracy: 1_000,
  });
  const position =
    last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return approximateLocation(position.coords.latitude, position.coords.longitude);
}
