// components/FormInput.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { COLORS, RADII } from '@/lib/theme';
import { Eye, EyeOff } from 'lucide-react-native';

type BaseProps = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle;
  errorText?: string | null;
};

export default function FormInput({
  label,
  containerStyle,
  errorText,
  style,
  onFocus,
  onBlur,
  ...rest
}: BaseProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!errorText && styles.inputError,
          style,
        ]}
        placeholderTextColor={COLORS.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {!!errorText && <Text style={styles.error}>{errorText}</Text>}
    </View>
  );
}

/** Variante mot de passe avec œil afficher/masquer */
FormInput.Password = function PasswordInput({
  label,
  containerStyle,
  errorText,
  style,
  onFocus,
  onBlur,
  ...rest
}: BaseProps) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!errorText && styles.inputError,
          { paddingRight: 48 },
        ]}
      >
        <TextInput
          style={styles.innerInput}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={!show}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        <TouchableOpacity
          onPress={() => setShow((s) => !s)}
          accessibilityLabel={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={styles.eyeBtn}
        >
          {show ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
        </TouchableOpacity>
      </View>
      {!!errorText && <Text style={styles.error}>{errorText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { color: COLORS.text, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADII.input,
    padding: 14,
    // ✅ Texte lisible
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  innerInput: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
  },
  inputFocused: { borderColor: COLORS.azure },
  inputError: { borderColor: '#ff7070' },
  error: { color: '#ff9a9a', marginTop: 6 },
  eyeBtn: { position: 'absolute', right: 12, top: 12, padding: 4 },
});
