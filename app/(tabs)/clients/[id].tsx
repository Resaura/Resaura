// app/(tabs)/clients/[id].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MessageSquare,
  Navigation,
  Phone,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react-native';

import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { useAppAlert } from '@/contexts/AlertContext';
import {
  ClientDetail,
  ClientFormValues,
  ClientHistoryCursor,
  ClientHistoryEntry,
  fetchClientDetail,
  fetchClientHistory,
  toggleBlacklist,
  toggleVip,
  upsertClient,
} from '@/lib/clients.service';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { SmsPickerModal } from '@/components/clients/SmsPickerModal';
import { SmsShortcut, getSmsShortcuts } from '@/lib/smsShortcuts';
import { getGoogleReviewMessage } from '@/lib/preferences';

const HISTORY_PAGE_SIZE = 10;

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();

  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [history, setHistory] = useState<ClientHistoryEntry[]>([]);
  const [historyCursor, setHistoryCursor] = useState<ClientHistoryCursor | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [formValues, setFormValues] = useState<ClientFormValues | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [smsTemplates, setSmsTemplates] = useState<SmsShortcut[]>([]);
  const [smsPicker, setSmsPicker] = useState<{ visible: boolean; client?: ClientDetail | null }>({
    visible: false,
    client: null,
  });

  const reviewTemplate = useMemo(
    () => smsTemplates.find((template) => template.id === 'review'),
    [smsTemplates],
  );

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const info = await fetchClientDetail(id);
      setDetail(info);
      setFormValues(mapDetailToForm(info));
      await loadHistory(info.id, true);
    } catch (error: any) {
      alert.show('Fiche indisponible', error?.message ?? 'Impossible de charger ce client.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [alert, id, router]);

  const loadHistory = useCallback(
    async (clientId: string, reset = false) => {
      if (historyLoading) return;
      setHistoryLoading(true);
      try {
        const result = await fetchClientHistory(
          clientId,
          reset ? null : historyCursor,
          HISTORY_PAGE_SIZE,
        );
        setHistory(reset ? result.items : [...history, ...result.items]);
        setHistoryCursor(result.nextCursor);
      } catch {
        // silencieux
      } finally {
        setHistoryLoading(false);
      }
    },
    [history, historyCursor, historyLoading],
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [shortcuts, review] = await Promise.all([getSmsShortcuts(), getGoogleReviewMessage()]);
      const templates = [
        ...shortcuts,
        { id: 'review', label: 'Avis Google', body: review, channel: 'sms' as const },
      ];
      if (mounted) setSmsTemplates(templates);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCall = async () => {
    if (!detail) return;
    try {
      await Linking.openURL(`tel:${detail.phone}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir l'application Téléphone.");
    }
  };

  const sendSms = async (body: string) => {
    if (!detail) return;
    try {
      await Linking.openURL(`sms:${detail.phone}?body=${encodeURIComponent(body)}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir l'application SMS.");
    }
  };

  const sendWhatsapp = async (body: string) => {
    if (!detail) return;
    try {
      const normalized = detail.phone.replace(/^\+/, '');
      await Linking.openURL(`https://wa.me/${normalized}?text=${encodeURIComponent(body)}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir WhatsApp.");
    }
  };

  const openSmsPicker = () => {
    if (!detail) return;
    setSmsPicker({ visible: true, client: detail });
  };

  const renderTemplate = (template: string) => {
    if (!detail) return template;
    const replacements: Record<string, string> = {
      '{client}': `${detail.first_name} ${detail.last_name}`.trim(),
      '{first_name}': detail.first_name,
      '{last_name}': detail.last_name,
    };
    return Object.entries(replacements).reduce(
      (acc, [token, value]) => acc.replace(new RegExp(token, 'gi'), value),
      template,
    );
  };

  const handleSmsTemplate = (template: SmsShortcut) => {
    const message = renderTemplate(template.body);
    if (template.channel === 'whatsapp') {
      void sendWhatsapp(message);
    } else {
      void sendSms(message);
    }
    setSmsPicker({ visible: false, client: null });
  };

  const handleReserve = () => {
    if (!detail) return;
    (globalThis as any).__RESAURA_CLIENT_PREFILL = {
      first_name: detail.first_name,
      last_name: detail.last_name,
      phone: detail.phone,
    };
    router.push('/(tabs)');
  };

  const handleReview = () => {
    if (!detail || !reviewTemplate) {
      openSmsPicker();
      return;
    }
    const message = renderTemplate(reviewTemplate.body);
    void sendSms(message);
  };

  const openNavigation = () => {
    if (!detail) return;
    const target =
      detail.favorite_addresses?.home
      || detail.favorite_addresses?.work
      || detail.favorite_addresses?.airport;
    if (!target) {
      alert.show('Adresse manquante', 'Ajoutez une adresse favorite pour lancer un itinéraire.');
      return;
    }
    const encoded = encodeURIComponent(target);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`).catch(() => {
      alert.show('Action impossible', "Impossible d'ouvrir l'itinéraire.");
    });
  };

  const handleBlacklistToggle = async () => {
    if (!detail) return;
    const next = !detail.is_blacklisted;
    await toggleBlacklist(detail.id, next).catch((error) =>
      alert.show('Action impossible', error?.message ?? 'Impossible de mettre à jour la blacklist.'),
    );
    setDetail({ ...detail, is_blacklisted: next });
  };

  const handleVipToggle = async () => {
    if (!detail) return;
    const next = !detail.is_vip;
    await toggleVip(detail.id, next).catch((error) =>
      alert.show('Action impossible', error?.message ?? 'Impossible de mettre à jour VIP.'),
    );
    setDetail({ ...detail, is_vip: next });
  };

  const persistOptIn = async (patch: Partial<ClientFormValues>) => {
    if (!detail) return;
    const payload = { ...mapDetailToForm(detail), ...patch };
    try {
      const saved = await upsertClient(payload);
      setDetail(saved);
    } catch (error: any) {
      alert.show('Action impossible', error?.message ?? 'Impossible de mettre à jour ce champ.');
    }
  };

  const handleEdit = () => {
    if (!detail) return;
    setFormValues(mapDetailToForm(detail));
    setFormVisible(true);
    setFormError(null);
  };

  const handleSaveForm = async () => {
    if (!formValues || !detail) return;
    if (!formValues.first_name.trim() || !formValues.last_name.trim()) {
      setFormError('Nom et prénom requis.');
      return;
    }
    setFormSaving(true);
    try {
      const saved = await upsertClient(formValues);
      setDetail(saved);
      setFormVisible(false);
      alert.show('Client mis à jour', `${saved.first_name} ${saved.last_name}`);
    } catch (error: any) {
      setFormError(error?.message ?? 'Impossible de sauvegarder ce client.');
    } finally {
      setFormSaving(false);
    }
  };

  if (loading || !detail) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={COLORS.azure} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(32, insets.bottom + 16), gap: 20 }}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <ChevronLeft color={COLORS.azure} />
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>
              {detail.last_name} {detail.first_name}
            </Text>
            <Text style={styles.meta}>
              {detail.total_courses} courses · {formatCurrency(detail.lifetime_value)}
            </Text>
          </View>
          <View style={styles.headerIcons}>
            {detail.is_vip && <Star size={18} color={COLORS.azure} />}
            {detail.is_blacklisted && <ShieldAlert size={18} color={COLORS.danger} />}
          </View>
        </View>
        <View style={styles.actions}>
          <HeaderAction icon={Phone} label="Appeler" onPress={handleCall} />
          <HeaderAction icon={MessageSquare} label="SMS" onPress={openSmsPicker} />
          <HeaderAction icon={Send} label="Réserver" onPress={handleReserve} />
          <HeaderAction icon={Navigation} label="Itinéraire" onPress={openNavigation} />
          <HeaderAction icon={Sparkles} label="Avis Google" onPress={handleReview} />
        </View>

        <Section title="Coordonnées">
          <DetailRow label="Téléphone" value={detail.phone} onPress={handleCall} />
          <DetailRow label="Email" value={detail.email ?? '-'} />
          <SwitchRow
            label="Opt-in SMS"
            value={detail.opt_in_sms}
            onValueChange={(value) => persistOptIn({ opt_in_sms: value })}
          />
          <SwitchRow
            label="Opt-in Email"
            value={detail.opt_in_email}
            onValueChange={(value) => persistOptIn({ opt_in_email: value })}
          />
        </Section>

        <Section title="Adresses favorites">
          <DetailRow label="Domicile" value={detail.favorite_addresses?.home ?? '-'} />
          <DetailRow label="Travail" value={detail.favorite_addresses?.work ?? '-'} />
          <DetailRow label="Aéroport" value={detail.favorite_addresses?.airport ?? '-'} />
        </Section>

        <Section title="Segmentation">
          <StatsRow label="Courses totales" value={`${detail.total_courses}`} />
          <StatsRow label="CA cumulé" value={formatCurrency(detail.lifetime_value)} />
          <StatsRow label="Statut" value={formatLoyalty(detail.loyalty_status ?? 'bronze')} />
          {detail.company_flag && (
            <StatsRow
              label="Compte pro"
              value={detail.billing_mode === 'compte' ? 'Paiement en compte' : 'Paiement à bord'}
            />
          )}
        </Section>

        <Section title="Historique">
          {history.length === 0 && <Text style={styles.emptyHistory}>Aucune course enregistrée.</Text>}
          {history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <Text style={styles.historyDate}>{formatDate(item.datetime)}</Text>
              <Text style={styles.historyText}>{item.pickup}</Text>
              <Text style={styles.historyTextMuted}>{item.dropoff}</Text>
              <View style={styles.historyRow}>
                <Text style={styles.historyStatus}>{item.status}</Text>
                <Text style={styles.historyPrice}>{formatCurrency(item.actual_price ?? 0)}</Text>
              </View>
            </View>
          ))}
          {historyCursor && (
            <TouchableOpacity style={styles.loadHistory} onPress={() => loadHistory(detail.id)}>
              <Text style={styles.loadHistoryText}>
                {historyLoading ? 'Chargement...' : 'Voir plus'}
              </Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section title="Notes & Tags">
          <Text style={styles.notes}>{detail.notes?.trim() || 'Pas de note.'}</Text>
          <View style={styles.tagsRow}>
            {detail.tags?.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </Section>

        <View style={styles.actionsFooter}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Text style={styles.editText}>Éditer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.vipButton} onPress={handleVipToggle}>
            <Text style={styles.vipText}>{detail.is_vip ? 'Retirer VIP' : 'Marquer VIP'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.blacklistButton, detail.is_blacklisted && { backgroundColor: COLORS.azure }]}
            onPress={handleBlacklistToggle}
          >
            <Text style={styles.blacklistText}>
              {detail.is_blacklisted ? 'Retirer blacklist' : 'Blacklister'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {formValues && (
        <ClientFormModal
          visible={formVisible}
          title="Modifier le client"
          values={formValues}
          onChange={(patch) => setFormValues((prev) => (prev ? { ...prev, ...patch } : prev))}
          onClose={() => setFormVisible(false)}
          onSave={handleSaveForm}
          saving={formSaving}
          error={formError}
          suggestions={[]}
          onSuggestionPress={() => {}}
          duplicate={null}
        />
      )}

      <SmsPickerModal
        visible={smsPicker.visible}
        templates={smsTemplates}
        onSelect={handleSmsTemplate}
        onClose={() => setSmsPicker({ visible: false, client: null })}
      />
    </View>
  );
}

const mapDetailToForm = (detail: ClientDetail): ClientFormValues => ({
  id: detail.id,
  first_name: detail.first_name,
  last_name: detail.last_name,
  phone: detail.phone,
  email: detail.email ?? '',
  notes: detail.notes ?? '',
  tags: detail.tags ?? [],
  is_vip: detail.is_vip,
  is_blacklisted: detail.is_blacklisted,
  opt_in_sms: detail.opt_in_sms,
  opt_in_email: detail.opt_in_email,
  company_flag: detail.company_flag,
  billing_mode: (detail.billing_mode as ClientFormValues['billing_mode']) ?? 'bord',
  favorite_addresses: {
    home: detail.favorite_addresses?.home ?? null,
    work: detail.favorite_addresses?.work ?? null,
    airport: detail.favorite_addresses?.airport ?? null,
  },
});

function HeaderAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Phone;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.headerAction} onPress={onPress}>
      <Icon size={18} color={COLORS.darkText} />
      <Text style={styles.headerActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.detailRow} onPress={onPress} disabled={!onPress}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </TouchableOpacity>
  );
}

function StatsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statsRow}>
      <Text style={styles.statsLabel}>{label}</Text>
      <Text style={styles.statsValue}>{value}</Text>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} thumbColor={value ? COLORS.azure : COLORS.textMuted} />
    </View>
  );
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatLoyalty = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('gold') || normalized.includes('or')) return 'Or';
  if (normalized.includes('silver') || normalized.includes('argent')) return 'Argent';
  return 'Bronze';
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: COLORS.azure, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  meta: { color: COLORS.textMuted, marginTop: 4 },
  headerIcons: { flexDirection: 'row', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: { color: COLORS.darkText, fontWeight: '700' },
  section: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOW.card,
  },
  sectionTitle: { color: COLORS.text, fontWeight: '700', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { color: COLORS.textMuted, fontWeight: '600' },
  detailValue: { color: COLORS.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statsLabel: { color: COLORS.textMuted },
  statsValue: { color: COLORS.text, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabel: { color: COLORS.text },
  emptyHistory: { color: COLORS.textMuted, fontStyle: 'italic' },
  historyCard: {
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: 12,
    marginTop: 10,
    backgroundColor: COLORS.backgroundDeep,
  },
  historyDate: { color: COLORS.text, fontWeight: '700' },
  historyText: { color: COLORS.text, marginTop: 4 },
  historyTextMuted: { color: COLORS.textMuted },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  historyStatus: { color: COLORS.textMuted, fontWeight: '600' },
  historyPrice: { color: COLORS.text, fontWeight: '700' },
  loadHistory: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.azure,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  loadHistoryText: { color: COLORS.azure, fontWeight: '600' },
  notes: { color: COLORS.text, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tag: {
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: COLORS.text },
  actionsFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  editButton: {
    flexGrow: 1,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.azure,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editText: { color: COLORS.azure, fontWeight: '700' },
  vipButton: {
    flexGrow: 1,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  vipText: { color: COLORS.text, fontWeight: '700' },
  blacklistButton: {
    flexGrow: 1,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  blacklistText: { color: COLORS.darkText, fontWeight: '700' },
});
