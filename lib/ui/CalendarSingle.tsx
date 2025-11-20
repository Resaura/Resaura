// lib/ui/CalendarSingle.tsx
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII } from '@/lib/theme';

type Props = {
  value: Date;
  onChange: (next: Date) => void;
  selectedColor?: string;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

const makeDay = (y: number, m: number, d: number) =>
  new Date(y, m, d, 12, 0, 0, 0); // midi pour éviter les bascules DST

const startOfMonth = (date: Date) => makeDay(date.getFullYear(), date.getMonth(), 1);

const addDays = (date: Date, delta: number) =>
  makeDay(date.getFullYear(), date.getMonth(), date.getDate() + delta);

const addMonths = (date: Date, delta: number) =>
  makeDay(date.getFullYear(), date.getMonth() + delta, 1);

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export default function CalendarSingle({ value, onChange, selectedColor }: Props) {
  const today = useMemo(() => makeDay(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const monthStart = useMemo(() => startOfMonth(value), [value]);
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Lundi = 0

  const gridRows = useMemo(() => {
    const rows: Date[][] = [];
    let cursor = addDays(monthStart, -firstWeekday);
    for (let week = 0; week < 6; week += 1) {
      const weekDays: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        weekDays.push(cursor);
        cursor = addDays(cursor, 1);
      }
      rows.push(weekDays);
    }
    return rows;
  }, [firstWeekday, monthStart]);

  const monthLabel = value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const highlightColor = selectedColor ?? COLORS.azure;

  const handleMonthChange = (delta: number) => {
    const next = addMonths(value, delta);
    onChange(next);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Pressable style={styles.nav} onPress={() => handleMonthChange(-1)}>
          <Text style={styles.navText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.title}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <Pressable style={styles.nav} onPress={() => handleMonthChange(1)}>
          <Text style={styles.navText}>{'>'}</Text>
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {gridRows.map((week, idx) => (
          <View key={`week-${idx}`} style={styles.weekRow}>
            {week.map((day) => {
              const inMonth = day.getMonth() === value.getMonth();
              const selected = isSameDay(day, value);
              const todayMark = isSameDay(day, today);
              return (
                <Pressable
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  onPress={() =>
                    onChange(makeDay(day.getFullYear(), day.getMonth(), day.getDate()))
                  }
                  style={[
                    styles.cell,
                    selected && { backgroundColor: highlightColor, borderColor: highlightColor },
                    !inMonth && styles.cellMuted,
                    todayMark && !selected && styles.todayOutline,
                  ]}
                >
                  <Text style={[styles.cellText, selected && styles.cellTextSelected]}>
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nav: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  navText: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: COLORS.textMuted, fontWeight: '700' },
  grid: { flexDirection: 'column' },
  weekRow: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 2 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button,
    marginHorizontal: 2,
    paddingVertical: 2,
  },
  cellMuted: { opacity: 0.45 },
  todayOutline: { borderColor: COLORS.azure, borderWidth: 1 },
  cellText: { color: COLORS.text, fontWeight: '700' },
  cellTextSelected: { color: COLORS.darkText, fontWeight: '800' },
});
