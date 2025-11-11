// components/CalendarSingle.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  selectedColor?: string; // optionnel
};

function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

export default function CalendarSingle({ value, onChange, selectedColor }: Props) {
  const today = new Date();
  const first = startOfMonth(value);
  const firstWeekday = (first.getDay()+6)%7; // Lundi=0
  const grid = useMemo(() => {
    const days: Date[] = [];
    const start = addDays(first, -firstWeekday);
    for (let i=0;i<42;i++) days.push(addDays(start, i));
    return days;
  }, [value]);

  const monthLabel = value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const prevMonth = () => onChange(addDays(first, -1));
  const nextMonth = () => onChange(addDays(addDays(first, 32), - (addDays(first, 32).getDate()))); // hack simple

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Pressable style={s.nav} onPress={prevMonth}><Text style={s.navTxt}>{'‹'}</Text></Pressable>
        <Text style={s.title}>{monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</Text>
        <Pressable style={s.nav} onPress={nextMonth}><Text style={s.navTxt}>{'›'}</Text></Pressable>
      </View>

      <View style={s.weekRow}>
        {['L','M','M','J','V','S','D'].map(k=>(
          <Text key={k} style={s.weekd}>{k}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {grid.map((d, idx)=>{
          const inMonth = d.getMonth()===value.getMonth();
          const selected = isSameDay(d, value);
          const isToday = isSameDay(d, today);
          return (
            <Pressable
              key={idx}
              onPress={()=>onChange(new Date(d))}
              style={[
                s.cell,
                selected && { backgroundColor: selectedColor ?? COLORS.azure, borderColor: COLORS.azure },
                !inMonth && { opacity: 0.45 },
                isToday && !selected && { borderColor: COLORS.azure, borderWidth: 1 },
              ]}
            >
              <Text style={[s.cellTxt, selected && { color: '#003642', fontWeight: '800' }]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nav: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADII.button, borderWidth: 1, borderColor: COLORS.outline },
  navTxt: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekd: { width: `${100/7}%`, textAlign: 'center', color: COLORS.textMuted, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100/7}%`, aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADII.button, marginVertical: 4,
  },
  cellTxt: { color: COLORS.text, fontWeight: '700' },
});
