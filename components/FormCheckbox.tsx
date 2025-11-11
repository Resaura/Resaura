// components/FormCheckbox.tsx
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
};

export default function FormCheckbox({ checked, onChange, label }: Props) {
  return (
    <TouchableOpacity onPress={() => onChange(!checked)} style={styles.row} activeOpacity={0.8}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <View style={styles.dot} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const SIZE = 22;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  box: {
    width: SIZE, height: SIZE,
    borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.azure,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  boxChecked: { backgroundColor: 'rgba(13,231,244,0.18)' },
  dot: { width: SIZE - 10, height: SIZE - 10, backgroundColor: COLORS.azure, borderRadius: 4 },
  label: { color: COLORS.text, fontSize: 14 },
});
