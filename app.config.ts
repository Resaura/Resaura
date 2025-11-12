// app.config.ts
import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'Resaura';
const SLUG = 'resaura';
const PROJECT_ID = '9003c22f-1146-4180-bea6-fa64c470d5d6';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: 'resaura',

  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#001f3b',
  },

  android: {
    package: 'com.resaura.app',
    versionCode: 8, // ⚠️ incrémente avant chaque build store Android
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#001f3b',
    },
    edgeToEdge: true,
    statusBar: { backgroundColor: '#001f3b', barStyle: 'light' },
    navigationBar: { backgroundColor: '#001f3b', barStyle: 'light' },
    softwareKeyboardLayoutMode: 'pan',
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'resaura', host: 'auth', pathPrefix: '/callback' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      { action: 'VIEW', data: [{ scheme: 'resaura' }], category: ['BROWSABLE', 'DEFAULT'] },
    ],
  },

  ios: {
    bundleIdentifier: 'com.resaura.app', // ⚠️ respecte ton bundle ID Apple
    buildNumber: '1.0.0',
    supportsTablet: true,
    infoPlist: {
      // Deep link iOS (associe aussi les Associated Domains si besoin web)
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'resaura',
          CFBundleURLSchemes: ['resaura'],
        },
      ],
    },
  },

  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${PROJECT_ID}`,
  },

  runtimeVersion: { policy: 'sdkVersion' },

  extra: { eas: { projectId: PROJECT_ID } },

  plugins: ['expo-router'],
  experiments: { typedRoutes: true },

  // Les deux plateformes sont supportées
  platforms: ['android', 'ios'],
};

export default config;
