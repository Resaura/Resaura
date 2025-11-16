// app/auth/callback.tsx
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAppAlert } from '@/contexts/AlertContext';
import { COLORS } from '@/lib/theme';

type ParsedDebug = {
  url: string;
  type: string | null;
  code?: string | null;
  token?: string | null;
  token_hash?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  error?: string | null;
  error_code?: string | null;
  error_description?: string | null;
  hasTried?: string[];
  outcome?: string;
  hashRaw?: string | null;
  queryRaw?: Record<string, any>;
};

export default function AuthCallback() {
  const router = useRouter();
  const alert = useAppAlert();

  const hookUrl = Linking.useURL();
  const [debug, setDebug] = useState<ParsedDebug | null>(null);
  const [busy, setBusy] = useState(true);

  const parseHash = (url: string): Record<string, string> => {
    const i = url.indexOf('#');
    if (i === -1) return {};
    const frag = url.slice(i + 1);
    const out: Record<string, string> = {};
    for (const kv of frag.split('&')) {
      if (!kv) continue;
      const [k, v] = kv.split('=');
      if (!k) continue;
      out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
    return out;
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const initialUrl = await Linking.getInitialURL();
      const url = hookUrl ?? initialUrl ?? '';
      const parsed = url ? Linking.parse(url) : null;
      const hash = url ? parseHash(url) : {};
      const query = (parsed?.queryParams ?? {}) as Record<string, any>;

      const type = (hash.type as string) || (query.type as string) || null;

      const code = (query.code as string) || (hash.code as string) || null;
      const token_hash = (query.token_hash as string) || (hash.token_hash as string) || null;
      const token = (query.token as string) || (hash.token as string) || null;

      const access_token = (query.access_token as string) || (hash.access_token as string) || null;
      const refresh_token = (query.refresh_token as string) || (hash.refresh_token as string) || null;

      const err = (query.error as string) || (hash.error as string) || null;
      const err_code = (query.error_code as string) || (hash.error_code as string) || null;
      const err_desc = (query.error_description as string) || (hash.error_description as string) || null;

      const dbg: ParsedDebug = {
        url,
        type,
        code,
        token,
        token_hash,
        access_token,
        refresh_token,
        error: err,
        error_code: err_code,
        error_description: err_desc,
        hasTried: [],
        hashRaw: url.includes('#') ? url.slice(url.indexOf('#') + 1) : null,
        queryRaw: query,
      };

      try {
        if (!url) {
          dbg.outcome = 'no_url';
          setDebug(dbg);
          setBusy(false);
          return;
        }

        // --- Gestion des erreurs renvoyées par Supabase (ex: otp_expired) ---
        if (err || err_code) {
          dbg.outcome = 'provider_error';
          setDebug(dbg);

          const pretty =
            err_code === 'otp_expired'
              ? "Lien expiré. Demandez un nouveau mail depuis « Mot de passe oublié ? »."
              : err_desc || "Lien invalide. Demandez un nouveau mail.";

          alert.show('Réinitialisation', pretty, {
            actions: [{ text: 'OK', variant: 'primary', onPress: () => router.replace('/auth/forgot-password') }],
          });
          return;
        }

        // ----- RESET PASSWORD -----
        if (type === 'recovery') {
          // (A) token_hash / token -> verifyOtp
          if (token_hash || token) {
            dbg.hasTried!.push('verifyOtp');
            const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: token_hash ?? token! });
            if (error) throw new Error(`verifyOtp: ${error.message}`);
            if (!cancelled) {
              dbg.outcome = 'ok_verifyOtp';
              setDebug(dbg);
              router.replace('/auth/reset-password');
            }
            return;
          }

          // (B) code -> exchangeCodeForSession
          if (code) {
            dbg.hasTried!.push('exchangeCodeForSession');
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw new Error(`exchangeCodeForSession: ${error.message}`);
            if (!cancelled) {
              dbg.outcome = 'ok_exchange';
              setDebug(dbg);
              router.replace('/auth/reset-password');
            }
            return;
          }

          // (C) access+refresh -> setSession
          if (access_token && refresh_token) {
            dbg.hasTried!.push('setSession');
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw new Error(`setSession: ${error.message}`);
            if (!cancelled) {
              dbg.outcome = 'ok_setSession';
              setDebug(dbg);
              router.replace('/auth/reset-password');
            }
            return;
          }

          dbg.outcome = 'no_recovery_params';
          setDebug(dbg);
          setBusy(false);
          return;
        }

        // ----- SIGNUP confirmé -----
        if (type === 'signup') {
          dbg.outcome = 'signup_ok';
          setDebug(dbg);
          alert.show('Email confirmé', 'Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.');
          router.replace('/auth/login');
          return;
        }

        // Fallback
        dbg.outcome = 'fallback_login';
        setDebug(dbg);
        router.replace('/auth/login');
      } catch (e: any) {
        dbg.error = String(e?.message ?? e);
        dbg.outcome = 'error';
        setDebug(dbg);
        alert.show('Erreur', dbg.error);
        router.replace('/auth/login');
      } finally {
        setBusy(false);
      }
    })();

    return () => { cancelled = true; };
  }, [hookUrl]);

  return (
    <View style={styles.container}>
      {busy ? (
        <>
          <ActivityIndicator color={COLORS.azure} />
          <Text style={styles.text}>Traitement du lien…</Text>
        </>
      ) : null}

      <ScrollView style={styles.debugBox}>
        <Text style={styles.title}>DEBUG CALLBACK</Text>
        <Text style={styles.debugText}>{JSON.stringify(debug, null, 2)}</Text>
      </ScrollView>
      <Text style={[styles.text, { marginTop: 8 }]}>
        Si ça ne redirige pas, envoie-moi le bloc ci-dessus (tu peux masquer les valeurs sensibles).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 12, justifyContent: 'center' },
  text: { color: COLORS.text, textAlign: 'center' },
  title: { color: COLORS.azure, fontWeight: '800', marginBottom: 6 },
  debugBox: {
    marginTop: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(13,231,244,0.35)',
    borderRadius: 10,
    padding: 10,
  },
  debugText: { color: COLORS.text, fontFamily: 'monospace', fontSize: 12 },
});
