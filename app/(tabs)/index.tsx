// app/(tabs)/bookings.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, Platform, Share, LayoutAnimation, UIManager, KeyboardAvoidingView, ScrollView, Linking, ActivityIndicator, PermissionsAndroid } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Phone, Share2, Edit3, MapPin, Filter, RotateCcw, Star, LocateFixed, Clock3, Plane, TrainFront, Baby, Users, Luggage, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { listReservations, createReservation, updateReservation, removeReservation, transitionReservation, type Reservation, type ReservationCreate, type ReservationUpdate, ListParams } from '@/lib/reservations.service';
import { quickCreateClient } from '@/lib/clients.service';
import { searchClients, type ClientSummary } from '@/lib/clients.search';
import { getGoogleReviewMessage } from '@/lib/preferences';
import { useAppAlert } from '@/contexts/AlertContext';
import CalendarSingle from '@/lib/ui/CalendarSingle';
import TimePicker from '@/lib/ui/TimePicker';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Statuts normalisés */
const STATUSES = [
  { key: 'a_venir', label: 'à venir' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'terminee', label: 'Terminée' },
  { key: 'annulee', label: 'Annulée' },
  { key: 'no_show', label: 'No-show' },
] as const;
type StatusKey = typeof STATUSES[number]['key'];

const STOP_SEPARATOR = ' \u2192 ';
const STOP_SPLIT_REGEX = /\u2192|->/g;
const RETURN_WINDOW_MS = 30000;

const STATUS_FILTER_COLORS: Partial<Record<StatusKey, string>> = {
  a_venir: COLORS.azure,
  en_cours: COLORS.success,
  terminee: COLORS.danger,
};

function parseDropoffSegments(raw?: string | null) {
  if (!raw) return [];
  const sanitized = raw.replace(/\n/g, STOP_SEPARATOR);
  return sanitized.split(STOP_SPLIT_REGEX).map(s => s.trim()).filter(Boolean);
}

function minutesToHHMM(minutes?: number | null) {
  const value = typeof minutes === 'number' && !Number.isNaN(minutes) ? Math.max(0, minutes) : 0;
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hhmmToMinutes(value: string) {
  const [hRaw, mRaw] = value.split(':');
  const hours = Number.parseInt(hRaw, 10) || 0;
  const mins = Number.parseInt(mRaw, 10) || 0;
  return Math.max(0, hours * 60 + mins);
}

function formatDurationDisplay(minutes?: number | null) {
  if (typeof minutes !== 'number' || Number.isNaN(minutes)) return '--';
  const value = Math.max(0, Math.round(minutes));
  if (value >= 60) {
    const hours = Math.floor(value / 60);
    const mins = value % 60;
    return `${hours}h${String(mins).padStart(2, '0')} minutes`;
  }
  const unit = value === 1 ? 'minute' : 'minutes';
  return `${value} ${unit}`;
}

type DateFilter = 'all' | 'today' | 'week' | 'custom';
type DurationTarget = 'approach' | 'ride' | 'return';

type QuickActionProps = {
  label: string;
  onPress: () => void;
  variant?: 'info' | 'success' | 'danger' | 'ghost';
};

type IconType = React.ComponentType<{ size?: number; color?: string }>;

type AddressRowProps = {
  label: string;
  value?: string | null;
  color: string;
  onPress: () => void;
  textColor?: string;
  dividerColor?: string;
  force?: boolean;
  placeholder?: string;
  showLabel?: boolean;
};

const FILTER_OPTIONS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'today', label: 'Aujourd\'hui' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'custom', label: 'Date' },
];

function toISODateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingsScreen() {
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const safeTop = Math.max(24, insets.top + 12);
  const safeBottom = (insets.bottom || 0) + 8;
  const listPaddingBottom = safeBottom + 72;
  const modalCardPadding = safeBottom + 16;
  const modalScrollPadding = safeBottom + 40;
  const statusFilters = useMemo(() => {
    const order: StatusKey[] = ['a_venir', 'en_cours', 'terminee'];
    return order
      .map((key) => STATUSES.find((s) => s.key === key))
      .filter((item): item is typeof STATUSES[number] => Boolean(item));
  }, []);
  const swipeHandlers = useSwipeTabsNavigation('index');

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusKey | undefined>('a_venir');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pendingDateFilter, setPendingDateFilter] = useState<DateFilter>('all');
  const [pendingRangeStart, setPendingRangeStart] = useState<Date | null>(null);
  const [pendingRangeEnd, setPendingRangeEnd] = useState<Date | null>(null);
  const [filterCalendarTarget, setFilterCalendarTarget] = useState<'from'|'to'>('from');
  const [filterCalendarOpen, setFilterCalendarOpen] = useState(false);
  const [filterCalendarValue, setFilterCalendarValue] = useState(new Date());
  const [customFrom, setCustomFrom] = useState<string>(''); // ISO yyyy-mm-dd
  const [customTo, setCustomTo] = useState<string>('');

  const [data, setData] = useState<Reservation[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 25;

  // Modale création/édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  // Formulaire (création/édition)
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTimeHHMM, setFormTimeHHMM] = useState<string>(new Date().toTimeString().slice(0,5));
  const [form, setForm] = useState({
    client_first: '',
    client_last: '',
    phone: '',
    pickup: '',
    dropoff: '',
    dropoffStops: [] as string[],
    passengers: 1,
    luggage: 0,
    child_seat: false,
    flight_no: null as string | null,
    train_no: null as string | null,
    transport_kind: 'none' as 'none'|'flight'|'train',
    note_client: '',
    price_est: null as number|null,
    distance_km: null as number|null,
    duration_min: null as number|null,
    approach_duration_min: null as number|null,
    ride_duration_min: null as number|null,
    return_duration_min: null as number|null,
    payment_mode: null as string|null,
  });

  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [clientCreationLoading, setClientCreationLoading] = useState(false);
  const [passengersInput, setPassengersInput] = useState('1');
  const [luggageInput, setLuggageInput] = useState('0');
  const [durationPickerTarget, setDurationPickerTarget] = useState<DurationTarget | null>(null);
  const [durationPickerValue, setDurationPickerValue] = useState('00:00');
  const [isSaving, setIsSaving] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnCountdowns, setReturnCountdowns] = useState<Record<string, number>>({});
  const [countdownTick, setCountdownTick] = useState(Date.now());
  const [clientLookup, setClientLookup] = useState<ClientSummary[]>([]);
  const [clientLookupLoading, setClientLookupLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const clientSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (clientSearchTimeout.current) {
      clearTimeout(clientSearchTimeout.current);
      clientSearchTimeout.current = null;
    }
    if (selectedClientId) {
      setClientLookup([]);
      setClientLookupLoading(false);
      return;
    }
    const last = form.client_last.trim();
    const first = form.client_first.trim();
    const phone = form.phone.trim();
    const querySource = last || first || phone;
    if (!querySource || querySource.length < 2) {
      setClientLookup([]);
      setClientLookupLoading(false);
      return;
    }
    clientSearchTimeout.current = setTimeout(async () => {
      setClientLookupLoading(true);
      try {
        const results = await searchClients(querySource);
        setClientLookup(results);
      } catch (error) {
        console.warn('[Bookings] searchClients error', error);
        setClientLookup([]);
      } finally {
        setClientLookupLoading(false);
        clientSearchTimeout.current = null;
      }
    }, 350);
    return () => {
      if (clientSearchTimeout.current) {
        clearTimeout(clientSearchTimeout.current);
        clientSearchTimeout.current = null;
      }
    };
  }, [form.client_last, form.client_first, form.phone, selectedClientId]);

  const computedDateRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      const from = new Date(now); from.setHours(0,0,0,0);
      const to = new Date(now);   to.setHours(23,59,59,999);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    if (dateFilter === 'week') {
      const day = now.getDay(); // 0 = dimanche
      const mondayOffset = (day + 6) % 7;
      const from = new Date(now);
      from.setDate(now.getDate() - mondayOffset);
      from.setHours(0,0,0,0);
      const to = new Date(from);
      to.setDate(from.getDate() + 7);
      to.setMilliseconds(-1);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    if (dateFilter === 'custom' && customFrom && customTo) {
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59`);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    return { from: undefined, to: undefined };
  }, [dateFilter, customFrom, customTo]);

  const load = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const params: ListParams = {
        q: query.trim() || undefined,
        status,
        from: computedDateRange.from,
        to: computedDateRange.to,
        page: reset ? 0 : page,
        pageSize,
      };
      const { items, total } = await listReservations(params);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTotal(total);
      if (reset) setData(items);
      else setData(prev => [...prev, ...items]);
    } catch {
      alert.show('Erreur', 'Impossible de charger les réservations.');
    } finally {
      setIsLoading(false);
    }
  }, [alert, computedDateRange, page, pageSize, query, status]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(0);
    try {
      await load(true);
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      client_first: '',
      client_last: '',
      phone: '',
      pickup: '',
      dropoff: '',
      dropoffStops: [],
      passengers: 1,
      luggage: 0,
      child_seat: false,
      flight_no: null,
      train_no: null,
      transport_kind: 'none',
      note_client: '',
      price_est: null,
      distance_km: null,
      duration_min: null,
      approach_duration_min: null,
      ride_duration_min: null,
      return_duration_min: null,
      payment_mode: null,
    });
    setFormDate(new Date());
    setFormTimeHHMM(new Date().toTimeString().slice(0,5));
    setModalOpen(true);
    setSelectedClientId(null);
    setClientLookup([]);
    setPassengersInput('1');
    setLuggageInput('0');
  };

  const closeModal = () => setModalOpen(false);

  const openFiltersPanel = () => {
    setPendingDateFilter(dateFilter);
    setPendingRangeStart(customFrom ? new Date(`${customFrom}T00:00:00`) : null);
    setPendingRangeEnd(customTo ? new Date(`${customTo}T00:00:00`) : null);
    setFiltersOpen(true);
  };

  const closeFiltersPanel = () => setFiltersOpen(false);

  const applyFiltersPanel = () => {
    if (pendingDateFilter === 'custom') {
      if (!pendingRangeStart || !pendingRangeEnd) {
        alert.show('Dates manquantes', 'Sélectionnez un début et une fin.');
        return;
      }
      const fromIso = toISODateString(pendingRangeStart);
      const toIso = toISODateString(pendingRangeEnd);
      setCustomFrom(fromIso);
      setCustomTo(toIso);
    } else {
      setCustomFrom('');
      setCustomTo('');
    }
    setDateFilter(pendingDateFilter);
    setFiltersOpen(false);
    setPage(0);
    void load(true);
  };

  const openFilterCalendarPicker = (target: 'from'|'to') => {
    setFilterCalendarTarget(target);
    const fallback = target === 'from' ? (pendingRangeStart ?? pendingRangeEnd ?? new Date()) : (pendingRangeEnd ?? pendingRangeStart ?? new Date());
    setFilterCalendarValue(fallback);
    setFilterCalendarOpen(true);
  };

  const closeFilterCalendarPicker = () => setFilterCalendarOpen(false);

  const confirmFilterCalendarPicker = (value: Date) => {
    const nextDate = new Date(value);
    if (filterCalendarTarget === 'from') {
      setPendingRangeStart(nextDate);
      if (pendingRangeEnd && nextDate > pendingRangeEnd) {
        setPendingRangeEnd(nextDate);
      }
    } else {
      setPendingRangeEnd(nextDate);
      if (pendingRangeStart && nextDate < pendingRangeStart) {
        setPendingRangeStart(nextDate);
      }
    }
    setFilterCalendarOpen(false);
  };

  const handleClientNameChange = (value: string, field: 'first' | 'last') => {
    const formatted = value.replace(/\s+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    setSelectedClientId(null);
    setForm((prev) => ({
      ...prev,
      [field === 'first' ? 'client_first' : 'client_last']: formatted,
    }));
  };

  const handlePassengersChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setPassengersInput(sanitized);
    setForm((prev) => ({
      ...prev,
      passengers: sanitized === '' ? 0 : Number(sanitized),
    }));
  };

  const handleLuggageChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setLuggageInput(sanitized);
    setForm((prev) => ({
      ...prev,
      luggage: sanitized === '' ? 0 : Number(sanitized),
    }));
  };

  const handlePhoneChange = (text: string) => {
    setSelectedClientId(null);
    setForm((prev) => ({
      ...prev,
      phone: text,
    }));
  };

  const addDropoffStep = () => {
    setForm((prev) => ({
      ...prev,
      dropoffStops: [...(prev.dropoffStops ?? []), ''],
    }));
  };

  const updateDropoffStep = (index: number, value: string) => {
    setForm((prev) => {
      const steps = [...(prev.dropoffStops ?? [])];
      steps[index] = value;
      return { ...prev, dropoffStops: steps };
    });
  };

  const removeDropoffStep = (index: number) => {
    setForm((prev) => {
      const steps = [...(prev.dropoffStops ?? [])];
      steps.splice(index, 1);
      return { ...prev, dropoffStops: steps };
    });
  };

  const selectClientSuggestion = (client: ClientSummary) => {
    setSelectedClientId(client.id);
    setClientLookup([]);
    setClientLookupLoading(false);
    setForm((prev) => ({
      ...prev,
      client_first: client.first_name ?? '',
      client_last: client.last_name ?? '',
      phone: client.phone ?? '',
    }));
  };

  const openEdit = (item: Reservation) => {
    const datetime = new Date(item.datetime);
    setFormDate(datetime);
    setFormTimeHHMM(datetime.toTimeString().slice(0, 5));
    const dropSegments = parseDropoffSegments(item.dropoff);
    const [primary, ...stops] = dropSegments.length ? dropSegments : [item.dropoff ?? ''];
    setForm({
      client_first: item.client_first ?? '',
      client_last: item.client_last ?? '',
      phone: item.phone ?? '',
      pickup: item.pickup ?? '',
      dropoff: primary ?? '',
      dropoffStops: stops,
      passengers: item.passengers ?? 1,
      luggage: item.luggage ?? 0,
      child_seat: !!item.child_seat,
      flight_no: item.flight_no ?? null,
      train_no: item.train_no ?? null,
      transport_kind: item.transport_kind ?? 'none',
      note_client: item.note_client ?? '',
      price_est: item.price_est ?? null,
      distance_km: item.distance_km ?? null,
      duration_min: item.duration_min ?? null,
      approach_duration_min: item.approach_duration_min ?? null,
      ride_duration_min: item.ride_duration_min ?? null,
      return_duration_min: item.return_duration_min ?? null,
      payment_mode: item.payment_mode ?? null,
    });
    setPassengersInput(String(item.passengers ?? 1));
    setLuggageInput(String(item.luggage ?? 0));
    setEditing(item);
    setClientLookup([]);
    setSelectedClientId(null);
    setModalOpen(true);
  };

  const openDurationPicker = (target: DurationTarget) => {
    setDurationPickerTarget(target);
    const currentValue =
      target === 'approach'
        ? form.approach_duration_min
        : target === 'ride'
          ? form.ride_duration_min
          : form.return_duration_min;
    setDurationPickerValue(minutesToHHMM(currentValue ?? 0));
  };

  const applyDurationValue = (target: DurationTarget, minutes: number) => {
    setForm((prev) => {
      if (target === 'approach') {
        return { ...prev, approach_duration_min: minutes };
      }
      if (target === 'ride') {
        return { ...prev, ride_duration_min: minutes };
      }
      return { ...prev, return_duration_min: minutes };
    });
    setDurationPickerTarget(null);
    setDurationPickerValue(minutesToHHMM(minutes));
  };

  const handleAddressPress = (label: string, value?: string | null, navTarget?: string | null) => {
    const target = (navTarget || value || '').trim();
    if (!target) {
      alert.show('Adresse indisponible', `Impossible d'afficher ${label}.`);
      return;
    }
    const encoded = encodeURIComponent(target);
    const fallback = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    const nativeUrl = Platform.select({
      ios: `http://maps.apple.com/?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: fallback,
    }) ?? fallback;
    Linking.openURL(nativeUrl).catch(() => {
      Linking.openURL(fallback).catch(() => {
        alert.show('Navigation impossible', `Impossible d'ouvrir ${label}.`);
      });
    });
  };

  const dialClient = (phone?: string | null) => {
    const sanitized = phone?.replace(/[^\d+]/g, '');
    if (!sanitized) {
      alert.show('Numéro indisponible', 'Aucun numéro valide pour ce client.');
      return;
    }
    Linking.openURL(`tel:${sanitized}`).catch(() => {
      alert.show('Appel impossible', 'Impossible de lancer l’appel.');
    });
  };

  const shareReservationDetails = async (item: Reservation) => {
    try {
      const dt = new Date(item.datetime);
      const dropSegments = parseDropoffSegments(item.dropoff);
      const [arrival, ...stops] = dropSegments.length ? dropSegments : [item.dropoff ?? ''];
      const lines = [
        `Course du ${dt.toLocaleDateString()} à ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        `${item.client_last} ${item.client_first}`.trim(),
        item.pickup ? `Départ : ${item.pickup}` : null,
        ...stops.map((stop, index) => `Étape ${index + 1} : ${stop}`),
        arrival ? `Arrivée : ${arrival}` : null,
        item.note_client?.trim() ? `Commentaire : ${item.note_client.trim()}` : null,
      ].filter(Boolean) as string[];
      await Share.share({ message: lines.join('\n') });
    } catch (error) {
      console.warn('[Bookings] shareReservationDetails error', error);
      alert.show('Partage impossible', 'Impossible de partager cette réservation.');
    }
  };

  const sendGoogleReview = async (item: Reservation) => {
    try {
      const template = await getGoogleReviewMessage();
      const clientName = `${item.client_first} ${item.client_last}`.trim();
      const personalized = template
        .replace(/\{\{\s*client\s*\}\}/gi, clientName || 'client')
        .replace(/\{client\}/gi, clientName || 'client');
      await Share.share({ message: personalized });
    } catch (error) {
      console.warn('[Bookings] sendGoogleReview error', error);
      alert.show('Partage impossible', 'Impossible d\'ouvrir le partage.');
    }
  };

  const navigateToTransaction = (item: Reservation) => {
    try {
      const dropSegments = parseDropoffSegments(item.dropoff);
      const dropoffPrimary = dropSegments.length ? dropSegments[0] : (item.dropoff ?? '');
      const payload = {
        reservationId: item.id,
        amount: item.price_est ?? null,
        clientName: `${item.client_first} ${item.client_last}`.trim() || undefined,
        pickup: item.pickup,
        dropoff: dropoffPrimary,
        datetime: item.datetime,
      };
      const encoded = encodeURIComponent(JSON.stringify(payload));
      router.push({ pathname: '/(tabs)/finance', params: { txPrefill: encoded } });
    } catch (error) {
      console.warn('[Bookings] navigateToTransaction error', error);
      alert.show('Navigation impossible', 'Redirection vers Finance impossible.');
    }
  };

  const saveForm = async () => {
    if (isSaving) return;
    const clientFirst = form.client_first.trim();
    const clientLast = form.client_last.trim();
    const phone = form.phone.trim();
    const pickup = form.pickup.trim();
    const dropSegments = [form.dropoff, ...(form.dropoffStops ?? [])]
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (!clientLast || !clientFirst || !phone || !pickup || dropSegments.length === 0) {
      alert.show('Champs manquants', 'Complétez les informations obligatoires.');
      return;
    }
    const [hoursRaw, minsRaw] = formTimeHHMM.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minsRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      alert.show('Horaire invalide', 'Sélectionnez une heure valide.');
      return;
    }
    const datetime = new Date(formDate);
    datetime.setHours(hours, minutes, 0, 0);
    const payload: ReservationCreate = {
      client_first: clientFirst,
      client_last: clientLast,
      phone,
      pickup,
      dropoff: dropSegments.join(STOP_SEPARATOR),
      datetime: datetime.toISOString(),
      passengers: form.passengers,
      luggage: form.luggage,
      child_seat: form.child_seat,
      flight_no: form.transport_kind === 'flight' ? (form.flight_no?.trim() || null) : null,
      train_no: form.transport_kind === 'train' ? (form.train_no?.trim() || null) : null,
      transport_kind: form.transport_kind,
      note_client: form.note_client?.trim() || null,
      price_est: form.price_est,
      distance_km: form.distance_km,
      duration_min: form.duration_min,
      approach_duration_min: form.approach_duration_min,
      ride_duration_min: form.ride_duration_min,
      return_duration_min: form.return_duration_min,
      payment_mode: form.payment_mode,
    };
    setIsSaving(true);
    try {
      if (!editing && !selectedClientId) {
        try {
          setClientCreationLoading(true);
          await quickCreateClient({
            first_name: clientFirst,
            last_name: clientLast,
            phone,
          });
        } catch (error) {
          console.warn('[Bookings] quickCreateClient error', error);
        } finally {
          setClientCreationLoading(false);
        }
      }
      const ok = editing
        ? await updateReservation(editing.id, payload as ReservationUpdate)
        : await createReservation(payload);
      if (!ok) {
        alert.show('Erreur', editing ? 'Mise à jour impossible.' : 'Création impossible.');
        return;
      }
      closeModal();
      setEditing(null);
      setClientLookup([]);
      setSelectedClientId(null);
      await refresh();
      alert.show(
        editing ? 'Réservation mise à jour' : 'Réservation créée',
        editing ? 'Les modifications ont été enregistrées.' : 'La réservation a été ajoutée à la liste.',
      );
      alert.show(
        editing ? 'Reservation mise à jour' : 'Reservation créée',
        editing ? 'Les modifications ont été enregistrées.' : 'La réservation a été ajoutée à votre planning.',
      );
    } catch (error) {
      console.warn('[Bookings] saveForm error', error);
      alert.show('Erreur', 'Impossible d\'enregistrer la réservation.');
    } finally {
      setIsSaving(false);
    }
  };

  const onTransition = (item: Reservation, next: StatusKey) => {
    const title =
      next === 'en_cours' ? 'Démarrer cette course ?' :
      next === 'terminee' ? 'Terminer cette course ?' :
      next === 'annulee' ? 'Annuler cette course ?' :
      'Marquer en no-show ?';
    alert.show(title, '', {
      actions: [
        { text: 'Annuler', variant: 'ghost' },
        {
          text: 'Oui',
          onPress: async () => {
            const ok = await transitionReservation(item.id, next);
            if (!ok) { alert.show('Erreur', 'Transition échouée'); return; }
            if (next === 'en_cours') {
              setReturnCountdowns((prev) => ({ ...prev, [item.id]: Date.now() }));
            } else {
              setReturnCountdowns((prev) => {
                if (!prev[item.id]) return prev;
                const nextMap = { ...prev };
                delete nextMap[item.id];
                return nextMap;
              });
            }
            refresh();
            if (next === 'terminee') {
              navigateToTransaction(item);
            }
          },
        },
      ],
    });
  };

  const requestDeleteEditing = () => {
    if (!editing) return;
    alert.show('Supprimer ?', 'Cette action est définitive.', {
      actions: [
        { text: 'Annuler', variant: 'ghost' },
        {
          text: 'Supprimer',
          onPress: async () => {
            const ok = await removeReservation(editing.id);
            if (!ok) { alert.show('Erreur', 'Suppression échouée'); return; }
            closeModal();
            refresh();
          },
        },
      ],
    });
  };

  const handleReturnAction = async (item: Reservation) => {
    const target = item.status === 'terminee' ? 'en_cours' : item.status === 'en_cours' ? 'a_venir' : null;
    if (!target || returningId) return;
    if (item.status === 'en_cours') {
      const startedAt = returnCountdowns[item.id];
      if (startedAt && Date.now() - startedAt > RETURN_WINDOW_MS) {
        alert.show('Retour expiré', 'Vous disposez de 30s après le démarrage pour annuler.');
        return;
      }
    }
    setReturningId(item.id);
    try {
      const ok = await transitionReservation(item.id, target);
      if (!ok) {
        alert.show('Action impossible', 'Impossible de revenir à l"état précédent.');
        return;
      }
      setReturnCountdowns((prev) => {
        if (!prev[item.id]) return prev;
        const nextMap = { ...prev };
        delete nextMap[item.id];
        return nextMap;
      });
      refresh();
    } catch {
      alert.show('Action impossible', 'Impossible de revenir à l"état précédent.');
    } finally {
      setReturningId(null);
    }
  };

  const renderItem = ({ item }: { item: Reservation }) => {
    const status = (item.status as StatusKey) || 'a_venir';
    const tone = getCardTone(status);
    const dropSegments = parseDropoffSegments(item.dropoff);
    const dropoffPrimary = dropSegments.length ? dropSegments[0] : (item.dropoff ?? '');
    const dropoffStops = dropSegments.slice(1);
    const dropoffNavTarget = dropoffPrimary;
    const dt = new Date(item.datetime);
    const dateText = dt.toLocaleDateString();
    const timeText = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const comment = (item.note_client || '').trim();
    const showStart = status === 'a_venir';
    const showFinish = status === 'en_cours';
    const returning = returningId === item.id;
    const canReturn = status === 'en_cours' || status === 'terminee';
    const statusLabel = STATUSES.find((s) => s.key === status)?.label ?? status;
    const cardStyle = [styles.card];
    if (tone.containerStyle) cardStyle.push(tone.containerStyle);
    const countdownStart = returnCountdowns[item.id];
    const elapsedSinceStart = countdownStart ? countdownTick - countdownStart : 0;
    const returnCountdownRemaining = countdownStart ? Math.max(0, RETURN_WINDOW_MS - elapsedSinceStart) : 0;
    const showReturnCountdown = status === 'en_cours' && returnCountdownRemaining > 0;
    const countdownRatio = showReturnCountdown ? returnCountdownRemaining / RETURN_WINDOW_MS : 0;
    const returnDisabled = returning || (status === 'en_cours' && countdownStart && returnCountdownRemaining <= 0);
    const metaBadges: Array<{ key: string; icon: typeof Phone; label: string }> = [];
    if (item.transport_kind === 'flight' || (item.flight_no ?? '').trim()) {
      metaBadges.push({
        key: 'flight',
        icon: Plane,
        label: item.flight_no?.trim() ? `Vol ${item.flight_no.trim()}` : 'Trajet avion',
      });
    }
    if (item.transport_kind === 'train' || (item.train_no ?? '').trim()) {
      metaBadges.push({
        key: 'train',
        icon: TrainFront,
        label: item.train_no?.trim() ? `Train ${item.train_no.trim()}` : 'Trajet train',
      });
    }
    if (item.child_seat) {
      metaBadges.push({
        key: 'child-seat',
        icon: Baby,
        label: 'Siège enfant',
      });
    }
    const passengerCount = Number.isFinite(item.passengers) ? Number(item.passengers) : 0;
    if (passengerCount > 0) {
      metaBadges.push({
        key: 'passengers',
        icon: Users,
        label: passengerCount > 1 ? `${passengerCount} passagers` : '1 passager',
      });
    }
    const luggageCount = Number.isFinite(item.luggage) ? Number(item.luggage) : 0;
    if (luggageCount > 0) {
      metaBadges.push({
        key: 'luggage',
        icon: Luggage,
        label: luggageCount > 1 ? `${luggageCount} bagages` : '1 bagage',
      });
    }
    const durationSegments = [
      item.approach_duration_min,
      item.ride_duration_min,
      item.return_duration_min,
    ];
    const hasDurations = durationSegments.some(
      (value) => typeof value === 'number' && value > 0,
    );

    return (
      <View style={cardStyle}>
        {tone.bannerColor && (
          <View style={[styles.statusBanner, { backgroundColor: tone.bannerColor }]}>
            <Text style={[styles.statusBannerText, { color: tone.bannerTextColor ?? COLORS.text }]}>{statusLabel}</Text>
          </View>
        )}
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardTitle, { color: tone.textColor }]}>{item.client_last} {item.client_first}</Text>
            <Text style={[styles.cardSubtitle, { color: tone.mutedColor }]}>{dateText} · {timeText}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {canReturn && (
              <View style={styles.returnWrapper}>
                <Pressable
                  onPress={() => handleReturnAction(item)}
                  disabled={returnDisabled}
                  style={[
                    styles.returnPill,
                    (returnDisabled || returning) && styles.returnPillDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Revenir ?? l'état précédent"
                >
                  {returning ? (
                    <ActivityIndicator size="small" color={COLORS.azure} />
                  ) : (
                    <>
                      <RotateCcw size={14} color={COLORS.azure} />
                      <Text style={styles.returnPillText}>Retour</Text>
                    </>
                  )}
                </Pressable>
                {showReturnCountdown && (
                  <View style={styles.returnCountdownTrack}>
                    <View style={[styles.returnCountdownFill, { width: `${Math.max(0, Math.min(1, countdownRatio)) * 100}%` }]} />
                  </View>
                )}
              </View>
            )}
            <Pressable style={styles.editPill} onPress={() => openEdit(item)} accessibilityRole="button" accessibilityLabel="Modifier la réservation">
              <Edit3 size={14} color={COLORS.darkText} />
              <Text style={styles.editPillText}>Modifier</Text>
            </Pressable>
          </View>
        </View>
        <AddressRow
          label="Départ"
          value={item.pickup}
          color={COLORS.pickupAccent}
          onPress={() => handleAddressPress('Départ', item.pickup, item.pickup)}
          textColor={tone.textColor}
          dividerColor={tone.dividerColor}
          showLabel={false}
        />
        {dropoffStops.map((stop, idx) => (
          <AddressRow
            key={`${item.id}-stop-${idx}`}
            label={`Étape ${idx + 1}`}
            value={stop}
            color={COLORS.azure}
            onPress={() => handleAddressPress(`Étape ${idx + 1}`, stop, stop)}
            textColor={tone.textColor}
            dividerColor={tone.dividerColor}
            showLabel={false}
          />
        ))}
        <AddressRow
          label="Arrivée"
          value={dropoffPrimary}
          color={COLORS.dropoffAccent}
          onPress={() => handleAddressPress('Arrivée', dropoffPrimary, dropoffNavTarget)}
          textColor={tone.textColor}
          dividerColor={tone.dividerColor}
          showLabel={false}
        />
        {hasDurations && (
          <View style={[styles.durationChain, tone.dividerColor && { borderTopColor: tone.dividerColor }]}>
            {durationSegments.map((value, idx) => (
              <React.Fragment key={`${item.id}-duration-${idx}`}>
                <View style={styles.durationChipCard}>
                  <Text style={[styles.durationChipText, { color: tone.textColor }]}>{formatDurationDisplay(value)}</Text>
                </View>
                {idx < durationSegments.length - 1 && (
                  <ChevronRight size={14} color={tone.textColor} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}
        {metaBadges.length > 0 && (
          <View style={[styles.tripMetaRow, tone.dividerColor && { borderTopColor: tone.dividerColor }]}>
            {metaBadges.map((badge) => (
              <View
                key={`${item.id}-${badge.key}`}
                style={[styles.tripMetaChip, { borderColor: tone.dividerColor, backgroundColor: tone.commentBg }]}
              >
                <badge.icon size={14} color={tone.textColor} />
                <Text style={[styles.tripMetaText, { color: tone.textColor }]}>{badge.label}</Text>
              </View>
            ))}
          </View>
        )}

        {comment && (
          <View style={[styles.commentBox, { backgroundColor: tone.commentBg, borderColor: tone.commentBorder }]}>
            <Text style={[styles.commentLabel, { color: tone.mutedColor }]}>Commentaire</Text>
            <Text style={[styles.commentText, { color: tone.textColor }]}>{comment}</Text>
          </View>
        )}

        {status === 'terminee' ? (
          <View style={[styles.utilityRow, styles.utilityRowCentered]}>
            <UtilityIconButton label="Appeler" icon={Phone} onPress={() => dialClient(item.phone)} />
            <UtilityIconButton label="Avis Google" icon={Star} onPress={() => sendGoogleReview(item)} />
            <UtilityIconButton label="Partager" icon={Share2} onPress={() => shareReservationDetails(item)} />
          </View>
        ) : (
          <View style={styles.utilityRow}>
            <View style={styles.utilityLeft}>
              <UtilityIconButton label="Appeler" icon={Phone} onPress={() => dialClient(item.phone)} />
            </View>
            <View style={styles.utilityRight}>
              <UtilityIconButton label="Partager" icon={Share2} onPress={() => shareReservationDetails(item)} />
              {showStart && (
                <QuickActionButton label="Démarrer" variant="info" onPress={() => onTransition(item, 'en_cours')} />
              )}
              {showFinish && (
                <QuickActionButton label="Terminer" variant="danger" onPress={() => onTransition(item, 'terminee')} />
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

return (
    <View {...swipeHandlers} style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}>
      <View style={styles.statusFilterRow}>
        <View style={styles.statusChipsWrap}>
          {statusFilters.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              selected={status === s.key}
              color={STATUS_FILTER_COLORS[s.key]}
              onPress={() => { setStatus(prev => prev === s.key ? undefined : s.key); setPage(0); }}
            />
          ))}
        </View>
        <Pressable
          onPress={openFiltersPanel}
          style={styles.filterButton}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les filtres"
        >
          <Filter size={20} color={COLORS.background} />
        </Pressable>
      </View>

      <Modal visible={filtersOpen} transparent animationType="fade" onRequestClose={closeFiltersPanel}>
        <View style={styles.modalOverlay}>
          <View style={styles.filtersBox}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <View style={styles.filterOptions}>
              {FILTER_OPTIONS.map((option) => {
                const selected = pendingDateFilter === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setPendingDateFilter(option.key)}
                    style={[styles.filterOption, selected && styles.filterOptionActive]}
                  >
                    <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {pendingDateFilter === 'custom' && (
              <View style={{ gap: 12 }}>
                <View style={styles.rangeRow}>
                  <Pressable
                    style={[styles.rangeDateButton, !pendingRangeStart && styles.rangeDateButtonEmpty]}
                    onPress={() => openFilterCalendarPicker('from')}
                  >
                    <Text style={styles.rangeDateLabel}>Début</Text>
                    <Text style={styles.rangeDateValue}>
                      {pendingRangeStart ? pendingRangeStart.toLocaleDateString() : 'Choisir'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.rangeDateButton, !pendingRangeEnd && styles.rangeDateButtonEmpty]}
                    onPress={() => openFilterCalendarPicker('to')}
                  >
                    <Text style={styles.rangeDateLabel}>Fin</Text>
                    <Text style={styles.rangeDateValue}>
                      {pendingRangeEnd ? pendingRangeEnd.toLocaleDateString() : 'Choisir'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.rangeHint}>Sélectionnez un début puis une fin.</Text>
              </View>
            )}
            <View style={styles.modalButtonsRow}>
              <Pressable style={styles.ghostBtn} onPress={closeFiltersPanel}><Text style={styles.ghostBtnText}>Fermer</Text></Pressable>
              <Pressable style={styles.cta} onPress={applyFiltersPanel}><Text style={styles.ctaText}>Appliquer</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={filterCalendarOpen} transparent animationType="fade" onRequestClose={closeFilterCalendarPicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.filtersBox}>
            <Text style={styles.modalTitle}>{filterCalendarTarget === 'from' ? 'Date de début' : 'Date de fin'}</Text>
            <CalendarSingle
              value={filterCalendarValue}
              onChange={setFilterCalendarValue}
              selectedColor={COLORS.azure}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable style={styles.ghostBtn} onPress={closeFilterCalendarPicker}><Text style={styles.ghostBtnText}>Annuler</Text></Pressable>
              <Pressable style={styles.cta} onPress={() => confirmFilterCalendarPicker(filterCalendarValue)}><Text style={styles.ctaText}>Choisir</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Nom, téléphone, adresse"
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => { setPage(0); load(true); }}
          style={styles.input}
          returnKeyType="search"
        />
        <Pressable onPress={() => { setPage(0); load(true); }} style={styles.ctaSmall}>
          <Text style={styles.ctaSmallText}>Rechercher</Text>
        </Pressable>
      </View>

      {/* Liste */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: listPaddingBottom }}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (isLoading) return;
          if (total != null && data.length >= total) return;
          setPage(p => p + 1);
        }}
        refreshing={isRefreshing}
        onRefresh={refresh}
        ListFooterComponent={
          <View style={{ paddingVertical: 12, alignItems: 'center' }}>
            {isLoading && <Text style={{ color: COLORS.textMuted }}>Chargement...</Text>}
            {total != null && data.length >= total && <Text style={{ color: COLORS.textMuted }}>Fin de liste</Text>}
          </View>
        }
      />

      <FloatingActionButton onPress={openCreate} accessibilityLabel="Créer une réservation" />

      {/* Modale create/edit */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal} transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={[styles.modalCard, { paddingBottom: modalCardPadding }]}>
            <Text style={styles.modalTitle}>{editing ? 'Modifier la réservation' : 'Nouvelle réservation'}</Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: modalScrollPadding }}
            >
              <Row>
                <Input
                  label="Nom"
                  value={form.client_last}
                  onChangeText={(v)=>handleClientNameChange(v, 'last')}
                  half
                  required
                  autoComplete="name-family"
                />
                <Input
                  label="Prénom"
                  value={form.client_first}
                  onChangeText={(v)=>handleClientNameChange(v, 'first')}
                  half
                  required
                  autoComplete="name-given"
                />
              </Row>
              {clientLookupLoading && <Text style={styles.autocompleteHint}>Recherche client...</Text>}
              {clientLookup.length > 0 && (
                <View style={styles.clientSuggestionsBox}>
                  {clientLookup.map((client) => (
                    <Pressable key={client.id} style={styles.clientSuggestion} onPress={() => selectClientSuggestion(client)}>
                      <View>
                        <Text style={styles.clientSuggestionName}>{client.last_name} {client.first_name}</Text>
                        <Text style={styles.clientSuggestionPhone}>{client.phone}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
              <Input label="Téléphone" value={form.phone} onChangeText={handlePhoneChange} keyboardType="phone-pad" required />
              <AddressInput label="Adresse de départ" value={form.pickup} onChangeText={(v)=>setForm(f=>({...f, pickup:v}))} required />              <View style={styles.stepInlineRow}>
                <Pressable style={styles.addStepInline} onPress={addDropoffStep}>
                  <Text style={styles.addStepInlineText}>+ étape</Text>
                </Pressable>
              </View>
              {form.dropoffStops?.map((stop, idx) => (
                <View key={`stop-${idx}`} style={styles.stepBlock}>
                  <AddressInput
                    label={`étape ${idx + 1}`}
                    value={stop}
                    onChangeText={(v)=>updateDropoffStep(idx, v)}
                  />
                  <Pressable style={styles.removeStepBtn} onPress={()=>removeDropoffStep(idx)}>
                    <Text style={styles.removeStepBtnText}>Supprimer cette étape</Text>
                  </Pressable>
                </View>
              ))}
              <AddressInput label="Adresse d'arrivée" value={form.dropoff} onChangeText={(v)=>setForm(f=>({...f, dropoff:v}))} required />

              <Row>
                <Pressable onPress={()=>setDateModal(true)} style={[styles.inputLike, styles.inputHalf]}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.inputLikeText}>
                    {formDate.toLocaleDateString()}
                  </Text>
                </Pressable>
                <Pressable onPress={()=>setTimeModal(true)} style={[styles.inputLike, styles.inputHalf]}>
                  <Text style={styles.label}>Heure</Text>
                  <View style={styles.timeField}>
                    <Text style={styles.inputLikeText}>{formTimeHHMM}</Text>
                    <Clock3 size={16} color={COLORS.text} />
                  </View>
                </Pressable>
              </Row>

              <View style={styles.durationSection}>
                <Text style={styles.label}>Temps de trajet</Text>
                <View style={styles.durationRow}>
                  <Pressable style={styles.durationBox} onPress={() => openDurationPicker('approach')}>
                    <Text style={styles.durationLabel}>Approche</Text>
                    <Text style={styles.durationValue}>{formatDurationDisplay(form.approach_duration_min)}</Text>
                  </Pressable>
                  <Pressable style={styles.durationBox} onPress={() => openDurationPicker('ride')}>
                    <Text style={styles.durationLabel}>Course</Text>
                    <Text style={styles.durationValue}>{formatDurationDisplay(form.ride_duration_min)}</Text>
                  </Pressable>
                  <Pressable style={styles.durationBox} onPress={() => openDurationPicker('return')}>
                    <Text style={styles.durationLabel}>Retour</Text>
                    <Text style={styles.durationValue}>{formatDurationDisplay(form.return_duration_min)}</Text>
                  </Pressable>
                </View>
              </View>

              <Row>
                <Input label="Passagers" value={passengersInput} onChangeText={handlePassengersChange} keyboardType="number-pad" half required />
                <Input label="Bagages" value={luggageInput} onChangeText={handleLuggageChange} keyboardType="number-pad" half required />
              </Row>

              <Row>
                <Toggle small label="Siége enfant" selected={!!form.child_seat} onPress={()=>setForm(f=>({...f, child_seat:!f.child_seat}))} />
                <View style={{ width: 8 }} />
                <Toggle small label="Aéroport" selected={form.transport_kind==='flight'} onPress={()=>setForm(f=>({...f, transport_kind: f.transport_kind==='flight'?'none':'flight'}))} />
                <View style={{ width: 8 }} />
                <Toggle small label="Gare" selected={form.transport_kind==='train'} onPress={()=>setForm(f=>({...f, transport_kind: f.transport_kind==='train'?'none':'train'}))} />
              </Row>
              {form.transport_kind === 'flight' && (
                <Input label="N° de vol" value={form.flight_no || ''} onChangeText={(v)=>setForm(f=>({...f, flight_no:v}))} />
              )}
              {form.transport_kind === 'train' && (
                <Input label="N° de train" value={form.train_no || ''} onChangeText={(v)=>setForm(f=>({...f, train_no:v}))} />
              )}

              <Input label="Commentaire" value={form.note_client} onChangeText={(v)=>setForm(f=>({...f, note_client:v}))} multiline />
            </ScrollView>

            <View style={styles.modalActions}>
              {editing && (
                <Pressable style={[styles.modalActionBtn, styles.modalActionDanger]} onPress={requestDeleteEditing}>
                  <Text style={styles.modalActionDangerText}>Supprimer</Text>
                </Pressable>
              )}
              <Pressable style={[styles.modalActionBtn, styles.modalActionGhost]} onPress={closeModal}>
                <Text style={styles.modalActionGhostText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionBtn, styles.modalActionPrimary, isSaving && { opacity: 0.7 }]}
                onPress={saveForm}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.darkText} />
                ) : (
                  <Text style={styles.modalActionPrimaryText}>{editing ? 'Enregistrer' : 'Créer'}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Calendrier (réutilisable) */}
      <Modal visible={dateModal} transparent animationType="fade" onRequestClose={()=>setDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Date</Text>
            <CalendarSingle value={formDate} onChange={setFormDate} selectedColor={COLORS.azure} />
            <View style={styles.modalButtonsRow}>
              <Pressable style={styles.cta} onPress={()=>setDateModal(false)}><Text style={styles.ctaText}>Valider</Text></Pressable>
              <Pressable style={styles.ghostBtn} onPress={()=>setDateModal(false)}><Text style={styles.ghostBtnText}>Annuler</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Horloge (réutilisable) */}
      <TimePicker
        visible={timeModal}
        value={formTimeHHMM}
        onClose={()=>setTimeModal(false)}
        onConfirm={(v)=>setFormTimeHHMM(v)}
      />
      <TimePicker
        visible={durationPickerTarget !== null}
        value={durationPickerValue}
        onClose={() => setDurationPickerTarget(null)}
        onConfirm={(value) => {
          if (!durationPickerTarget) return;
          const minutes = hhmmToMinutes(value);
          applyDurationValue(durationPickerTarget, minutes);
        }}
        label={
          durationPickerTarget === 'approach'
            ? "Temps d'approche"
            : durationPickerTarget === 'ride'
              ? 'Temps de course'
              : "Temps de retour"
        }
      />
      {clientCreationLoading && (
        <View style={styles.clientOverlay} pointerEvents="auto">
          <View style={styles.clientOverlayBox}>
            <ActivityIndicator size="large" color={COLORS.azure} />
            <Text style={styles.clientOverlayText}>Ajout du client...</Text>
          </View>
        </View>
      )}
    </View>
  );
}


function QuickActionButton(props: QuickActionProps) {
  const { label, onPress, variant = 'info' } = props;
  const variantStyle = {
    info: styles.quickAction_info,
    success: styles.quickAction_success,
    danger: styles.quickAction_danger,
    ghost: styles.quickAction_ghost,
  }[variant];
  const textColor =
    variant === 'danger'
      ? COLORS.text
      : variant === 'ghost'
        ? COLORS.text
        : COLORS.darkText;

  return (
    <Pressable onPress={onPress} style={[styles.quickAction, variantStyle]}>
      <Text style={[styles.quickActionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

type UtilityIconButtonProps = { label: string; icon: IconType; onPress: () => void };

function UtilityIconButton({ label, icon: Icon, onPress }: UtilityIconButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.utilityBtn}>
      <Icon size={16} color={COLORS.actionButtonText} />
      <Text style={styles.utilityBtnText}>{label}</Text>
    </Pressable>
  );
}

function AddressRow(props: AddressRowProps) {
  const { label, value, color, onPress, textColor, dividerColor, force = false, placeholder, showLabel = true } = props;
  const content = value?.trim() || (force ? (placeholder ?? 'Adresse indisponible') : '');
  if (!content) return null;
  return (
    <Pressable style={[styles.addressRow, dividerColor && { borderBottomColor: dividerColor }]} onPress={onPress}>
      <View style={styles.addressContent}>
        <MapPin size={16} color={color} style={styles.addressIcon} />
        <View style={{ flex: 1 }}>
          {showLabel && <Text style={[styles.addressLabel, { color }]}>{label}</Text>}
          <Text style={[styles.addressText, textColor && { color: textColor }]}>{content}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: ()=>void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghostBtnSm}>
      <Text style={styles.ghostBtnSmText}>{label}</Text>
    </Pressable>
  );
}
function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: ()=>void; color?: string }) {
  const selectedStyle = selected
    ? color
      ? { backgroundColor: color, borderColor: color }
      : styles.toggleSelected
    : styles.toggleGhost;
  const textStyle = selected
    ? { color: color === COLORS.azure ? COLORS.darkText : COLORS.text }
    : styles.toggleTextGhost;
  return (
    <Pressable onPress={onPress} style={[styles.toggle, selectedStyle]}>
      <Text style={[styles.toggleText, textStyle]}>{label}</Text>
    </Pressable>
  );
}
function Toggle({ label, selected, onPress, small }: { label: string; selected: boolean; onPress: ()=>void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, small && styles.toggleSmall, selected ? styles.toggleSelected : styles.toggleGhost]}>
      <Text style={[styles.toggleText, selected ? styles.toggleTextSelected : styles.toggleTextGhost]}>{label}</Text>
    </Pressable>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>;
}

type InputFieldProps = TextInputProps & {
  label: string;
  half?: boolean;
  multiline?: boolean;
  required?: boolean;
  containerStyle?: any;
  rightAccessory?: React.ReactNode;
};

function Input({ label, half, multiline, required, containerStyle, rightAccessory, ...props }: InputFieldProps) {
  return (
    <View style={[styles.inputContainer, half && styles.inputHalf, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, multiline && { height: 90 }]}
        />
        {rightAccessory}
      </View>
    </View>
  );
}

type AddressInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
};

type AddressSuggestion = {
  id: string;
  label: string;
};

type ClientNameField = 'first' | 'last';

function AddressInput({ label, value, onChangeText, required }: AddressInputProps) {
  const alertCtx = useAppAlert();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [myPosLoading, setMyPosLoading] = useState(false);
  const [validatedValue, setValidatedValue] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setQuery(value);
    if (!value) {
      setValidatedValue(null);
    }
  }, [value]);

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const handle = setTimeout(() => {
      fetchSuggestions(query);
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const fetchSuggestions = async (text: string) => {
    const current = ++requestSeq.current;
    try {
      setLoading(true);
      const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(text)}&limit=5`);
      if (!response.ok) throw new Error('bad status');
      const json = await response.json();
      if (!mountedRef.current || requestSeq.current !== current) return;
      const features = Array.isArray(json?.features) ? json.features : [];
      const next = features
        .map((feature: any) => ({
          id: feature.properties?.id ?? `${feature.properties?.label ?? ''}-${feature.properties?.city ?? ''}-${current}`,
          label: feature.properties?.label ?? '',
        }))
        .filter((item: AddressSuggestion) => item.label);
      setSuggestions(next);
    } catch (err) {
      if (!mountedRef.current || requestSeq.current !== current) return;
      setSuggestions([]);
    } finally {
      if (!mountedRef.current || requestSeq.current !== current) return;
      setLoading(false);
    }
  };

  const handleChange = (text: string) => {
    setQuery(text);
    if (validatedValue && text !== validatedValue) {
      setValidatedValue(null);
    }
    onChangeText(text);
  };

  const handleSelect = useCallback((text: string) => {
    setQuery(text);
    setValidatedValue(text);
    onChangeText(text);
    setSuggestions([]);
  }, [onChangeText]);

  const handleMyPosition = useCallback(async () => {
    if (myPosLoading) return;
    const geo = getNavigatorGeolocation();
    if (!geo) {
      alertCtx.show('Localisation indisponible', 'Activez les services de localisation pour utiliser "Ma position".');
      return;
    }
    const granted = await ensureLocationPermission();
    if (!granted) {
      alertCtx.show('Autorisation requise', 'La localisation est nécessaire pour utiliser "Ma position".');
      return;
    }
    setMyPosLoading(true);
    geo.getCurrentPosition(
      async (pos) => {
        if (!mountedRef.current) return;
        try {
          const address = await reverseGeocodeAddress(pos.coords.latitude, pos.coords.longitude);
          const finalAddress = address ?? formatCoordinates(pos.coords.latitude, pos.coords.longitude);
          handleSelect(finalAddress);
        } catch (err) {
          console.error('[AddressInput] reverse geocode error', err);
          alertCtx.show('Adresse introuvable', 'Impossible de convertir votre position en adresse.');
        } finally {
          if (mountedRef.current) setMyPosLoading(false);
        }
      },
      (error) => {
        if (!mountedRef.current) return;
        setMyPosLoading(false);
        alertCtx.show('Localisation impossible', translateGeolocationError(error));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }, [alertCtx, handleSelect, myPosLoading]);

  const showHint = query.trim().length >= 3 && !validatedValue;

  return (
    <View style={styles.addressInputContainer}>
      <Input
        label={label}
        value={query}
        onChangeText={handleChange}
        required={required}
        containerStyle={{ marginBottom: 4 }}
        rightAccessory={
          <Pressable
            onPress={handleMyPosition}
            disabled={myPosLoading}
            style={styles.geoButton}
            accessibilityRole="button"
            accessibilityLabel={`Utiliser ma position pour ${label}`}
          >
            {myPosLoading ? (
              <ActivityIndicator size="small" color={COLORS.azure} />
            ) : (
              <LocateFixed size={18} color={COLORS.azure} />
            )}
          </Pressable>
        }
      />
      {validatedValue ? (
        <Text style={styles.autocompleteValid}>Adresse validée</Text>
      ) : (
        showHint && <Text style={styles.autocompleteHint}>Sélectionnez une suggestion pour valider</Text>
      )}
      {loading && <Text style={styles.autocompleteHint}>Recherche en cours...</Text>}
      {suggestions.length > 0 && (
        <View style={styles.autocompleteBox}>
          {suggestions.map((suggestion, index) => (
            <Pressable
              key={suggestion.id}
              onPress={() => handleSelect(suggestion.label)}
              style={[
                styles.autocompleteItem,
                index === suggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.autocompleteText}>{suggestion.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* styles */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8 },
  statusFilterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  statusChipsWrap: { flexGrow: 1, flexShrink: 1, flexDirection: 'row', flexWrap: 'nowrap', gap: 8, overflow: 'hidden' },
  filterButton: { width: 44, height: 44, borderRadius: RADII.button, backgroundColor: COLORS.azure, alignItems: 'center', justifyContent: 'center' },
  inputContainer: { marginBottom: 12 },
  inputHalf: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADII.input,
    fontWeight: '700',
  },
  inputLike: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: RADII.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputLikeText: { color: COLORS.text, fontWeight: '700', marginTop: 2 },
  timeField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  durationSection: { marginTop: 8 },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationBox: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: RADII.input,
    padding: 12,
  },
  durationLabel: { color: COLORS.textMuted, fontWeight: '700', marginBottom: 4 },
  durationValue: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  addressInputContainer: { marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center' },
  inputField: { flex: 1 },
  geoButton: { marginLeft: 8, width: 44, height: 44, borderRadius: RADII.button, borderWidth: 1, borderColor: COLORS.outline, alignItems: 'center', justifyContent: 'center' },
  autocompleteBox: { borderColor: COLORS.inputBorder, borderWidth: 1, borderRadius: RADII.card, backgroundColor: COLORS.inputBg, marginTop: 4, overflow: 'hidden' },
  autocompleteItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.2)' },
  autocompleteText: { color: COLORS.text, fontWeight: '700' },
  autocompleteHint: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  autocompleteValid: { color: '#5cf2b0', fontSize: 12, marginBottom: 4, fontWeight: '800' },
  required: { color: '#ff6b6b' },

  ctaSmall: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  ctaSmallText: { color: COLORS.darkText, fontWeight: '700' },

  // Tous les boutons "chips/toggles" partagent la même hauteur
  toggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADII.button, borderWidth: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  toggleSmall: { paddingVertical: 8, height: 38 },
  toggleSelected: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  toggleGhost: { backgroundColor: 'transparent', borderColor: COLORS.outline },
  toggleText: { fontWeight: '800' },
  toggleTextSelected: { color: COLORS.darkText },
  toggleTextGhost: { color: COLORS.text },

  card: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: 12,
    marginBottom: 12,
    ...SHADOW.card,
    overflow: 'hidden',
  },
  cardUpcoming: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  cardCancelled: { backgroundColor: 'rgba(255,107,107,0.12)', borderColor: '#ff6b6b' },
  cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  cardSubtitle: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flex: 1, paddingRight: 12 },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.azure, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.button, gap: 6 },
  editPillText: { color: COLORS.darkText, fontWeight: '800', fontSize: 12 },
  returnWrapper: { gap: 4, alignItems: 'flex-start', flexShrink: 0 },
  returnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.button,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.azure,
    backgroundColor: COLORS.background,
  },
  returnPillDisabled: { opacity: 0.5 },
  returnPillText: { color: COLORS.azure, fontWeight: '700', fontSize: 12 },
  returnCountdownTrack: { height: 4, width: '100%', borderRadius: 999, backgroundColor: 'rgba(13,231,244,0.3)', overflow: 'hidden' },
  returnCountdownFill: { height: 4, borderRadius: 999, backgroundColor: COLORS.azure },
  cardLine: { color: COLORS.text, marginTop: 2 },
  cardLabel: { color: COLORS.textMuted, fontWeight: '700' },

  quickAction: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADII.button },
  quickActionText: { fontWeight: '800' },
  quickAction_info: { backgroundColor: COLORS.azure },
  quickAction_success: { backgroundColor: COLORS.success },
  quickAction_danger: { backgroundColor: COLORS.danger },
  quickAction_ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.outline },

  addressRow: { marginTop: 4, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  addressContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressIcon: { alignSelf: 'flex-start' },
  addressLabel: { fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
  addressText: { color: COLORS.text, fontWeight: '700' },
  tripMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.15)' },
  tripMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADII.button, borderWidth: 1 },
  tripMetaText: { fontWeight: '700' },
  durationChain: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.15)' },
  durationChipCard: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADII.button, backgroundColor: 'rgba(255,255,255,0.08)' },
  durationChipText: { fontWeight: '800' },

  commentBox: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADII.card, padding: 12, borderWidth: 1, borderColor: COLORS.inputBorder },
  commentLabel: { color: COLORS.textMuted, fontWeight: '800', marginBottom: 4 },
  commentText: { color: COLORS.text },

  utilityRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' },
  utilityRowCentered: { justifyContent: 'center' },
  utilityLeft: { flexDirection: 'row', gap: 12, flexShrink: 0 },
  utilityRight: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flexGrow: 1 },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADII.button,
    backgroundColor: COLORS.actionButtonBg,
    borderWidth: 1,
    borderColor: COLORS.actionButtonBorder,
    elevation: 2,
  },
  utilityBtnText: { color: COLORS.actionButtonText, fontWeight: '700', fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  ghostBtnSm: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtnSmText: { color: COLORS.text },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADII.card, borderTopRightRadius: RADII.card, borderColor: COLORS.inputBorder, borderWidth: 1, padding: 16, maxHeight: '90%' },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  modalActionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADII.button, minWidth: 110, alignItems: 'center' },
  modalActionGhost: { borderWidth: 1, borderColor: COLORS.outline, backgroundColor: 'transparent' },
  modalActionGhostText: { color: COLORS.text, fontWeight: '700' },
  modalActionPrimary: { backgroundColor: COLORS.azure },
  modalActionPrimaryText: { color:COLORS.darkText, fontWeight:'800' },
  modalActionDanger: { backgroundColor: 'rgba(255,107,107,0.15)', borderWidth: 1, borderColor: '#ff6b6b' },
  modalActionDangerText: { color: '#ff6b6b', fontWeight: '800' },

  label: { color: COLORS.text, fontWeight: '800', marginBottom: 6 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalBox: { width:'92%', backgroundColor:COLORS.background, borderRadius:RADII.card, borderWidth:1, borderColor:COLORS.inputBorder, padding:16 },
  modalButtonsRow: { flexDirection:'row', justifyContent:'flex-end', gap:8, marginTop:12 },
  filtersBox: { width:'92%', backgroundColor:COLORS.background, borderRadius:RADII.card, borderWidth:1, borderColor:COLORS.inputBorder, padding:16 },
  filterOptions: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 },
  filterOption: { paddingHorizontal:12, paddingVertical:8, borderRadius:RADII.button, borderWidth:1, borderColor:COLORS.inputBorder },
  filterOptionActive: { backgroundColor:COLORS.azure, borderColor:COLORS.azure },
  filterOptionText: { color: COLORS.text, fontWeight:'700' },
  filterOptionTextActive: { color: COLORS.background },
  filterCalendar: { marginBottom: 12 },
  rangeRow: { flexDirection:'row', gap:12 },
  rangeDateButton: { flex:1, padding:12, borderRadius:RADII.button, borderWidth:1, borderColor:COLORS.inputBorder, backgroundColor:COLORS.inputBg },
  rangeDateButtonEmpty: { borderColor: COLORS.outline },
  rangeDateLabel: { color: COLORS.textMuted, fontSize:12, marginBottom:4 },
  rangeDateValue: { color: COLORS.text, fontWeight:'700', fontSize:16 },
  rangeHint: { color: COLORS.textMuted, fontSize:12 },

  cta: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ctaText: { color:COLORS.darkText, fontWeight:'800' },
  ghostBtn: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ghostBtnText: { color: COLORS.text, fontWeight: '700' },

  stepInlineRow: { marginTop: 4, marginBottom: 8, alignItems: 'flex-start' },
  addStepInline: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADII.button, borderWidth: 1, borderColor: COLORS.outline, backgroundColor: 'transparent' },
  addStepInlineText: { color: COLORS.text, fontWeight: '700' },
  stepBlock: { marginBottom: 8 },
  removeStepBtn: { alignSelf: 'flex-end', paddingHorizontal: 8, paddingVertical: 4 },
  removeStepBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },

  clientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  clientOverlayBox: { backgroundColor: COLORS.inputBg, padding: 20, borderRadius: RADII.card, borderWidth: 1, borderColor: COLORS.inputBorder, alignItems: 'center', gap: 12 },
  clientOverlayText: { color: COLORS.text, fontWeight: '800' },
  clientSuggestionsBox: { borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: RADII.card, marginTop: 4, marginBottom: 8, backgroundColor: COLORS.inputBg },
  clientSuggestion: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  clientSuggestionName: { color: COLORS.text, fontWeight: '800' },
  clientSuggestionPhone: { color: COLORS.textMuted, fontSize: 12 },

  statusBanner: { marginHorizontal: -12, marginTop: -12, borderTopLeftRadius: RADII.card, borderTopRightRadius: RADII.card, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  statusBannerText: { fontWeight: '900', letterSpacing: 0.5 },
});

type CardTone = {
  containerStyle?: any;
  textColor: string;
  mutedColor: string;
  dividerColor: string;
  commentBg: string;
  commentBorder: string;
  bannerColor?: string;
  bannerTextColor?: string;
};

const CARD_TONES: Record<'default' | StatusKey, CardTone> = {
  default: {
    textColor: COLORS.text,
    mutedColor: COLORS.textMuted,
    dividerColor: 'rgba(255,255,255,0.15)',
    commentBg: 'rgba(255,255,255,0.05)',
    commentBorder: COLORS.inputBorder,
  },
  a_venir: {
    containerStyle: styles.cardUpcoming,
    textColor: '#0b273f',
    mutedColor: '#4b6174',
    dividerColor: 'rgba(11,39,63,0.18)',
    commentBg: 'rgba(11,39,63,0.04)',
    commentBorder: 'rgba(11,39,63,0.15)',
    bannerColor: COLORS.azure,
    bannerTextColor: COLORS.darkText,
  },
  en_cours: {
    containerStyle: styles.cardUpcoming,
    textColor: '#0b273f',
    mutedColor: '#104f32',
    dividerColor: 'rgba(11,39,63,0.18)',
    commentBg: 'rgba(11,39,63,0.04)',
    commentBorder: 'rgba(11,39,63,0.15)',
    bannerColor: COLORS.success,
    bannerTextColor: COLORS.text,
  },
  terminee: {
    containerStyle: styles.cardUpcoming,
    textColor: COLORS.darkText,
    mutedColor: COLORS.textOnLightMuted,
    dividerColor: COLORS.dividerOnLight,
    commentBg: COLORS.commentBgOnLight,
    commentBorder: COLORS.dividerOnLight,
    bannerColor: COLORS.danger,
    bannerTextColor: COLORS.text,
  },
  annulee: {
    containerStyle: styles.cardCancelled,
    textColor: '#360a0d',
    mutedColor: '#5e1a1f',
    dividerColor: 'rgba(54,10,13,0.18)',
    commentBg: 'rgba(54,10,13,0.05)',
    commentBorder: 'rgba(54,10,13,0.15)',
  },
  no_show: {
    containerStyle: styles.cardCancelled,
    textColor: '#360a0d',
    mutedColor: '#5e1a1f',
    dividerColor: 'rgba(54,10,13,0.18)',
    commentBg: 'rgba(54,10,13,0.05)',
    commentBorder: 'rgba(54,10,13,0.15)',
  },
};

function getCardTone(status: StatusKey): CardTone {
  return CARD_TONES[status] ?? CARD_TONES.default;
}

function getNavigatorGeolocation() {
  const navGlobal = typeof globalThis !== 'undefined' ? (globalThis as any).navigator : undefined;
  if (navGlobal?.geolocation) {
    return navGlobal.geolocation;
  }
  return null;
}

async function ensureLocationPermission() {
  if (Platform.OS !== 'android') {
    const geo = getNavigatorGeolocation();
    if (geo && typeof geo.requestAuthorization === 'function') {
      try {
        geo.requestAuthorization();
      } catch {
        // ignore
      }
    }
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Localisation',
        message: "Autorisez l'accès à la localisation pour utiliser \"Ma position\".",
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function reverseGeocodeAddress(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lon}`);
    if (!response.ok) return null;
    const json = await response.json();
    return json?.features?.[0]?.properties?.label ?? null;
  } catch (error) {
    console.log('[reverseGeocodeAddress] error', error);
    return null;
  }
}

function formatCoordinates(lat: number, lon: number) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function translateGeolocationError(error: { code?: number; message?: string }) {
  switch (error?.code) {
    case 1:
      return 'Autorisation refusée pour la localisation.';
    case 2:
      return 'Position indisponible pour le moment.';
    case 3:
      return 'La demande de localisation a expiré.';
    default:
      return error?.message || 'Impossible de récupérer la localisation.';
  }
}
