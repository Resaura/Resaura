import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { Platform, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import { COLORS } from '@/lib/theme';

const STORAGE_KEY = 'display_immersive_mode';

type DisplayContextValue = {
  immersive: boolean;
  setImmersive: (value: boolean) => Promise<void>;
};

const DisplayContext = createContext<DisplayContextValue | undefined>(undefined);

async function applyImmersiveMode(enabled: boolean) {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await NavigationBar.setBehaviorAsync(enabled ? 'overlay-swipe' : 'inset-swipe');
    await NavigationBar.setVisibilityAsync(enabled ? 'hidden' : 'visible');
    await NavigationBar.setBackgroundColorAsync(enabled ? 'transparent' : COLORS.background);
    await NavigationBar.setButtonStyleAsync('light');
  } catch {
    // ignore errors when navigation bar API is unavailable
  }
  StatusBar.setHidden(enabled, 'fade');
}

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === '1') {
          setImmersiveState(true);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    void applyImmersiveMode(immersive);
  }, [immersive]);

  const setImmersive = useCallback(async (value: boolean) => {
    setImmersiveState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    await applyImmersiveMode(value);
  }, []);

  return <DisplayContext.Provider value={{ immersive, setImmersive }}>{children}</DisplayContext.Provider>;
}

export function useDisplaySettings() {
  const ctx = useContext(DisplayContext);
  if (!ctx) {
    throw new Error('useDisplaySettings must be used within a DisplayProvider');
  }
  return ctx;
}
