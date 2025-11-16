// app/index.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/lib/theme';

export default function Boot() {
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;

    let safety: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        // 1) Si deep-link vers /auth/* : on laisse Expo Router gérer (pas de redirection)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const parsed = Linking.parse(initialUrl);
          const path = (parsed?.path || '').toLowerCase();
          if (path.startsWith('auth/')) return; // ex: auth/callback
        }

        // 2) Sinon, route par défaut selon la session
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;
        router.replace(hasSession ? '/(tabs)' : '/auth/login');
      } catch (e) {
        // En cas de souci, on ne bloque jamais le boot
        router.replace('/auth/login');
      }
    })();

    // 3) Filet de sécurité : si rien ne s’est passé en 1500ms, on va au login
    safety = setTimeout(() => {
      router.replace('/auth/login');
    }, 1500);

    return () => {
      if (safety) clearTimeout(safety);
    };
  }, [navState?.key]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator />
    </View>
  );
}
