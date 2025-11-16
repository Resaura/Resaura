import { ReactNode, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as Updates from 'expo-updates';

import { MissingEnvError, REQUIRED_ENV_KEYS } from '@/lib/env';
import { ensureSupabaseClient } from '@/lib/supabase';
import { COLORS } from '@/lib/theme';

interface EnvironmentGateProps {
  children: ReactNode;
}

export function EnvironmentGate({ children }: EnvironmentGateProps) {
  const [forceReloading, setForceReloading] = useState(false);

  const issue = useMemo(() => {
    try {
      ensureSupabaseClient();
      return null;
    } catch (error) {
      if (error instanceof MissingEnvError) {
        return {
          type: 'missing-env' as const,
          missing: error.missingKeys,
        };
      }
      return {
        type: 'unknown' as const,
        message: (error as Error).message || 'Unexpected configuration error.',
      };
    }
  }, [forceReloading]);

  if (!issue) {
    return <>{children}</>;
  }

  const handleReload = async () => {
    try {
      setForceReloading((prev) => !prev);
      if (Updates.reloadAsync) {
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.warn('[EnvironmentGate] reload failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Configuration requise</Text>
        {issue.type === 'missing-env' ? (
          <>
            <Text style={styles.message}>
              Certaines variables d'environnement manquent pour initialiser Supabase.
            </Text>
            <Text style={styles.subtitle}>Variables nécessaires :</Text>
            {REQUIRED_ENV_KEYS.map((key) => (
              <Text key={key} style={styles.envKey}>
                • {key} {issue.missing.includes(key) ? '(manquante)' : ''}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.message}>{issue.message}</Text>
        )}
        <Text style={styles.footer}>
          Vérifie la configuration de ton build (app.config, variables EAS, secrets) puis relance
          l'application.
        </Text>
        <Pressable style={styles.reloadButton} onPress={handleReload}>
          <Text style={styles.reloadText}>Relancer l'application</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    backgroundColor: '#0e2744',
    borderWidth: 1,
    borderColor: '#183657',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  message: {
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  subtitle: {
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  envKey: {
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  footer: {
    marginTop: 16,
    color: COLORS.textMuted,
  },
  reloadButton: {
    marginTop: 24,
    backgroundColor: '#1e8ad8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reloadText: {
    color: '#fff',
    fontWeight: '600',
  },
});
