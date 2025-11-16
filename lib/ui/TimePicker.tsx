// lib/ui/TimePicker.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS, RADII } from '@/lib/theme';

type Props = {
  visible: boolean;
  value: string; // HH:MM
  onClose: () => void;
  onConfirm: (value: string) => void;
};

export default function TimePicker({ visible, value, onClose, onConfirm }: Props) {
  const [initialH, initialM] = value.split(':').map((part) => Number.parseInt(part, 10) || 0);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);

  const [selectedH, setSelectedH] = useState(initialH);
  const [selectedM, setSelectedM] = useState(initialM);

  useEffect(() => {
    setSelectedH(initialH);
    setSelectedM(initialM);
  }, [initialH, initialM, visible]);

  const commit = () => {
    const formatted = `${String(selectedH).padStart(2, '0')}:${String(selectedM).padStart(2, '0')}`;
    onConfirm(formatted);
    onClose();
  };

  const renderItem = ({ item, selected, onPress }: { item: number; selected: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.item, selected && styles.itemSelected]}>
      <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{String(item).padStart(2, '0')}</Text>
    </Pressable>
  );

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Heure</Text>
          <View style={styles.rows}>
            <FlatList
              data={hours}
              keyExtractor={(item) => `h${item}`}
              renderItem={({ item }) => renderItem({ item, selected: item === selectedH, onPress: () => setSelectedH(item) })}
              style={styles.column}
            />
            <FlatList
              data={minutes}
              keyExtractor={(item) => `m${item}`}
              renderItem={({ item }) => renderItem({ item, selected: item === selectedM, onPress: () => setSelectedM(item) })}
              style={styles.column}
            />
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.ghost}>
              <Text style={styles.ghostText}>Annuler</Text>
            </Pressable>
            <Pressable onPress={commit} style={styles.cta}>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '90%',
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: 16,
  },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  rows: { flexDirection: 'row', gap: 12 },
  column: {
    flex: 1,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADII.card,
    backgroundColor: COLORS.inputBg,
  },
  item: { paddingVertical: 10, alignItems: 'center' },
  itemSelected: { backgroundColor: COLORS.azure },
  itemText: { color: COLORS.text, fontWeight: '700' },
  itemTextSelected: { color: COLORS.darkText, fontWeight: '900' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  cta: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ctaText: { color: COLORS.darkText, fontWeight: '800' },
  ghost: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ghostText: { color: COLORS.text, fontWeight: '700' },
});

