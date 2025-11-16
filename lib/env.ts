import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export const REQUIRED_ENV_KEYS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

export class MissingEnvError extends Error {
  missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`[env] Missing required environment variables: ${missingKeys.join(', ')}`);
    this.name = 'MissingEnvError';
    this.missingKeys = missingKeys;
  }
}

const configSource = (Constants.expoConfig as any) ?? (Updates.manifest as any);
const expoExtra = configSource?.extra ?? {};

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? (expoExtra as any).supabaseUrl ?? (expoExtra as any).EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  (expoExtra as any).supabaseAnonKey ??
  (expoExtra as any).EXPO_PUBLIC_SUPABASE_ANON_KEY;

let cachedEnv: SupabaseEnv | null = null;
let cachedError: Error | null = null;

export function getSupabaseEnv(): SupabaseEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  if (cachedError) {
    throw cachedError;
  }

  try {
    const missing: string[] = [];
    if (!SUPABASE_URL) {
      missing.push('EXPO_PUBLIC_SUPABASE_URL');
    }
    if (!SUPABASE_ANON_KEY) {
      missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    }

    if (missing.length > 0) {
      throw new MissingEnvError(missing);
    }

    cachedEnv = { url: SUPABASE_URL!, anonKey: SUPABASE_ANON_KEY! };
    return cachedEnv;
  } catch (error) {
    cachedError = error as Error;
    throw cachedError;
  }
}
