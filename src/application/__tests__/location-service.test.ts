import * as Location from 'expo-location';
import { captureApproximateLocation, LocationCaptureError } from '../location-service';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted' },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const location = jest.mocked(Location);

describe('captureApproximateLocation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('distingue un permiso bloqueado para poder abrir Ajustes', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      expires: 'never',
      status: Location.PermissionStatus.DENIED,
    });

    await expect(captureApproximateLocation()).rejects.toMatchObject<Partial<LocationCaptureError>>(
      {
        code: 'permission-blocked',
      },
    );
  });

  it('descarta el punto preciso después de obtenerlo en primer plano', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
      expires: 'never',
      status: Location.PermissionStatus.GRANTED,
    });
    location.hasServicesEnabledAsync.mockResolvedValue(true);
    location.getLastKnownPositionAsync.mockResolvedValue(null);
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: -12.046374,
        longitude: -77.042793,
        altitude: null,
        accuracy: 10,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    const result = await captureApproximateLocation();

    expect(location.getCurrentPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.High }),
    );
    expect(result.centerLatitude).not.toBe(-12.046374);
    expect(result.centerLongitude).not.toBe(-77.042793);
  });
});
