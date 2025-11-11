// components/PasswordStrength.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

export function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^\w\s]/.test(pw)) score += 1; // symboles
  return Math.min(score, 5);
}

export default function PasswordStrength({ value }: { value: string }) {
  const s = scorePassword(value);
  const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Excellent'];
  const pct = (s / 5) * 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.text}>{labels[s]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: COLORS.azure },
  text: { marginTop: 4, color: COLORS.textMuted, fontSize: 12 },
});
