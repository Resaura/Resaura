// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (__DEV__) {
  console.log('[Supabase ENV]', {
    urlOk: !!supabaseUrl,
    anonLen: supabaseAnonKey?.length ?? 0,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,         // indispensable en React Native
    autoRefreshToken: true,
    persistSession: true,          // session conservée (gérée avec remember_me côté app)
    detectSessionInUrl: false,
  },
});
