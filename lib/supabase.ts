// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './env';

let supabaseInstance: SupabaseClient | null = null;
let initError: Error | null = null;

function buildClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();

  if (__DEV__) {
    console.log('[supabase] init', {
      urlDefined: Boolean(url),
      anonKeyLength: anonKey.length,
    });
  }

  return createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function ensureSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (initError) {
    throw initError;
  }

  try {
    supabaseInstance = buildClient();
    return supabaseInstance;
  } catch (error) {
    initError = error as Error;
    throw initError;
  }
}

export function getSupabaseInitError() {
  return initError;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = ensureSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
