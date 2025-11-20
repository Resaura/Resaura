import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import CalendarSingle from '@/lib/ui/CalendarSingle';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  visible: boolean;
  value: Date;
  title?: string;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

export default function CalendarPickerModal({
  visible,
  value,
  title = 'Choisir une date',
  onCancel,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<Date>(value);

  useEffect(() => {
    if (visible) setSelected(value);
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <CalendarSingle value={selected} onChange={setSelected} selectedColor={COLORS.azure} />
          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onCancel}>
              <Text style={styles.ghostText}>Annuler</Text>
            </Pressable>
            <Pressable style={styles.ctaBtn} onPress={() => onConfirm(selected)}>
              <Text style={styles.ctaText}>Valider</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: COLORS.card,
    borderRadius: RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 18, marginBottom: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  ghostText: { color: COLORS.text },
  ctaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADII.button,
    backgroundColor: COLORS.azure,
  },
  ctaText: { color: COLORS.darkText, fontWeight: '800' },
});
