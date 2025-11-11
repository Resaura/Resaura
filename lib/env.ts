export const REQUIRED_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export type RequiredEnvKey = typeof REQUIRED_ENV_KEYS[number];

export class MissingEnvError extends Error {
  missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`Missing environment variables: ${missingKeys.join(', ')}`);
    this.name = 'MissingEnvError';
    this.missingKeys = missingKeys;
  }
}

export function readEnv(key: RequiredEnvKey): string | null {
  const value = process.env[key];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function collectMissingEnv(keys: readonly string[] = REQUIRED_ENV_KEYS): string[] {
  return keys.filter((key) => !readEnv(key as RequiredEnvKey));
}

export function assertRequiredEnv(): void {
  const missing = collectMissingEnv();
  if (missing.length > 0) {
    throw new MissingEnvError(missing);
  }
}

export function getSupabaseEnv() {
  assertRequiredEnv();
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new MissingEnvError(
      REQUIRED_ENV_KEYS.filter((key) => !readEnv(key as RequiredEnvKey))
    );
  }
  return { url, anonKey };
}
