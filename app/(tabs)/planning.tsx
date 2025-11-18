import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react-native';

import { useAppAlert } from '@/contexts/AlertContext';
import { listReservations, type Reservation } from '@/lib/reservations.service';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';
import CalendarSingle from '@/lib/ui/CalendarSingle';
import FloatingActionButton from '@/components/ui/FloatingActionButton';

const HOUR_BLOCK_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, idx) => idx);

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

  const closeCalendarPicker = () => {
    setCalendarPickerOpen(false);
  };

  const confirmCalendarPicker = () => {
    setCursor(new Date(calendarSelection));
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
        <DayTimeline date={cursor} events={dayEvents} />
      ) : (
        <WeekBoard
          days={weekDays}
          reservationsByDay={reservationsByDay}
        />
      )}

      <FloatingActionButton
        onPress={openCalendarPicker}
        accessibilityLabel="Choisir une date"
        icon={<Calendar size={22} color={COLORS.darkText} />}
      />

      <Modal
        visible={calendarPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCalendarPicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Choisir une date</Text>
            <CalendarSingle
              value={calendarSelection}
              onChange={setCalendarSelection}
              selectedColor={COLORS.azure}
            />
            <View style={styles.modalButtonsRow}>
              <Pressable style={styles.ghostBtn} onPress={closeCalendarPicker}>
                <Text style={styles.ghostBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.ctaBtn} onPress={confirmCalendarPicker}>
                <Text style={styles.ctaBtnText}>Aller à cette date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DayTimeline({ date, events }: { date: Date; events: Reservation[] }) {
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
            return (
              <View
                key={event.id}
                style={[
                  styles.timelineEvent,
                  { top, height: Math.min(height, HOURS.length * HOUR_BLOCK_HEIGHT - top) },
                ]}
              >
                <Text style={styles.eventClient}>
                  {event.client_last} {event.client_first}
                </Text>
                <Text style={styles.eventTime}>
                  {formatHourMinutes(minutesFromStart)} - {formatHourMinutes(endMinutes)}
                </Text>
                <View style={styles.eventRow}>
                  <Clock3 size={14} color={COLORS.textMuted} />
                  <Text style={styles.eventMeta}>
                    {event.pickup || 'Départ non défini'}
                  </Text>
                </View>
                <View style={styles.eventRow}>
                  <MapPin size={14} color={COLORS.textMuted} />
                  <Text style={styles.eventMeta}>
                    {event.dropoff || 'Arrivée non définie'}
                  </Text>
                </View>
              </View>
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
}: {
  days: Date[];
  reservationsByDay: Record<string, Reservation[]>;
}) {
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
              items.map((event) => (
                <View key={event.id} style={styles.weekEventCard}>
                  <Text style={styles.eventClient}>
                    {event.client_last} {event.client_first}
                  </Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.datetime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.eventMeta}>
                    {event.pickup} → {event.dropoff}
                  </Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
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
  weekSelector: { gap: 12, paddingBottom: 2, paddingVertical: 2, marginBottom: 4 },
  dayChip: {
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.inputBg,
  },
  dayChipSelected: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  dayChipText: { color: COLORS.textMuted, fontWeight: '700', textTransform: 'capitalize', textAlign: 'center' },
  dayChipNumber: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  dayChipTextSelected: { color: COLORS.darkText },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loaderText: { color: COLORS.textMuted, fontWeight: '600' },
  timelineScroll: { flex: 1 },
  timeline: { flex: 1, position: 'relative', paddingBottom: 12 },
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
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.azure,
    ...SHADOW.card,
  },
  eventClient: { color: COLORS.text, fontWeight: '800', marginBottom: 4 },
  eventTime: { color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  eventMeta: { color: COLORS.text, flexShrink: 1, fontWeight: '600' },
  weekBoard: { gap: 12, paddingBottom: 120 },
  dayColumn: {
    backgroundColor: COLORS.background,
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
    backgroundColor: 'transparent',
    borderRadius: RADII.card,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.azure,
    marginBottom: 8,
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
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
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
