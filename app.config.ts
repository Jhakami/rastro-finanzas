import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Rastro',
  slug: 'rastro-finanzas',
  scheme: 'rastro',
  version: '0.1.4',
  orientation: 'portrait',
  icon: './assets/icon.png',
  backgroundColor: '#1E1E2E',
  userInterfaceStyle: 'dark',
  plugins: [
    'expo-router',
    ['expo-sqlite', { useSQLCipher: true, enableFTS: true }],
    ['expo-secure-store', { configureAndroidBackup: true }],
    ['expo-local-authentication', { faceIDPermission: 'Permite desbloquear tus finanzas.' }],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Rastro usa tu ubicación solo al guardar una compra para crear zonas aproximadas.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Permite adjuntar una foto opcional del comprobante.',
        microphonePermission: false,
      },
    ],
    '@maplibre/maplibre-react-native',
    './plugins/withAndroidSigning',
  ],
  android: {
    package: 'pe.rastro.finanzas',
    versionCode: 5,
    adaptiveIcon: {
      backgroundColor: '#1E1E2E',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'USE_BIOMETRIC',
      'POST_NOTIFICATIONS',
    ],
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.RECORD_AUDIO',
    ],
  },
  extra: { router: { origin: false } },
};

export default config;
