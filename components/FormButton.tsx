// components/FormButton.tsx
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'ghost';
};

export default function FormButton({ title, onPress, disabled, loading, style, variant = 'primary' }: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.btn,
        variant === 'ghost' && styles.ghost,
        isDisabled && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={variant === 'ghost' ? styles.ghostText : styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 16,
    alignItems: 'center',
  },
  text: { color: '#003642', fontSize: 16, fontWeight: '800' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.azure },
  ghostText: { color: COLORS.azure, fontWeight: '800', fontSize: 16 },
});
