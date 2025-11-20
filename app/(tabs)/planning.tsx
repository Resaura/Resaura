import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react-native';

import { useAppAlert } from '@/contexts/AlertContext';
import { listReservations, type Reservation } from '@/lib/reservations.service';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import CalendarPickerModal from '@/components/ui/CalendarPickerModal';

const HOUR_BLOCK_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, idx) => idx);
const STOP_SPLIT_REGEX = /\u2192|->|\n/g;

type ViewMode = 'day' | 'week';

export default function PlanningScreen() {
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(28, insets.top + 16);
  const safeBottom = (insets.bottom || 0) + 12;
  const swipeHandlers = useSwipeTabsNavigation('planning');

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const [calendarSelection, setCalendarSelection] = useState<Date>(new Date());
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const range = useMemo(() => {
    const fromDate = viewMode === 'day' ? startOfDay(cursor) : startOfWeek(cursor);
    const toDate = viewMode === 'day' ? endOfDay(cursor) : endOfWeek(cursor);
    return {
      fromDate,
      toDate,
      fromISO: fromDate.toISOString(),
      toISO: toDate.toISOString(),
    };
  }, [cursor, viewMode]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [cursor]);

  const reservationsByDay = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    reservations.forEach((item) => {
      const key = formatDateKey(new Date(item.datetime));
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    Object.values(map).forEach((list) =>
      list.sort(
        (a, b) =>
          new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
      ),
    );
    return map;
  }, [reservations]);

  const activeDayKey = formatDateKey(cursor);
  const dayEvents = reservationsByDay[activeDayKey] ?? [];

  const extractPrimaryDropoff = useCallback((raw?: string | null) => {
    if (!raw) return '';
    return raw.split(STOP_SPLIT_REGEX).map((segment) => segment.trim()).filter(Boolean)[0] ?? '';
  }, []);

  const dialReservationPhone = useCallback((phone?: string | null, event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    const sanitized = phone?.replace(/[^\d+]/g, '');
    if (!sanitized) {
      alert.show('Numéro indisponible', 'Aucun numéro valide pour ce client.');
      return;
    }
    Linking.openURL(`tel:${sanitized}`).catch(() => {
      alert.show('Appel impossible', 'Impossible de lancer l’appel.');
    });
  }, [alert]);

  const openReservationAddress = useCallback((label: string, value?: string | null, event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    const target = value?.trim();
    if (!target) {
      alert.show(`${label} indisponible`, `Aucune adresse pour ${label.toLowerCase()}.`);
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
  }, [alert]);

  const openReservationModal = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation);
    setReservationModalOpen(true);
  }, []);

  const closeReservationModal = useCallback(() => {
    setReservationModalOpen(false);
    setSelectedReservation(null);
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await listReservations({
        from: range.fromISO,
        to: range.toISO,
        pageSize: 200,
      });
      setReservations(items);
    } catch {
      alert.show(
        'Planning indisponible',
        "Impossible de charger les réservations pour la période sélectionnée.",
      );
    } finally {
      setLoading(false);
    }
  }, [alert, range.fromISO, range.toISO]);

  React.useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useFocusEffect(
    useCallback(() => {
      if ((globalThis as any).__RESAURA_PLANNING_DIRTY) {
        (globalThis as any).__RESAURA_PLANNING_DIRTY = false;
        loadReservations();
      }
    }, [loadReservations]),
  );

  const shiftCursor = (direction: -1 | 1) => {
    setCursor((prev) => {
      const next = new Date(prev);
      if (viewMode === 'day') next.setDate(next.getDate() + direction);
      else next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  const openCalendarPicker = () => {
    setCalendarSelection(cursor);
    setCalendarPickerOpen(true);
  };

  const closeCalendarPicker = () => setCalendarPickerOpen(false);

  const confirmCalendarPicker = (next: Date) => {
    setCursor(new Date(next));
    setCalendarSelection(next);
    setCalendarPickerOpen(false);
  };

  return (
    <View
      {...swipeHandlers}
      style={[styles.container, { paddingTop: safeTop, paddingBottom: safeBottom }]}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.navButton} onPress={() => shiftCursor(-1)}>
            <ChevronLeft size={18} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{formatRangeLabel(range.fromDate, range.toDate, viewMode)}</Text>
          <Pressable style={styles.navButton} onPress={() => shiftCursor(1)}>
            <ChevronRight size={18} color={COLORS.text} />
          </Pressable>
        </View>
        <View style={styles.segmented}>
          {(['day', 'week'] as ViewMode[]).map((mode) => {
            const selected = viewMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[
                  styles.segmentButton,
                  selected && styles.segmentButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextSelected,
                  ]}
                >
                  {mode === 'day' ? 'Jour' : 'Semaine'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekSelector}
      >
        {weekDays.map((day) => {
          const isSelected = formatDateKey(day) === activeDayKey;
          return (
            <Pressable
              key={day.toISOString()}
              style={[
                styles.dayChip,
                isSelected && styles.dayChipSelected,
              ]}
              onPress={() => setCursor(new Date(day))}
            >
              <Text
                style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextSelected,
                ]}
              >
                {formatDayShort(day)}
              </Text>
              <Text
                style={[
                  styles.dayChipNumber,
                  isSelected && styles.dayChipTextSelected,
                ]}
              >
                {day.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={COLORS.azure} />
          <Text style={styles.loaderText}>Chargement du planning…</Text>
        </View>
      ) : viewMode === 'day' ? (
        <DayTimeline
          date={cursor}
          events={dayEvents}
          onReservationPress={openReservationModal}
          onCall={dialReservationPhone}
          onAddress={openReservationAddress}
          extractDropoff={extractPrimaryDropoff}
        />
      ) : (
        <WeekBoard
          days={weekDays}
          reservationsByDay={reservationsByDay}
          onReservationPress={openReservationModal}
          onCall={dialReservationPhone}
          onAddress={openReservationAddress}
          extractDropoff={extractPrimaryDropoff}
        />
      )}

      <FloatingActionButton
        onPress={openCalendarPicker}
        accessibilityLabel="Choisir une date"
        icon={<Calendar size={22} color={COLORS.darkText} />}
      />

      <CalendarPickerModal
        visible={calendarPickerOpen}
        value={calendarSelection}
        onCancel={closeCalendarPicker}
        onConfirm={confirmCalendarPicker}
        title="Choisir une date"
      />

      <ReservationDetailsModal
        visible={reservationModalOpen}
        reservation={selectedReservation}
        onClose={closeReservationModal}
        onCall={dialReservationPhone}
        onAddress={openReservationAddress}
        extractDropoff={extractPrimaryDropoff}
      />
    </View>
  );
}

type ReservationActionProps = {
  onReservationPress: (reservation: Reservation) => void;
  onCall: (phone?: string | null, event?: GestureResponderEvent) => void;
  onAddress: (label: string, value?: string | null, event?: GestureResponderEvent) => void;
  extractDropoff: (raw?: string | null) => string;
};

function DayTimeline({
  date,
  events,
  onReservationPress,
  onCall,
  onAddress,
  extractDropoff,
}: {
  date: Date;
  events: Reservation[];
} & ReservationActionProps) {
  const start = startOfDay(date).getTime();
  const dayDuration = 24 * 60;
  return (
    <ScrollView
      style={styles.timelineScroll}
      contentContainerStyle={{ height: HOURS.length * HOUR_BLOCK_HEIGHT }}
    >
      <View style={styles.timeline}>
        {HOURS.map((hour) => (
          <View key={`h-${hour}`} style={styles.timelineRow}>
            <Text style={styles.timelineHour}>{String(hour).padStart(2, '0')}h</Text>
            <View style={styles.timelineDivider} />
          </View>
        ))}
        <View style={styles.timelineEventsLayer}>
          {events.map((event) => {
            const dt = new Date(event.datetime);
            const minutesFromStart = (dt.getTime() - start) / 60000;
            const durationMin = event.duration_min
              ?? event.ride_duration_min
              ?? event.return_duration_min
              ?? 45;
            const top = Math.max(0, (minutesFromStart / 60) * HOUR_BLOCK_HEIGHT);
            const height = Math.max(
              48,
              (durationMin / 60) * HOUR_BLOCK_HEIGHT,
            );
            const endMinutes = Math.min(
              dayDuration,
              minutesFromStart + durationMin,
            );
            const dropoffPrimary = extractDropoff(event.dropoff) || event.dropoff;
            return (
              <Pressable
                key={event.id}
                style={[
                  styles.timelineEvent,
                  { top, height: Math.min(height, HOURS.length * HOUR_BLOCK_HEIGHT - top) },
                ]}
                onPress={() => onReservationPress(event)}
              >
                <View style={styles.eventHeaderRow}>
                  <View>
                    <Text style={styles.eventClient}>
                      {event.client_last} {event.client_first}
                    </Text>
                    <Text style={styles.eventTime}>
                      {formatHourMinutes(minutesFromStart)} - {formatHourMinutes(endMinutes)}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.eventPhone}
                    onPress={(pressEvent) => onCall(event.phone, pressEvent)}
                  >
                    <Phone size={14} color={COLORS.darkText} />
                    <Text style={styles.eventPhoneText}>{event.phone ?? '—'}</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={styles.eventRow}
                  onPress={(pressEvent) => onAddress('Départ', event.pickup, pressEvent)}
                >
                  <MapPin size={14} color={COLORS.textOnLightMuted} />
                  <Text style={styles.eventMeta}>
                    {event.pickup || 'Départ non défini'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.eventRow}
                  onPress={(pressEvent) => onAddress('Arrivée', dropoffPrimary, pressEvent)}
                >
                  <MapPin size={14} color={COLORS.textOnLightMuted} />
                  <Text style={styles.eventMeta}>
                    {dropoffPrimary || 'Arrivée non définie'}
                  </Text>
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function WeekBoard({
  days,
  reservationsByDay,
  onReservationPress,
  onCall,
  onAddress,
  extractDropoff,
}: {
  days: Date[];
  reservationsByDay: Record<string, Reservation[]>;
} & ReservationActionProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.weekBoard}
      showsVerticalScrollIndicator={false}
    >
      {days.map((day) => {
        const key = formatDateKey(day);
        const items = reservationsByDay[key] ?? [];
        return (
          <View key={key} style={styles.dayColumn}>
            <View style={styles.dayColumnHeader}>
              <Text style={styles.dayColumnLabel}>{formatDayShort(day)}</Text>
              <Text style={styles.dayColumnDate}>{day.getDate()}</Text>
            </View>
            {items.length === 0 ? (
              <Text style={styles.emptySlot}>Aucune réservation</Text>
            ) : (
              items.map((event) => {
                const dt = new Date(event.datetime);
                const dropoffPrimary = extractDropoff(event.dropoff) || event.dropoff;
                return (
                  <Pressable
                    key={event.id}
                    style={styles.weekEventCard}
                    onPress={() => onReservationPress(event)}
                  >
                    <View style={styles.eventHeaderRow}>
                      <View>
                        <Text style={[styles.eventClient, styles.eventClientOnLight]}>
                          {event.client_last} {event.client_first}
                        </Text>
                        <Text style={[styles.eventTime, styles.eventTimeOnLight]}>
                          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.eventPhone}
                        onPress={(pressEvent) => onCall(event.phone, pressEvent)}
                      >
                        <Phone size={14} color={COLORS.darkText} />
                        <Text style={styles.eventPhoneText}>{event.phone ?? '—'}</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      style={styles.eventRow}
                      onPress={(pressEvent) => onAddress('Départ', event.pickup, pressEvent)}
                    >
                      <MapPin size={14} color={COLORS.textOnLightMuted} />
                      <Text style={[styles.eventMeta, styles.eventMetaOnLight]}>
                        {event.pickup || 'Départ non défini'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.eventRow}
                      onPress={(pressEvent) => onAddress('Arrivée', dropoffPrimary, pressEvent)}
                    >
                      <MapPin size={14} color={COLORS.textOnLightMuted} />
                      <Text style={[styles.eventMeta, styles.eventMetaOnLight]}>
                        {dropoffPrimary || 'Arrivée non définie'}
                      </Text>
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function ReservationDetailsModal({
  visible,
  reservation,
  onClose,
  onCall,
  onAddress,
  extractDropoff,
}: {
  visible: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onCall: (phone?: string | null, event?: GestureResponderEvent) => void;
  onAddress: (label: string, value?: string | null, event?: GestureResponderEvent) => void;
  extractDropoff: (raw?: string | null) => string;
}) {
  if (!reservation) return null;
  const dt = new Date(reservation.datetime);
  const dropoffPrimary = extractDropoff(reservation.dropoff) || reservation.dropoff;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.reservationModalCard}>
          <Text style={styles.modalTitle}>Réservation</Text>
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.modalClient}>{reservation.client_last} {reservation.client_first}</Text>
              <Text style={styles.modalDate}>{dt.toLocaleDateString()} • {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <Pressable style={styles.eventPhone} onPress={() => onCall(reservation.phone)}>
              <Phone size={16} color={COLORS.darkText} />
              <Text style={styles.eventPhoneText}>{reservation.phone ?? '—'}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.modalRow} onPress={() => onAddress('Départ', reservation.pickup)}>
            <MapPin size={16} color={COLORS.textOnLightMuted} />
            <Text style={[styles.eventMeta, styles.eventMetaOnLight]}>
              {reservation.pickup || 'Départ non défini'}
            </Text>
          </Pressable>
          <Pressable style={styles.modalRow} onPress={() => onAddress('Arrivée', dropoffPrimary)}>
            <MapPin size={16} color={COLORS.textOnLightMuted} />
            <Text style={[styles.eventMeta, styles.eventMetaOnLight]}>
              {dropoffPrimary || 'Arrivée non définie'}
            </Text>
          </Pressable>
          <Pressable style={styles.ctaBtn} onPress={onClose}>
            <Text style={styles.ctaBtnText}>Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 sunday
  const mondayOffset = (day + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatRangeLabel(from: Date, to: Date, mode: ViewMode) {
  if (mode === 'day') {
    return from.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
  const sameMonth = from.getMonth() === to.getMonth();
  const fromText = from.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });
  const toText = to.toLocaleDateString(undefined, {
    day: 'numeric',
    month: sameMonth ? undefined : 'long',
  });
  return `${fromText} - ${toText}`;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayShort(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function formatHourMinutes(totalMinutes: number) {
  const minutes = Math.max(0, totalMinutes);
  const hour = Math.floor(minutes / 60) % 24;
  const min = Math.floor(minutes % 60);
  return `${String(hour).padStart(2, '0')}h${String(min).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    gap: 12,
  },
  header: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADII.button,
    overflow: 'hidden',
  },
  segmentButton: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  segmentButtonSelected: { backgroundColor: COLORS.azure },
  segmentText: { color: COLORS.text, fontWeight: '700' },
  segmentTextSelected: { color: COLORS.darkText },
  weekSelector: { gap: 12, paddingBottom: 0, paddingVertical: 2, marginBottom: 2 },
  dayChip: {
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.azure,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.backgroundDeep,
  },
  dayChipSelected: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  dayChipText: { color: COLORS.textMuted, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center' },
  dayChipNumber: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  dayChipTextSelected: { color: COLORS.darkText },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loaderText: { color: COLORS.textMuted, fontWeight: '600' },
  timelineScroll: { flex: 1 },
  timeline: {
    flex: 1,
    position: 'relative',
    paddingBottom: 12,
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    paddingHorizontal: 12,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', height: HOUR_BLOCK_HEIGHT },
  timelineHour: { width: 48, color: COLORS.textMuted, fontWeight: '600' },
  timelineDivider: { flex: 1, height: 1, backgroundColor: COLORS.inputBorder },
  timelineEventsLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: HOURS.length * HOUR_BLOCK_HEIGHT, paddingLeft: 52, paddingRight: 12 },
  timelineEvent: {
    position: 'absolute',
    left: 52,
    right: 12,
    borderRadius: RADII.card,
    padding: 12,
    backgroundColor: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.azure,
    ...SHADOW.card,
  },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  eventClient: { color: COLORS.textOnLight, fontWeight: '800', marginBottom: 4 },
  eventClientOnLight: { color: COLORS.textOnLight },
  eventTime: { color: COLORS.textOnLightMuted, fontWeight: '600', marginBottom: 4 },
  eventTimeOnLight: { color: COLORS.textOnLightMuted },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eventMeta: { color: COLORS.textOnLight, flexShrink: 1, fontWeight: '600' },
  eventMetaOnLight: { color: COLORS.textOnLight },
  eventPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventPhoneText: { color: COLORS.darkText, fontWeight: '700' },
  weekBoard: { gap: 12, paddingBottom: 120 },
  dayColumn: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.azure,
    ...SHADOW.card,
  },
  dayColumnHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayColumnLabel: { color: COLORS.textMuted, fontWeight: '700', textTransform: 'capitalize' },
  dayColumnDate: { color: COLORS.text, fontWeight: '800' },
  emptySlot: { color: COLORS.textMuted, fontStyle: 'italic' },
  weekEventCard: {
    backgroundColor: COLORS.text,
    borderRadius: RADII.card,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.azure,
    marginBottom: 8,
    ...SHADOW.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: 20,
    gap: 16,
  },
  reservationModalCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    padding: 20,
    gap: 12,
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  modalClient: { color: COLORS.text, fontWeight: '800', fontSize: 18 },
  modalDate: { color: COLORS.textMuted, fontWeight: '600', marginTop: 4 },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  ghostBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  ghostBtnText: { color: COLORS.text, fontWeight: '700' },
  ctaBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: RADII.button,
    backgroundColor: COLORS.azure,
  },
  ctaBtnText: { color: COLORS.darkText, fontWeight: '800' },
});
