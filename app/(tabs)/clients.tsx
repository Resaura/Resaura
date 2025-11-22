// app/(tabs)/clients.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react-native';

import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { useAppAlert } from '@/contexts/AlertContext';
import {
  ClientCursor,
  ClientFormValues,
  ClientListFilters,
  ClientListItem,
  ClientPortfolioUnavailableError,
  ClientSortOption,
  PHONE_E164_REGEX,
  fetchClients,
  lookupClientByPhone,
  maskPhone,
  normalizePhone,
  sortClientItems,
  upsertClient,
} from '@/lib/clients.service';
import { ClientSummary, searchClients } from '@/lib/clients.search';
import { SmsShortcut, getSmsShortcuts } from '@/lib/smsShortcuts';
import { getGoogleReviewMessage } from '@/lib/preferences';
import { ClientFormModal } from '@/components/clients/ClientFormModal';
import { SmsPickerModal } from '@/components/clients/SmsPickerModal';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import FilterButton from '@/components/ui/FilterButton';

const FILTERS_CONFIG: Array<{ key: keyof ClientListFilters; label: string }> = [
  { key: 'recents', label: 'Récents' },
  { key: 'frequent', label: 'Fréquents' },
  { key: 'notes', label: 'Avec notes' },
  { key: 'vip', label: 'VIP' },
  { key: 'blacklist', label: 'Blacklist' },
];

const SORT_OPTIONS: Array<{ key: ClientSortOption; label: string }> = [
  { key: 'lastRide', label: 'Dernière course' },
  { key: 'totalCourses', label: 'Total de courses' },
  { key: 'alphaAsc', label: 'Nom (A–Z)' },
  { key: 'alphaDesc', label: 'Nom (Z–A)' },
];

const DEFAULT_SORT: ClientSortOption = 'lastRide';

const FRENCH_MOBILE_REGEX = /^\+33(6|7)\d{8}$/;

const EMPTY_FORM: ClientFormValues = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  notes: '',
  tags: [],
  is_vip: false,
  is_blacklisted: false,
  opt_in_sms: true,
  opt_in_email: true,
  company_flag: false,
  billing_mode: 'bord',
  favorite_addresses: { home: null, work: null, airport: null },
};

const MASK_PREF_KEY = 'clients_mask_phone_pref';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const alert = useAppAlert();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<ClientListFilters>({
    recents: false,
    frequent: false,
    notes: false,
    vip: false,
    blacklist: false,
  });
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [sort, setSort] = useState<ClientSortOption>(DEFAULT_SORT);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [listCursor, setListCursor] = useState<ClientCursor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioReady, setPortfolioReady] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [obfuscatePhones, setObfuscatePhones] = useState(true);

  const [formVisible, setFormVisible] = useState(false);
  const [formValues, setFormValues] = useState<ClientFormValues>(EMPTY_FORM);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ClientSummary[]>([]);
  const [duplicate, setDuplicate] = useState<ClientSummary | null>(null);

  const [smsTemplates, setSmsTemplates] = useState<SmsShortcut[]>([]);
  const [smsPicker, setSmsPicker] = useState<{ visible: boolean; client: ClientListItem | null }>({
    visible: false,
    client: null,
  });

  useEffect(() => {
    AsyncStorage.getItem(MASK_PREF_KEY).then((value) => {
      setObfuscatePhones(value !== '0');
    });
  }, []);

  const persistMaskPref = useCallback((value: boolean) => {
    setObfuscatePhones(value);
    AsyncStorage.setItem(MASK_PREF_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchList = useCallback(
    async ({ cursor, reset }: { cursor?: ClientCursor | null; reset?: boolean } = {}) => {
      const isReset = reset || !cursor;
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await fetchClients({
          search: debouncedSearch,
          filters,
          sort,
          cursor: cursor ?? undefined,
        });
        setPortfolioReady(true);
        setListCursor(response.nextCursor);
        setClients((prev) => {
          const merged = cursor ? [...prev, ...response.items] : response.items;
          return sortClientItems(merged, sort);
        });
      } catch (error: any) {
        if (error instanceof ClientPortfolioUnavailableError) {
          setPortfolioReady(false);
          setClients([]);
          setListCursor(null);
        } else {
          alert.show('Chargement impossible', error?.message ?? 'Impossible de charger les clients.');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [alert, debouncedSearch, filters, sort],
  );

  useEffect(() => {
    fetchList({ reset: true });
    setExpandedId(null);
  }, [fetchList]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchList({ reset: true });
  }, [fetchList]);

  const loadMore = () => {
    if (!listCursor || loadingMore || loading) return;
    fetchList({ cursor: listCursor });
  };

  const toggleFilter = (key: keyof ClientListFilters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  const filtersBadgeLabel = useMemo(() => {
    const badges: string[] = [];
    if (activeFiltersCount > 0) {
      const suffix = activeFiltersCount > 1 ? 's' : '';
      badges.push(`${activeFiltersCount} filtre${suffix}`);
    }
    if (sort !== DEFAULT_SORT) {
      badges.push('Tri personnalisé');
    }
    return badges.join(' • ');
  }, [activeFiltersCount, sort]);

  const filtersButtonActive = filtersPanelOpen || Boolean(filtersBadgeLabel);

  const openFiltersPanel = () => setFiltersPanelOpen(true);
  const closeFiltersPanel = () => setFiltersPanelOpen(false);

  const handleSortChange = (value: ClientSortOption) => setSort(value);

  const openForm = (client?: ClientListItem) => {
    if (client) {
      setFormValues({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        phone: client.phone,
        email: client.email ?? '',
        notes: client.notes ?? '',
        tags: client.tags ?? [],
        is_vip: client.is_vip,
        is_blacklisted: client.is_blacklisted,
        opt_in_sms: client.opt_in_sms,
        opt_in_email: client.opt_in_email,
        company_flag: client.company_flag,
        billing_mode: (client.billing_mode as ClientFormValues['billing_mode']) ?? 'bord',
        favorite_addresses: {
          home: client.favorite_addresses?.home ?? null,
          work: client.favorite_addresses?.work ?? null,
          airport: client.favorite_addresses?.airport ?? null,
        },
      });
    } else {
      setFormValues(EMPTY_FORM);
    }
    setFormError(null);
    setDuplicate(null);
    setFormVisible(true);
  };

  const handleFormChange = (patch: Partial<ClientFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveForm = async () => {
    if (!formValues.first_name.trim() || !formValues.last_name.trim()) {
      setFormError('Nom et prénom requis.');
      return;
    }
    const normalizedPhone = normalizePhone(formValues.phone.trim());
    if (!normalizedPhone || !PHONE_E164_REGEX.test(normalizedPhone)) {
      setFormError('Le numéro doit être au format international (+336...) ou commencer par 06/07.');
      return;
    }
    if (!FRENCH_MOBILE_REGEX.test(normalizedPhone)) {
      setFormError('Utilisez un mobile français (06, 07 ou +33 6/7).');
      return;
    }
    setFormError(null);
    setFormSaving(true);
    try {
      const existing = await lookupClientByPhone(normalizedPhone);
      if (existing && existing.id !== formValues.id) {
        setDuplicate(existing);
        setFormError('Ce numéro est déjà associé à un autre client.');
        return;
      }
      const saved = await upsertClient({ ...formValues, phone: normalizedPhone });
      if (formValues.id) {
        setClients((prev) => {
          const filtered = prev.filter((item) => item.id !== saved.id);
          return sortClientItems([...filtered, saved], sort);
        });
      } else {
        await fetchList({ reset: true });
      }
      setFormVisible(false);
      alert.show('Client enregistré', `${saved.first_name} ${saved.last_name}`);
    } catch (error: any) {
      setFormError(error?.message ?? 'Impossible de sauvegarder ce client.');
    } finally {
      setFormSaving(false);
    }
  };

  useEffect(() => {
    if (!formVisible) return;
    const timer = setTimeout(async () => {
      const watch = formValues.first_name.trim() || formValues.last_name.trim();
      if (!watch) {
        setSuggestions([]);
        return;
      }
      const matches = await searchClients(watch, 5);
      setSuggestions(matches);
    }, 300);
    return () => clearTimeout(timer);
  }, [formValues.first_name, formValues.last_name, formVisible]);

  useEffect(() => {
    if (!formVisible || !formValues.phone.trim()) {
      setDuplicate(null);
      return;
    }
    const timer = setTimeout(async () => {
      const normalized = normalizePhone(formValues.phone.trim());
      if (!normalized) {
        setDuplicate(null);
        return;
      }
      const existing = await lookupClientByPhone(normalized);
      if (existing && existing.id !== formValues.id) {
        setDuplicate(existing);
      } else {
        setDuplicate(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [formValues.phone, formValues.id, formVisible]);

  const handleCall = async (phone?: string | null) => {
    if (!phone) {
      alert.show('Numéro manquant', 'Ce client ne possède pas de téléphone.');
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir l'application Téléphone.");
    }
  };

  const openSmsPicker = (client: ClientListItem) => {
    setSmsPicker({ visible: true, client });
  };

  const sendSms = async (body: string, phone: string) => {
    try {
      await Linking.openURL(`sms:${phone}?body=${encodeURIComponent(body)}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir l'application SMS.");
    }
  };

  const sendWhatsapp = async (body: string, phone: string) => {
    try {
      const formatted = phone.replace(/^\+/, '');
      await Linking.openURL(`https://wa.me/${formatted}?text=${encodeURIComponent(body)}`);
    } catch {
      alert.show('Action impossible', "Impossible d'ouvrir WhatsApp.");
    }
  };

  const renderTemplate = (template: string, client: ClientListItem) => {
    const replacements: Record<string, string> = {
      '{client}': `${client.first_name} ${client.last_name}`.trim(),
      '{first_name}': client.first_name,
      '{last_name}': client.last_name,
    };
    return Object.entries(replacements).reduce(
      (acc, [token, value]) => acc.replace(new RegExp(token, 'gi'), value),
      template,
    );
  };

  const handleSmsTemplate = (template: SmsShortcut) => {
    if (!smsPicker.client) return;
    const message = renderTemplate(template.body, smsPicker.client);
    if (template.channel === 'whatsapp') {
      void sendWhatsapp(message, smsPicker.client.phone);
    } else {
      void sendSms(message, smsPicker.client.phone);
    }
    setSmsPicker({ visible: false, client: null });
  };

  useFocusEffect(
    useCallback(() => {
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
    }, []),
  );

  const handleReserve = (client: ClientListItem) => {
    (globalThis as any).__RESAURA_CLIENT_PREFILL = {
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
    };
    router.push('/(tabs)');
  };

  const openDetail = (clientId: string) => {
    router.push({ pathname: '/(tabs)/clients/[id]', params: { id: clientId } });
  };

  const contentPaddingBottom = useMemo(() => Math.max(120, insets.bottom + 80), [insets.bottom]);

  const renderHeader = () => (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchField}
            placeholder="Nom, téléphone, email..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FilterButton
          onPress={openFiltersPanel}
          active={filtersButtonActive}
          accessibilityLabel="Ouvrir les filtres clients"
        />
      </View>
      {filtersBadgeLabel ? <Text style={styles.filtersSummary}>{filtersBadgeLabel}</Text> : null}
      <View style={styles.maskRow}>
        <Text style={styles.maskLabel}>Masquer les numéros</Text>
        <Switch
          value={obfuscatePhones}
          onValueChange={persistMaskPref}
          thumbColor={obfuscatePhones ? COLORS.azure : COLORS.textMuted}
        />
      </View>
      <Text style={styles.sortHint}>Choisissez l'ordre d'affichage (dernière course, activité, alphabétique).</Text>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={COLORS.azure} />
        </View>
      );
    }
    if (!listCursor || loading) return <View style={{ height: 16 }} />;
    return (
      <TouchableOpacity style={styles.loadMore} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Charger plus</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator color={COLORS.azure} />
        </View>
      );
    }
    if (!portfolioReady) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Portefeuille indisponible pour le moment.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchList({ reset: true })}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun client pour le moment.</Text>
        <Text style={styles.emptySub}>Ajoutez vos premiers contacts pour démarrer votre portefeuille.</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: ClientListItem }) => (
    <ClientCard
      client={item}
      expanded={expandedId === item.id}
      onToggle={(id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId((prev) => (prev === id ? null : id));
      }}
      onCall={handleCall}
      onSms={() => openSmsPicker(item)}
      onReserve={() => handleReserve(item)}
      onOpenDetail={() => openDetail(item.id)}
      obfuscatePhones={obfuscatePhones}
    />
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ padding: 20, paddingBottom: contentPaddingBottom, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.azure} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
      />

      <FloatingActionButton
        onPress={() => openForm()}
        accessibilityLabel="Ajouter un client"
        bottomOffset={24}
      />

      <ClientFormModal
        visible={formVisible}
        title={formValues.id ? 'Modifier le client' : 'Nouveau client'}
        values={formValues}
        onChange={handleFormChange}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveForm}
        saving={formSaving}
        error={formError}
        suggestions={suggestions}
        onSuggestionPress={(suggestion) =>
          setFormValues((prev) => ({
            ...prev,
            first_name: suggestion.first_name,
            last_name: suggestion.last_name,
            phone: suggestion.phone,
          }))
        }
        duplicate={duplicate}
        onDuplicatePress={(client) => openDetail(client.id)}
      />

      <SmsPickerModal
        visible={smsPicker.visible}
        templates={smsTemplates}
        onSelect={handleSmsTemplate}
        onClose={() => setSmsPicker({ visible: false, client: null })}
      />

      <Modal
        visible={filtersPanelOpen}
        transparent
        animationType="fade"
        onRequestClose={closeFiltersPanel}
      >
        <View style={styles.filtersOverlay}>
          <View style={styles.filtersSheet}>
            <Text style={styles.filtersTitle}>Filtres clients</Text>
            <View style={styles.filtersRow}>
              {FILTERS_CONFIG.map((filter) => {
                const active = filters[filter.key];
                return (
                  <Pressable
                    key={filter.key}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => toggleFilter(filter.key)}
                  >
                    <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{filter.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.sortRow}>
              <Text style={styles.sortLabel}>Tri :</Text>
              {SORT_OPTIONS.map((option) => {
                const active = sort === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => handleSortChange(option.key)}
                    style={[styles.sortChip, active && styles.sortChipActive]}
                  >
                    <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sortHint}>Choisissez l'ordre d'affichage (dernière course, activité, alphabétique).</Text>
            <View style={styles.filtersActions}>
              <Pressable style={styles.filtersCloseBtn} onPress={closeFiltersPanel}>
                <Text style={styles.filtersCloseBtnText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type CardProps = {
  client: ClientListItem;
  expanded: boolean;
  onToggle: (id: string) => void;
  onCall: (phone: string) => void;
  onSms: () => void;
  onReserve: () => void;
  onOpenDetail: () => void;
  obfuscatePhones: boolean;
};

function ClientCard({
  client,
  expanded,
  onToggle,
  onCall,
  onSms,
  onReserve,
  onOpenDetail,
  obfuscatePhones,
}: CardProps) {
  const displayPhone = obfuscatePhones ? maskPhone(client.phone) : client.phone;
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHeader} onPress={() => onToggle(client.id)}>
        <View>
          <Text style={styles.clientName}>
            {client.last_name} {client.first_name}
          </Text>
          <View style={styles.clientMetaRow}>
            <Text style={styles.clientMetaText}>
              {client.total_courses} courses · {formatCurrency(client.lifetime_value)}
            </Text>
            {client.loyalty_status && (
              <View style={styles.loyaltyPill}>
                <Sparkles size={12} color={COLORS.darkText} />
                <Text style={styles.loyaltyText}>{formatLoyalty(client.loyalty_status)}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardIcons}>
          {client.is_vip && <Star size={16} color={COLORS.azure} style={{ marginRight: 6 }} />}
          {client.is_blacklisted && <ShieldAlert size={16} color={COLORS.danger} />}
          {expanded ? <ChevronUp color={COLORS.azure} /> : <ChevronDown color={COLORS.azure} />}
        </View>
      </Pressable>
      <View style={styles.cardSubRow}>
        <Text style={styles.cardSubLabel}>Dernière course</Text>
        <Text style={styles.cardSubValue}>
          {client.last_reservation_at ? formatDate(client.last_reservation_at) : 'Jamais'}
        </Text>
      </View>
      {expanded && (
        <View style={styles.accordion}>
          <View style={styles.accordionRow}>
            <Text style={styles.accordionLabel}>Téléphone</Text>
            <Text style={styles.accordionValue}>{displayPhone}</Text>
          </View>
          {client.email ? (
            <View style={styles.accordionRow}>
              <Text style={styles.accordionLabel}>Email</Text>
              <Text style={styles.accordionValue}>{client.email}</Text>
            </View>
          ) : null}
          <View style={styles.accordionRow}>
            <Text style={styles.accordionLabel}>Actions</Text>
            <View style={styles.actionsRow}>
              <MiniAction icon={Phone} label="Appeler" onPress={() => onCall(client.phone)} />
              <MiniAction icon={MessageSquare} label="SMS" onPress={onSms} />
              <MiniAction icon={Send} label="Réserver" onPress={onReserve} />
            </View>
          </View>
          <View style={styles.accordionFooter}>
            <TouchableOpacity onPress={onOpenDetail}>
              <Text style={styles.link}>Voir la fiche</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MiniAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Phone;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.miniAction} onPress={onPress}>
      <Icon size={14} color={COLORS.darkText} />
      <Text style={styles.miniActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const formatDate = (value: string) => {
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

const formatLoyalty = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'gold' || normalized === 'or') return 'Or';
  if (normalized === 'silver' || normalized === 'argent') return 'Argent';
  return 'Bronze';
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADII.input,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.azure,
  },
  searchField: { flex: 1, color: COLORS.text, marginLeft: 8 },
  filtersSummary: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8 },
  maskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maskLabel: { color: COLORS.text, fontWeight: '600' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  filtersOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  filtersSheet: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.azure,
    padding: 20,
    gap: 16,
  },
  filtersTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  filtersActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  filtersCloseBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.azure,
  },
  filtersCloseBtnText: { color: COLORS.text, fontWeight: '700' },
  filterChip: {
    borderRadius: RADII.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.azure,
  },
  filterChipActive: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  filterLabel: { color: COLORS.azure },
  filterLabelActive: { color: COLORS.darkText, fontWeight: '700' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 16, flexWrap: 'wrap' },
  sortLabel: { color: COLORS.textMuted, fontWeight: '600' },
  sortChip: {
    borderRadius: RADII.button,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.azure,
  },
  sortChipActive: { backgroundColor: COLORS.inputBg, borderColor: COLORS.azure },
  sortChipText: { color: COLORS.textMuted, fontWeight: '600' },
  sortChipTextActive: { color: COLORS.text, fontWeight: '700' },
  sortHint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.azure,
    ...SHADOW.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  clientMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  clientMetaText: { color: COLORS.textMuted },
  loyaltyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  loyaltyText: { color: COLORS.darkText, fontWeight: '700', marginLeft: 4 },
  cardIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cardSubLabel: { color: COLORS.textMuted, fontWeight: '600' },
  cardSubValue: { color: COLORS.text, fontWeight: '600' },
  accordion: { marginTop: 12, gap: 12 },
  accordionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accordionLabel: { color: COLORS.textMuted, fontWeight: '600' },
  accordionValue: { color: COLORS.text, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  accordionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: COLORS.azure, fontWeight: '600' },
  miniAction: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  miniActionText: { color: COLORS.darkText, fontWeight: '700' },
  footer: { paddingVertical: 16 },
  loadMore: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.azure,
    marginTop: 12,
  },
  loadMoreText: { color: COLORS.text, fontWeight: '600' },
  empty: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.text, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: COLORS.textMuted },
  retryButton: {
    marginTop: 12,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.azure,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { color: COLORS.azure, fontWeight: '700' },
});





