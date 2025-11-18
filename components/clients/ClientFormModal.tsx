// components/clients/ClientFormModal.tsx
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { ClientFormValues } from '@/lib/clients.service';
import type { ClientSummary } from '@/lib/clients.search';
import { COLORS, RADII } from '@/lib/theme';

const BILLING_OPTIONS: Array<{ key: ClientFormValues['billing_mode']; label: string }> = [
  { key: 'bord', label: 'Paiement à bord' },
  { key: 'compte', label: 'Paiement en compte' },
];

type Props = {
  visible: boolean;
  title?: string;
  values: ClientFormValues;
  onChange: (patch: Partial<ClientFormValues>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  suggestions: ClientSummary[];
  onSuggestionPress: (suggestion: ClientSummary) => void;
  duplicate: ClientSummary | null;
  onDuplicatePress?: (client: ClientSummary) => void;
};

export function ClientFormModal({
  visible,
  title = 'Nouveau client',
  values,
  onChange,
  onClose,
  onSave,
  saving,
  error,
  suggestions,
  onSuggestionPress,
  duplicate,
  onDuplicatePress,
}: Props) {
  const tagsValue = values.tags.join(', ');

  const handleTagsChange = (text: string) => {
    const tags = text
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    onChange({ tags });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.row}>
              <FormField
                label="Prénom"
                value={values.first_name}
                onChangeText={(text) => onChange({ first_name: text })}
                autoCapitalize="words"
              />
              <FormField
                label="Nom"
                value={values.last_name}
                onChangeText={(text) => onChange({ last_name: text })}
                autoCapitalize="words"
              />
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsLabel}>Suggestions</Text>
                {suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.id}
                    style={styles.suggestionItem}
                    onPress={() => onSuggestionPress(suggestion)}
                  >
                    <Text style={styles.suggestionText}>
                      {suggestion.first_name} {suggestion.last_name} · {suggestion.phone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <FormField
              label="Téléphone"
              value={values.phone}
              onChangeText={(text) => onChange({ phone: text })}
              keyboardType="phone-pad"
            />
            <FormField
              label="Email"
              value={values.email}
              onChangeText={(text) => onChange({ email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {duplicate && (
              <TouchableOpacity
                style={styles.duplicateBanner}
                onPress={() => onDuplicatePress?.(duplicate)}
              >
                <Text style={styles.duplicateText}>
                  Doublon potentiel ({duplicate.first_name} {duplicate.last_name}) — ouvrir la fiche
                </Text>
              </TouchableOpacity>
            )}
            <FormField
              label="Notes"
              value={values.notes}
              onChangeText={(text) => onChange({ notes: text })}
              multiline
            />
            <FormField
              label="Tags (séparés par une virgule)"
              value={tagsValue}
              onChangeText={handleTagsChange}
            />

            <Text style={styles.sectionTitle}>Adresses favorites</Text>
            <FormField
              label="Domicile"
              value={values.favorite_addresses.home ?? ''}
              onChangeText={(text) => onChange({
                favorite_addresses: { ...values.favorite_addresses, home: text || null },
              })}
            />
            <FormField
              label="Travail"
              value={values.favorite_addresses.work ?? ''}
              onChangeText={(text) => onChange({
                favorite_addresses: { ...values.favorite_addresses, work: text || null },
              })}
            />
            <FormField
              label="Aéroport"
              value={values.favorite_addresses.airport ?? ''}
              onChangeText={(text) => onChange({
                favorite_addresses: { ...values.favorite_addresses, airport: text || null },
              })}
            />

            <Text style={styles.sectionTitle}>Préférences</Text>
            <SwitchRow
              label="Client VIP"
              value={values.is_vip}
              onValueChange={(val) => onChange({ is_vip: val })}
            />
            <SwitchRow
              label="Blacklist"
              value={values.is_blacklisted}
              onValueChange={(val) => onChange({ is_blacklisted: val })}
            />
            <SwitchRow
              label="Opt-in SMS"
              value={values.opt_in_sms}
              onValueChange={(val) => onChange({ opt_in_sms: val })}
            />
            <SwitchRow
              label="Opt-in Email"
              value={values.opt_in_email}
              onValueChange={(val) => onChange({ opt_in_email: val })}
            />
            <SwitchRow
              label="Compte professionnel"
              value={values.company_flag}
              onValueChange={(val) => onChange({ company_flag: val })}
            />

            <Text style={styles.sectionTitle}>Mode de facturation</Text>
            <View style={styles.billingRow}>
              {BILLING_OPTIONS.map((option) => {
                const active = values.billing_mode === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.billingOption, active && styles.billingOptionActive]}
                    onPress={() => onChange({ billing_mode: option.key })}
                  >
                    <Text style={[styles.billingText, active && styles.billingTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
};

function FormField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

type SwitchRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SwitchRow({ label, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} thumbColor={value ? COLORS.azure : COLORS.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.inputBorder,
  },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  closeText: { color: COLORS.textMuted, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 12, flex: 1 },
  fieldLabel: { color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: { color: COLORS.text, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchLabel: { color: COLORS.text, fontWeight: '600' },
  billingRow: { flexDirection: 'row', gap: 12 },
  billingOption: {
    flex: 1,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  billingOptionActive: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  billingText: { textAlign: 'center', color: COLORS.text, fontWeight: '600' },
  billingTextActive: { color: COLORS.darkText },
  saveButton: {
    marginTop: 16,
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: COLORS.darkText, fontWeight: '800' },
  error: { color: COLORS.danger, marginTop: 12, fontWeight: '600' },
  suggestions: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  suggestionsLabel: {
    color: COLORS.textMuted,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 10 },
  suggestionText: { color: COLORS.text },
  duplicateBanner: {
    backgroundColor: 'rgba(255, 199, 0, 0.15)',
    borderRadius: RADII.card,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,199,0,0.4)',
    marginBottom: 12,
  },
  duplicateText: { color: COLORS.text, fontWeight: '600' },
});
