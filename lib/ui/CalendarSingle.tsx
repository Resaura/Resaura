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

const startOfMonth = (date: Date) => {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, delta: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
};

const addMonths = (date: Date, delta: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + delta);
  return next;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export default function CalendarSingle({ value, onChange, selectedColor }: Props) {
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(value), [value]);
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Lundi = 0

  const grid = useMemo(() => {
    const days: Date[] = [];
    const cursor = addDays(monthStart, -firstWeekday);
    for (let i = 0; i < 42; i += 1) {
      days.push(addDays(cursor, i));
    }
    return days;
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
        {grid.map((day) => {
          const inMonth = day.getMonth() === value.getMonth();
          const selected = isSameDay(day, value);
          const todayMark = isSameDay(day, today);
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onChange(new Date(day))}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.button,
    marginVertical: 4,
  },
  cellMuted: { opacity: 0.45 },
  todayOutline: { borderColor: COLORS.azure, borderWidth: 1 },
  cellText: { color: COLORS.text, fontWeight: '700' },
  cellTextSelected: { color: COLORS.darkText, fontWeight: '800' },
});

