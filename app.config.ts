// app.config.ts
import type { ExpoConfig } from 'expo/config';

const APP_NAME = 'Resaura';
const SLUG = 'resaura';
const PROJECT_ID = '9003c22f-1146-4180-bea6-fa64c470d5d6';
const MARINE = '#001f3b';
const AZURE = '#0de7f4';

const config: ExpoConfig = {
  name: APP_NAME,
  slug: SLUG,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: 'resaura',
  assetBundlePatterns: ['**/*'],
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: MARINE,
  },
  androidStatusBar: {
    backgroundColor: MARINE,
    barStyle: 'light-content',
    hidden: false,
    translucent: false,
  },
  androidNavigationBar: {
    backgroundColor: MARINE,
    barStyle: 'light-content',
  },
  android: {
    package: 'com.resaura.app',
    versionCode: 9,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: MARINE,
    },
    edgeToEdge: true,
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
  ios: {
    bundleIdentifier: 'com.resaura.app',
    buildNumber: '1.0.0',
    supportsTablet: true,
    infoPlist: {
      UIStatusBarStyle: 'UIStatusBarStyleLightContent',
      UIViewControllerBasedStatusBarAppearance: true,
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
  runtimeVersion: '1.0.0',
  extra: {
    eas: { projectId: PROJECT_ID },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    deepLinkCallback: 'resaura://auth/callback',
    brand: { marine: MARINE, azure: AZURE },
  },
  plugins: ['expo-router', 'expo-updates'],
  experiments: { typedRoutes: true },
  platforms: ['android', 'ios'],
};

export default config;
