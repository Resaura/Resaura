import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Filter } from 'lucide-react-native';

import { COLORS, RADII } from '@/lib/theme';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  active?: boolean;
  style?: ViewStyle;
};

export default function FilterButton({
  onPress,
  accessibilityLabel = 'Ouvrir les filtres',
  active = false,
  style,
}: Props) {
  const iconColor = active ? COLORS.darkText : COLORS.background;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, active && styles.buttonActive, style]}
    >
      <Filter size={20} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: RADII.button,
    backgroundColor: COLORS.azure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: COLORS.text,
  },
});
