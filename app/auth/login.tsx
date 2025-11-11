import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAppAlert } from '@/contexts/AlertContext';
import { COLORS, RADII } from '@/lib/theme';
import FormInput from '@/components/FormInput';
import FormButton from '@/components/FormButton';
import FormCheckbox from '@/components/FormCheckbox';
import { toFrenchAuthError } from '@/lib/errors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, rememberMe, setRememberMe } = useAuth();
  const alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      alert.show('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);

    try {
      console.log('[LOGIN] Tentative de connexion...');
      await signIn(email.trim(), password);
      console.log('[LOGIN] Connexion réussie, redirection...');
      router.replace('/(tabs)');

      // sécurité : retente la navigation si elle échoue silencieusement
      setTimeout(() => {
        // @ts-ignore
        const current = global?.__expo?.router?.segments?.join?.('/') || '';
        if (!current.includes('(tabs)')) {
          router.replace('/(tabs)');
        }
      }, 400);
    } catch (e: any) {
      console.log('[LOGIN] Erreur:', e);
      const code = (e?.code || e?.message || '').toString();
      if (code === 'EMAIL_NOT_CONFIRMED') {
        alert.show('Email non confirmé', "Votre email n'est pas encore confirmé. Ouvrez le lien reçu puis réessayez.");
      } else {
        alert.show('Erreur de connexion', toFrenchAuthError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(24, insets.bottom + 32) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Logo Resaura"
          />
          <Text style={styles.slogan}>Tout commence par une réservation</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Email"
            placeholder="votre@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
            editable={!loading}
            returnKeyType="next"
          />

          <View style={{ height: 12 }} />

          <FormInput.Password
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={handleLogin}
          />

          <View style={styles.rowBetween}>
            <FormCheckbox checked={rememberMe} onChange={setRememberMe} label="Rester connecté" />
            <Text style={styles.linkText} onPress={() => router.push('/auth/forgot-password')}>
              Mot de passe oublié ?
            </Text>
          </View>

          <FormButton
            title={loading ? 'Connexion…' : 'Se connecter'}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />

          <View style={{ height: 12 }} />

          <View style={styles.rowCenter}>
            <Text style={styles.muted}>Pas encore de compte ? </Text>
            <Text style={styles.linkText} onPress={() => router.push('/auth/signup')}>
              Créer un compte
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48, minHeight: '100%' },
  header: { alignItems: 'center', marginBottom: 24, gap: 10 },
  logo: { width: 200, height: 200, borderRadius: RADII.button },
  slogan: { color: COLORS.azure, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  form: { width: '100%', marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  rowCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { color: COLORS.azure, fontWeight: '800' },
  muted: { color: COLORS.textMuted },
});
