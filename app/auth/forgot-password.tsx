// app/auth/forgot-password.tsx
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
import { toFrenchAuthError } from '@/lib/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleResetPassword = async () => {
    if (!email) {
      alert.show('Email requis', 'Veuillez entrer votre adresse e-mail.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      alert.show(
        'Email envoyé',
        `Un lien de réinitialisation a été envoyé à ${email}.`,
        { actions: [{ text: 'OK', variant: 'primary', onPress: () => router.back() }] }
      );
    } catch (e: any) {
      alert.show('Erreur', toFrenchAuthError(e));
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
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>Entrez votre e-mail pour recevoir un lien de réinitialisation.</Text>
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
            returnKeyType="send"
            onSubmitEditing={handleResetPassword}
            editable={!loading}
          />

          <FormButton
            title={loading ? 'Envoi…' : 'Envoyer le lien'}
            onPress={handleResetPassword}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <Text style={styles.linkText} onPress={() => router.back()}>
            Retour à la connexion
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 48, minHeight: '100%' },

  header: { alignItems: 'center', marginBottom: 16, gap: 8 },
  logo: { width: 200, height: 200, borderRadius: RADII.button },
  title: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },

  form: { width: '100%', marginTop: 8 },

  linkText: { color: COLORS.azure, fontWeight: '800', textAlign: 'center', marginTop: 12 },
});
