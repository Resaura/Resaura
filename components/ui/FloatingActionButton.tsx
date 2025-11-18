import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, RADII, SHADOW } from '@/lib/theme';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  bottomOffset?: number;
  rightOffset?: number;
};

export default function FloatingActionButton({
  onPress,
  accessibilityLabel = 'Ajouter',
  icon,
  style,
  bottomOffset = 16,
  rightOffset = 16,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottom = (insets.bottom || 0) + bottomOffset;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, { bottom, right: rightOffset }, style]}
    >
      {icon ?? <Plus size={24} color={COLORS.darkText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.azure,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.card,
  },
});
