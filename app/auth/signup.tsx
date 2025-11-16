// app/auth/signup.tsx
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
import PasswordStrength from '@/components/PasswordStrength';
import { toFrenchAuthError } from '@/lib/errors';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp } = useAuth();
  const alert = useAppAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !firstName || !lastName || !phone || !companyName) {
      alert.show('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== confirmPassword) {
      alert.show('Mot de passe', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      alert.show('Mot de passe', 'Au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, firstName, lastName, phone, companyName);
      alert.show(
        'Vérifiez votre e-mail',
        `Nous venons d'envoyer un lien de confirmation à ${email}. Ouvrez-le sur ce téléphone pour finaliser.`,
        {
          actions: [{ text: 'OK', variant: 'primary', onPress: () => router.replace({ pathname: '/auth/check-email', params: { email } }) }],
        }
      );
    } catch (e: any) {
      alert.show("Erreur d'inscription", toFrenchAuthError(e));
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
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Accédez à l’espace pro Resaura</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <FormInput
              label="Prénom"
              placeholder="Jean"
              value={firstName}
              onChangeText={setFirstName}
              editable={!loading}
              containerStyle={styles.half}
            />
            <FormInput
              label="Nom"
              placeholder="Dupont"
              value={lastName}
              onChangeText={setLastName}
              editable={!loading}
              containerStyle={styles.half}
            />
          </View>

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
          />

          <View style={{ height: 12 }} />

          <FormInput
            label="Téléphone"
            placeholder="+33 6 12 34 56 78"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!loading}
          />

          <View style={{ height: 12 }} />

          <FormInput
            label="Nom de l’entreprise"
            placeholder="Taxi Dupont"
            value={companyName}
            onChangeText={setCompanyName}
            editable={!loading}
          />

          <View style={{ height: 12 }} />

          <FormInput.Password
            label="Mot de passe"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />
          <PasswordStrength value={password} />

          <View style={{ height: 12 }} />

          <FormInput.Password
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
            onSubmitEditing={handleSignup}
          />

          <FormButton
            title={loading ? 'Création…' : 'Créer mon compte'}
            onPress={handleSignup}
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
  subtitle: { color: COLORS.textMuted, fontSize: 14 },

  form: { width: '100%', marginTop: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  linkText: { color: COLORS.azure, fontWeight: '800', textAlign: 'center', marginTop: 12 },
});
