// components/clients/SmsPickerModal.tsx
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SmsShortcut } from '@/lib/smsShortcuts';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  visible: boolean;
  templates: SmsShortcut[];
  onSelect: (template: SmsShortcut) => void;
  onClose: () => void;
};

export function SmsPickerModal({ visible, templates, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Choisir un message</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.item}
                onPress={() => onSelect(template)}
              >
                <Text style={styles.itemLabel}>{template.label}</Text>
                <Text style={styles.itemPreview} numberOfLines={3}>
                  {template.body}
                </Text>
              </TouchableOpacity>
            ))}
            {!templates.length && (
              <Text style={styles.empty}>Aucun raccourci configuré.</Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    padding: 20,
  },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 18, marginBottom: 12 },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.inputBorder,
  },
  itemLabel: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  itemPreview: { color: COLORS.textMuted, lineHeight: 18 },
  empty: { color: COLORS.textMuted, fontStyle: 'italic' },
  closeButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeText: { color: COLORS.azure, fontWeight: '600' },
});

