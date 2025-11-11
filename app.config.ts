import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'resaura';
const SLUG = 'resaura';
const PROJECT_ID = '9003c22f-1146-4180-bea6-fa64c470d5d6';
const RUNTIME_VERSION_POLICY = 'sdkVersion';

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
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.resaura.app',
    buildNumber: '1.0.0',
  },
  android: {
    versionCode: 7,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdge: true,
    package: 'com.resaura.app',
    statusBar: {
      backgroundColor: '#001f3b',
      barStyle: 'light-content',
    },
    navigationBar: {
      backgroundColor: '#001f3b',
      barStyle: 'light-content',
    },
    softwareKeyboardLayoutMode: 'pan',
    intentFilters: [
      {
        action: 'VIEW',
        data: [{ scheme: 'resaura', host: 'auth', pathPrefix: '/callback' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        data: [{ scheme: 'resaura' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  platforms: ['ios', 'android', 'web'],
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    url: `https://u.expo.dev/${PROJECT_ID}`,
  },
  runtimeVersion: {
    policy: RUNTIME_VERSION_POLICY,
  },
  extra: {
    eas: {
      projectId: PROJECT_ID,
    },
  },
};

export default config;
