// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';
import * as Updates from 'expo-updates';

import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { EnvironmentGate } from '@/components/EnvironmentGate';

const APP_BG = '#001f3b';
const BUTTON_STYLE: 'light' | 'dark' = 'light';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(APP_BG).catch(() => {});
    NavigationBar.setBackgroundColorAsync(APP_BG).catch(() => {});
    NavigationBar.setButtonStyleAsync(BUTTON_STYLE).catch(() => {});

    (async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log('[updates] check failed:', error);
      }
    })();
  }, []);

  return (
    <AuthProvider>
      <AlertProvider>
        <EnvironmentGate>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Racine */}
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />

            {/* Auth */}
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/signup" />
            <Stack.Screen name="auth/forgot-password" />
            <Stack.Screen name="auth/reset-password" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="auth/check-email" />

            {/* Divers */}
            <Stack.Screen name="choose-profession" />
            <Stack.Screen name="debug-env" />
          </Stack>
          <StatusBar style="light" />
        </EnvironmentGate>
      </AlertProvider>
    </AuthProvider>
  );
}
