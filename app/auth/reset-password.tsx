// app/auth/reset-password.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAppAlert } from '@/contexts/AlertContext';
import { COLORS, RADII } from '@/lib/theme';
import FormInput from '@/components/FormInput';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();

  const onSubmit = async () => {
    if (!password || !confirm) {
      alert.show('Champs requis', 'Veuillez saisir et confirmer le nouveau mot de passe.');
      return;
    }
    if (password !== confirm) {
      alert.show('Mot de passe', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      alert.show('Mot de passe', 'Au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();

      alert.show('Mot de passe modifié', 'Vous pouvez maintenant vous reconnecter.', {
        actions: [{ text: 'Se connecter', variant: 'primary', onPress: () => router.replace('/auth/login') }],
      });
    } catch (e: any) {
      alert.show('Erreur', e?.message ?? 'Impossible de mettre à jour le mot de passe.');
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
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>Saisissez un nouveau mot de passe pour votre compte.</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Nouveau mot de passe"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            returnKeyType="next"
          />

          <View style={{ height: 12 }} />

          <FormInput
            label="Confirmer le mot de passe"
            placeholder="••••••••"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            editable={!loading}
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />

          <TouchableOpacity
            style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonPrimaryText}>{loading ? 'Mise à jour…' : 'Mettre à jour'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace('/auth/login')} disabled={loading}>
            <Text style={styles.linkText}>Retour à la connexion</Text>
          </TouchableOpacity>
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

  buttonPrimary: {
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonPrimaryText: { color: '#003642', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },

  linkBtn: { paddingVertical: 12, alignItems: 'center' },
  linkText: { color: COLORS.azure, fontWeight: '800' },
});
