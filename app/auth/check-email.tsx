// app/auth/check-email.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { useAppAlert } from '@/contexts/AlertContext';
import { COLORS, RADII } from '@/lib/theme';

const RESEND_COOLDOWN = 30; // secondes

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();

  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  const targetEmail = useMemo(() => email ?? 'votre adresse e-mail', [email]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      alert.show('Adresse manquante', "Nous n'avons pas reçu votre e-mail. Revenez à l’inscription pour le saisir.", {
        actions: [{ text: 'Retour', variant: 'primary', onPress: () => router.replace('/auth/signup') }],
      });
      return;
    }

    setLoading(true);
    try {
      const redirectTo = Linking.createURL('/auth/callback'); // resaura://auth/callback
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        const msg = toFrenchAuthError(error);
        alert.show('Envoi impossible', msg);
      } else {
        alert.show('E-mail renvoyé', `Un nouveau lien vient d'être envoyé à ${email}.`, {
          actions: [{ text: 'OK', variant: 'primary' }],
        });
        setCooldown(RESEND_COOLDOWN);
      }
    } catch (e: any) {
      alert.show('Erreur', toFrenchAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Math.max(24, insets.bottom + 32) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Logo Resaura"
      />

      <Text style={styles.title}>Vérifiez votre boîte mail 📩</Text>

      <Text style={styles.text}>
        Nous avons envoyé un lien de confirmation à{'\n'}
        <Text style={styles.email}>{targetEmail}</Text>.
      </Text>

      <Text style={styles.textMuted}>
        Ouvrez le lien <Text style={styles.bold}>sur ce téléphone</Text> pour finaliser votre inscription.
      </Text>

      <View style={{ height: 8 }} />

      <Text style={styles.helper}>
        ⏱️ L’e-mail peut mettre quelques secondes à arriver.  {'\n'}
        📥 Pensez à vérifier le dossier <Text style={styles.bold}>Spam/Indésirables</Text>.
      </Text>

      <View style={{ height: 16 }} />

      <TouchableOpacity
        style={[styles.buttonPrimary, (loading || cooldown > 0) && styles.buttonDisabled]}
        onPress={handleResend}
        disabled={loading || cooldown > 0}
      >
        <Text style={styles.buttonPrimaryText}>
          {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : 'Renvoyer l’e-mail'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.replace('/auth/signup')}
        disabled={loading}
      >
        <Text style={styles.linkText}>Modifier l’adresse e-mail</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => router.replace('/auth/login')}
        disabled={loading}
      >
        <Text style={styles.linkText}>Retour à la connexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function toFrenchAuthError(err: any): string {
  const raw = String(err?.message || '');
  const code = String(err?.code || '');

  const m = raw.match(/For security purposes, you can only request this after (\d+) seconds?/i);
  if (m) {
    const s = Number(m[1] || '0');
    return `Pour des raisons de sécurité, vous pourrez réessayer dans ${s} seconde${s > 1 ? 's' : ''}.`;
  }
  if (/user.*already.*registered/i.test(raw) || code === 'user_already_registered') {
    return "Cet e-mail est déjà enregistré. Essayez de vous connecter ou réinitialisez votre mot de passe.";
  }
  if (/invalid login credentials/i.test(raw) || code === 'invalid_credentials') {
    return "Identifiants invalides. Vérifiez l’e-mail et le mot de passe.";
  }
  if (/email.*not.*confirmed/i.test(raw) || code === 'email_not_confirmed') {
    return "Veuillez confirmer votre adresse e-mail via le lien reçu avant de vous connecter.";
  }
  if (/row-level security/i.test(raw)) {
    return "Accès refusé par la sécurité des lignes (RLS). Réessayez dans un instant.";
  }
  return raw || "Une erreur est survenue.";
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingTop: 48,
    gap: 10,
  },
  logo: { width: 220, height: 220, borderRadius: RADII.button },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  text: { color: COLORS.text, fontSize: 16, textAlign: 'center' },
  textMuted: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  email: { color: COLORS.azure, fontWeight: '800' },
  bold: { fontWeight: '800', color: COLORS.text },
  helper: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  buttonPrimary: {
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minWidth: 220,
  },
  buttonPrimaryText: { color: '#003642', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  linkBtn: { paddingVertical: 10 },
  linkText: { color: COLORS.azure, fontWeight: '800', fontSize: 14 },
});
