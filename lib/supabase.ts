// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './env';

let client: SupabaseClient | null = null;
let clientError: Error | null = null;

function createSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  if (__DEV__) {
    console.log('[Supabase ENV]', {
      urlOk: !!url,
      anonLen: anonKey.length,
    });
  }
  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage, // indispensable en React Native
      autoRefreshToken: true,
      persistSession: true, // session conservée (gérée avec remember_me côté app)
      detectSessionInUrl: false,
    },
  });
}

export function ensureSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (clientError) throw clientError;

  try {
    client = createSupabaseClient();
    return client;
  } catch (error) {
    clientError = error as Error;
    throw clientError;
  }
}

export function getSupabaseInitError() {
  return clientError;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = ensureSupabaseClient();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
