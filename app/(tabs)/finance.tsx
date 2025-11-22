import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  PanResponder,
} from 'react-native';
import { ChevronLeft, ChevronRight, Calculator, Edit2, Target, X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import FloatingActionButton from '@/components/ui/FloatingActionButton';
import TvaCalculator from '@/components/tools/TvaCalculator';
import { useAppAlert } from '@/contexts/AlertContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ---------------- THEME (Resaura) ---------------- */
const C = {
  bg: COLORS.background,
  card: COLORS.inputBg,
  card2: COLORS.backgroundDeep,
  text: COLORS.text,
  textMut: COLORS.textMuted,
  accent1: COLORS.azure,
  accent2: COLORS.azure,
  ok: COLORS.success,
  danger: COLORS.danger,
  darkInk: COLORS.darkText,
  border: COLORS.inputBorder,
};

/* ---------------- TYPES ---------------- */
type Side = 'revenu' | 'depense';
type Period = 'day' | 'week' | 'month' | 'year' | 'range';

type Category = {
  id: string;
  name: string;
  color: string;   // HEX
  icon: string;    // emoji / icône
  side: Side;
};

type Tx = {
  id: string;
  side: Side;
  amountHT: number;
  tvaRate: number;       // 0 | 5.5 | 10 | 20
  amountTTC: number;
  categoryId: string;
  dateISO: string;       // 2025-10-28T00:00:00
  tags: string[];
  note?: string;
  photos?: string[];
};

/* ---------------- HELPERS ---------------- */
const fmtEuros = (n: number) =>
  isNaN(n) ? '0 €' : `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
const cloneDate = (d: Date) => new Date(d.getTime());
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const startOfWeek = (d: Date) => {
  const out = cloneDate(d);
  const wd = out.getDay() || 7;
  out.setDate(out.getDate() - wd + 1);
  return startOfDay(out);
};
const endOfWeek = (d: Date) => {
  const s = startOfWeek(d);
  const e = cloneDate(s);
  e.setDate(s.getDate() + 6);
  return endOfDay(e);
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
const inRange = (iso: string, a: Date, b: Date) => {
  const t = new Date(iso).getTime();
  return t >= a.getTime() && t <= b.getTime();
};
const daysInMonthOf = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const daysBetweenInclusive = (start: Date, end: Date) =>
  Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
const aggregateTotals = (entries: Tx[]) =>
  entries.reduce(
    (acc, tx) => {
      acc.ht += tx.amountHT;
      acc.ttc += tx.amountTTC;
      return acc;
    },
    { ht: 0, ttc: 0 },
  );
const computeGoalForPeriod = (
  monthlyGoal: number,
  period: Period,
  referenceDate: Date,
  fromDate: Date,
  toDate: Date,
) => {
  const daysInMonth = Math.max(1, daysInMonthOf(referenceDate));
  const dailyGoal = monthlyGoal / daysInMonth;
  switch (period) {
    case 'day':
      return dailyGoal;
    case 'week':
      return dailyGoal * 7;
    case 'month':
      return monthlyGoal;
    case 'year':
      return monthlyGoal * 12;
    case 'range':
      return dailyGoal * daysBetweenInclusive(fromDate, toDate);
    default:
      return monthlyGoal;
  }
};

/* ---------------- CALENDARS ---------------- */
function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let current = 1 - firstWeekday;
  for (let w = 0; w < 6; w++) {
    const row: (Date | null)[] = [];
    for (let d = 0; d < 7; d++, current++) {
      if (current < 1 || current > daysInMonth) row.push(null);
      else row.push(new Date(year, month, current));
    }
    weeks.push(row);
  }
  return weeks;
}
const isSameDayDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const CalendarRange = ({
  start,
  end,
  onChange,
  selectedColor,
}: {
  start?: Date | null;
  end?: Date | null;
  onChange: (s: Date | null, e: Date | null) => void;
  selectedColor: string;
}) => {
  const [cursor, setCursor] = useState<Date>(start || new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = monthMatrix(year, month);
  const select = (day: Date) => {
    if (!start || (start && end)) onChange(day, null);
    else onChange(day < start ? day : start, day < start ? start : day);
  };
  const within = (d: Date) =>
    start && end ? inRange(d.toISOString(), startOfDay(start), endOfDay(end)) : false;
  const rangeHighlight = `${selectedColor}33`;

  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.header}>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft color={C.text} size={18} />
        </TouchableOpacity>
        <Text style={calStyles.headerText}>
          {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <ChevronRight color={C.text} size={18} />
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l) => (
          <Text key={l} style={calStyles.weekDay}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((row, i) => (
        <View key={i} style={calStyles.weekRow}>
          {row.map((d, j) => {
            if (!d) return <View key={j} style={calStyles.dayCell} />;
            const selected =
              (start && isSameDayDate(d, start)) || (end && isSameDayDate(d, end));
            const between = within(d);
            return (
              <TouchableOpacity
                key={j}
                style={[
                  calStyles.dayCell,
                  between && { backgroundColor: rangeHighlight },
                  selected && { backgroundColor: selectedColor },
                ]}
                onPress={() => select(d)}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    selected && { color: C.darkInk, fontWeight: '900' },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const CalendarSingle = ({
  value,
  onChange,
  selectedColor,
}: {
  value: Date;
  onChange: (d: Date) => void;
  selectedColor: string;
}) => {
  const [cursor, setCursor] = useState<Date>(value || new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = monthMatrix(year, month);
  return (
    <View style={calStyles.wrap}>
      <View style={calStyles.header}>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft color={C.text} size={18} />
        </TouchableOpacity>
        <Text style={calStyles.headerText}>
          {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <ChevronRight color={C.text} size={18} />
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekRow}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l) => (
          <Text key={l} style={calStyles.weekDay}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((row, i) => (
        <View key={i} style={calStyles.weekRow}>
          {row.map((d, j) => {
            if (!d) return <View key={j} style={calStyles.dayCell} />;
            const selected = isSameDayDate(d, value);
            return (
              <TouchableOpacity
                key={j}
                style={[calStyles.dayCell, selected && { backgroundColor: selectedColor }]}
                onPress={() => onChange(d)}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    selected && { color: C.darkInk, fontWeight: '900' },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const calStyles = StyleSheet.create({
  wrap: {
    backgroundColor: C.card2,
    borderRadius: RADII.card,
    padding: 12,
    borderWidth: 1,
    borderColor: C.card2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: { color: C.text, fontWeight: '800' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weekDay: { width: 36, textAlign: 'center', color: C.textMut },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  dayText: { color: C.text },
});

/* ---------------- MAIN ---------------- */
type TransactionPrefill = {
  reservationId: string;
  amount?: number | null;
  clientName?: string;
  pickup?: string;
  dropoff?: string;
  datetime?: string;
};

export default function FinanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const appAlert = useAppAlert();
  const safeTop = Math.max(32, insets.top + 12);
  const safeBottom = (insets.bottom || 0) + 8;
  const scrollPaddingBottom = safeBottom + 80;
  const swipeHandlers = useSwipeTabsNavigation('finance');
  const txPrefillParam = params?.txPrefill as string | string[] | undefined;
  const [side, setSide] = useState<Side>('revenu');
  const [period, setPeriod] = useState<Period>('week');
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [rangeModal, setRangeModal] = useState(false);
  const [txDateModal, setTxDateModal] = useState(false);
  const [showChartAsProgress, setShowChartAsProgress] = useState(false);
  const [goalRevenue, setGoalRevenue] = useState<{ ht: number; ttc: number }>({ ht: 1000, ttc: 1000 });
  const [goalExpense, setGoalExpense] = useState<{ ht: number; ttc: number }>({ ht: 500, ttc: 500 });
  const [showTTC, setShowTTC] = useState<boolean>(true);
  const [goalEditVisible, setGoalEditVisible] = useState(false);
  const [goalEditValue, setGoalEditValue] = useState('');
  const [goalEditTarget, setGoalEditTarget] = useState<{ side: Side; mode: 'HT' | 'TTC' }>({
    side: 'revenu',
    mode: 'TTC',
  });

  // swipe vertical doux sur la carte pour basculer graphe <-> objectif (éviter de bloquer le scroll)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dy) > Math.abs(g.dx) * 1.5 && Math.abs(g.dy) > 36,
      onPanResponderRelease: (_evt, g) => {
        if (g.dy < -20) setShowChartAsProgress(true); // swipe up => objectif
        if (g.dy > 20) setShowChartAsProgress(false); // swipe down => répartition
      },
    }),
  ).current;

  const [categories, setCategories] = useState<Category[]>([
    { id: 'c1', name: 'Taxi CB', color: '#FDBA74', icon: '💳', side: 'revenu' },
    { id: 'c2', name: 'Taxi esp', color: '#86EFAC', icon: '💶', side: 'revenu' },
    { id: 'c3', name: 'Taxi assistance', color: '#FCA5A5', icon: '🆘', side: 'revenu' },
    { id: 'c4', name: 'Carburant', color: '#93C5FD', icon: '⛽', side: 'depense' },
  ]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([
    'Perso',
    'Rachid',
    'Ibis',
    'GeoWay',
    'Gare bourgoin',
    'Jaouad',
    'Hôtel',
    'Aladin',
    'Ads',
    'Domaine des séquoia',
    'Duplex',
  ]);

  const [addModal, setAddModal] = useState(false);
  const [editCatModal, setEditCatModal] = useState(false);
  const [calcModal, setCalcModal] = useState(false);
  const prevTvaRateRef = useRef<number>(tvaRate);
  const skipTvaSyncRef = useRef(false);

  const [formSide, setFormSide] = useState<Side>('revenu');
  const [amountMode, setAmountMode] = useState<'HT' | 'TTC'>('TTC');
  const [amountInput, setAmountInput] = useState<string>('');
  const [tvaRate, setTvaRate] = useState<number>(20);
  const [chosenCat, setChosenCat] = useState<string>('');
  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [quickDate, setQuickDate] = useState<'today' | 'yesterday' | 'calendar' | null>(
    null,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [photoPlaceholders, setPhotoPlaceholders] = useState<string[]>([]);

  const [catDraft, setCatDraft] = useState<{
    id?: string;
    name: string;
    color: string;
    icon: string;
    side: Side;
  }>({
    name: '',
    color: '#2BB5FF',
    icon: '💰',
    side: 'revenu',
  });
  const ICONS = [
    '🚕',
    '🚗',
    '🚙',
    '🛺',
    '💳',
    '💶',
    '💰',
    '📈',
    '📉',
    '🧾',
    '🏦',
    '🏨',
    '🛫',
    '🛬',
    '🏥',
    '🅿️',
    '⛽',
    '🛢️',
    '🧮',
    '📌',
    '⭐',
  ];
  const COLOR_PALETTE = [
    '#2BB5FF',
    '#5CE1E6',
    '#FDBA74',
    '#86EFAC',
    '#FCA5A5',
    '#93C5FD',
    '#E879F9',
    '#F59E0B',
    '#34D399',
    '#F87171',
    '#60A5FA',
    '#F472B6',
    '#A3E635',
    '#22D3EE',
    '#C084FC',
  ];

  /* Period range */
  const [fromDate, toDate] = useMemo((): [Date, Date] => {
    let a: Date, b: Date;
    if (period === 'day') {
      a = startOfDay(refDate);
      b = endOfDay(refDate);
    } else if (period === 'week') {
      a = startOfWeek(refDate);
      b = endOfWeek(refDate);
    } else if (period === 'month') {
      a = startOfMonth(refDate);
      b = endOfMonth(refDate);
    } else if (period === 'year') {
      a = startOfYear(refDate);
      b = endOfYear(refDate);
    } else {
      a = startOfDay(rangeStart || refDate);
      b = endOfDay(rangeEnd || refDate);
    }
    return [a, b];
  }, [period, refDate, rangeStart, rangeEnd]);

  const filteredTxs = useMemo(
    () => txs.filter((t) => t.side === side && inRange(t.dateISO, fromDate, toDate)),
    [txs, side, fromDate, toDate],
  );
  const totalsAll = useMemo(() => aggregateTotals(txs), [txs]);
  const totalsCurrent = useMemo(() => aggregateTotals(filteredTxs), [filteredTxs]);
  const displayTotalAll = showTTC ? totalsAll.ttc : totalsAll.ht;
  const displayTotalCurrent = showTTC ? totalsCurrent.ttc : totalsCurrent.ht;

  const perCategory = useMemo(() => {
    const map: Record<
      string,
      { cat: Category; sumHT: number; sumTTC: number }
    > = {};
    for (const t of filteredTxs) {
      const cat = categories.find((c) => c.id === t.categoryId);
      if (!cat) continue;
      if (!map[t.categoryId]) map[t.categoryId] = { cat, sumHT: 0, sumTTC: 0 };
      map[t.categoryId].sumHT += t.amountHT;
      map[t.categoryId].sumTTC += t.amountTTC;
    }
    return Object.values(map).sort((a, b) => b.sumTTC - a.sumTTC);
  }, [filteredTxs, categories]);
  const currentGoalConfig = side === 'revenu' ? goalRevenue : goalExpense;
  const currentGoalMonthly = showTTC ? currentGoalConfig.ttc : currentGoalConfig.ht;
  const periodGoalValue = useMemo(
    () => computeGoalForPeriod(currentGoalMonthly, period, refDate, fromDate, toDate),
    [currentGoalMonthly, period, refDate, fromDate, toDate],
  );
  const goalRemaining = Math.max(periodGoalValue - displayTotalCurrent, 0);
  const goalProgressPct = periodGoalValue > 0 ? Math.min(1, displayTotalCurrent / periodGoalValue) : 0;
  const openGoalEditModal = () => {
    setGoalEditTarget({ side, mode: showTTC ? 'TTC' : 'HT' });
    const config = side === 'revenu' ? goalRevenue : goalExpense;
    const baseValue = showTTC ? config.ttc : config.ht;
    setGoalEditValue(formatAmountInputValue(baseValue));
    setGoalEditVisible(true);
  };

  const handleGoalEditSave = () => {
    const normalized = goalEditValue.replace(',', '.').trim();
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      appAlert.show('Montant invalide', 'Merci de saisir un montant mensuel positif.');
      return;
    }
    const key = goalEditTarget.mode === 'HT' ? 'ht' : 'ttc';
    if (goalEditTarget.side === 'revenu') {
      setGoalRevenue((prev) => ({ ...prev, [key]: parsed }));
    } else {
      setGoalExpense((prev) => ({ ...prev, [key]: parsed }));
    }
    setGoalEditVisible(false);
  };

  /* 75% goal alert */
  useEffect(() => {
    const goalBase = side === 'revenu' ? goalRevenue.ttc : goalExpense.ttc;
    if (goalBase > 0) {
      const pct = totalsCurrent.ttc / goalBase;
      if (pct >= 0.75 && pct < 0.76) {
        appAlert.show('Supprimer la balise ?', `"${t}" sera supprim�e de la liste.`, {
                              actions: [
                                { text: 'Annuler', variant: 'ghost' },
                                {
                                  text: 'Supprimer',
                                  onPress: () => {
                                    setKnownTags((prev) =>
                                      prev.filter((x) => x !== t),
                                    );
                                    setTags((prev) =>
                                      prev.filter((x) => x !== t),
                                    );
                                  },
                                },
                              ],
                            });
                                    setTags((prev) =>
                                      prev.filter((x) => x !== t),
                                    );
                                  },
                                },
                              ],
                            );
                          }}
                          style={styles.chipDel}
                        >
                          <X
                            size={12}
                            color={active ? C.darkInk : C.textMut}
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.txBlock}>
                {/* Commentaire + photos placeholder */}
                <Text style={styles.label}>Commentaire</Text>
                <TextInput
                  placeholder="Note (optionnel)"
                  placeholderTextColor={C.textMut}
                  value={note}
                  onChangeText={setNote}
                  style={[styles.input, { height: 70 }]}
                  multiline
                />
                <Text style={styles.label}>Photos (ticket, reçu.)</Text>
                <View style={styles.photosRow}>
                  {[0, 1, 2].map((i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.photoSlot}
                      onPress={() =>
                        appAlert.show('Photo', "S�lection d'image (placeholder).")
                      }
                    >
                      <Text style={{ color: C.textMut, fontSize: 22 }}>+</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, styles.selectedTurq]}
                  onPress={addTx}
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      styles.selectedTextDark,
                    ]}
                  >
                    Ajouter
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAddModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --------- MODAL EDIT/ADD CATEGORY --------- */}
      <Modal visible={editCatModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>
                {catDraft.id ? 'Modifier catégorie' : 'Créer catégorie'}
              </Text>

              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() =>
                    setCatDraft((p) => ({ ...p, side: 'depense' }))
                  }
                  style={[
                    styles.pill,
                    catDraft.side === 'depense' && styles.selectedTurq,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      catDraft.side === 'depense' && styles.selectedTextDark,
                    ]}
                  >
                    Dépense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    setCatDraft((p) => ({ ...p, side: 'revenu' }))
                  }
                  style={[
                    styles.pill,
                    catDraft.side === 'revenu' && styles.selectedTurq,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      catDraft.side === 'revenu' && styles.selectedTextDark,
                    ]}
                  >
                    Revenu
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Nom de la catégorie"
                placeholderTextColor={C.textMut}
                value={catDraft.name}
                onChangeText={(t) =>
                  setCatDraft((p) => ({ ...p, name: t }))
                }
                style={styles.input}
              />
              <Text style={styles.label}>Icône</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 6 }}
              >
                {ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconPick,
                      catDraft.icon === ic && styles.selectedTurq,
                    ]}
                    onPress={() =>
                      setCatDraft((p) => ({ ...p, icon: ic }))
                    }
                  >
                    <Text
                      style={[
                        { fontSize: 18 },
                        catDraft.icon === ic
                          ? {
                              color: C.darkInk,
                              fontWeight: '900',
                            }
                          : { color: C.text },
                      ]}
                    >
                      {ic}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Couleur</Text>
              <View style={styles.colorsRow}>
                {COLOR_PALETTE.map((col) => (
                  <TouchableOpacity
                    key={col}
                    onPress={() =>
                      setCatDraft((p) => ({ ...p, color: col }))
                    }
                    style={[
                      styles.colorDot,
                      { backgroundColor: col },
                      catDraft.color === col && styles.colorDotActive,
                    ]}
                  />
                ))}
              </View>
              <TextInput
                placeholder="Ou code HEX (#12ABEF)"
                placeholderTextColor={C.textMut}
                value={catDraft.color}
                onChangeText={(t) =>
                  setCatDraft((p) => ({ ...p, color: t }))
                }
                style={styles.input}
              />

              <View style={styles.modalButtonsRow}>
                {catDraft.id && (
                  <TouchableOpacity
                    style={[
                      styles.cancelBtn,
                      { borderColor: C.danger, borderWidth: 1 },
                    ]}
                    onPress={() => {
                      deleteCategory(catDraft.id!);
                      setEditCatModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.cancelBtnText,
                        { color: C.danger },
                      ]}
                    >
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveBtn, styles.selectedTurq]}
                  onPress={saveCategory}
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      styles.selectedTextDark,
                    ]}
                  >
                    {catDraft.id ? 'Sauvegarder' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditCatModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 180, marginTop: 8 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.catManageRow}
                    onPress={() => setCatDraft({ ...c })}
                  >
                    <View
                      style={[
                        styles.catIcon,
                        { backgroundColor: `${c.color}33` },
                      ]}
                    >
                      <Text style={styles.catIconText}>{c.icon}</Text>
                    </View>
                    <Text
                      style={[styles.catName, { flex: 1 }]}
                      numberOfLines={1}
                    >
                      {c.name}{' '}
                      <Text style={{ color: C.textMut }}>
                        ({c.side})
                      </Text>
                    </Text>
                    <Edit2 size={16} color={C.accent2} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --------- MODAL TX DATE CALENDAR (turquoise) --------- */}
      <Modal visible={txDateModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Date de la transaction</Text>
              <CalendarSingle
                value={dateObj}
                onChange={(d) => setDateObj(d)}
                selectedColor={C.accent2}
              />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, styles.selectedTurq]}
                  onPress={() => setTxDateModal(false)}
                >
                  <Text
                    style={[
                      styles.saveBtnText,
                      styles.selectedTextDark,
                    ]}
                  >
                    Valider
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setTxDateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* --------- MODAL MINI CALCULATRICE (plein écran opaque) --------- */}
      <Modal
        visible={calcModal}
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
        animationType="slide"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.calcFullScreenShell,
              { paddingTop: safeTop, paddingBottom: safeBottom },
            ]}
          >
            <View style={styles.calcHeaderRow}>
              <TouchableOpacity onPress={() => setCalcModal(false)} style={styles.calcCloseBtn}>
                <X size={22} color={C.text} />
              </TouchableOpacity>
            </View>
            <TvaCalculator
              initialMode={amountMode === 'HT' ? 'ht' : 'ttc'}
              initialAmount={parseAmountInput()}
              initialRate={tvaRate}
              onApply={handleCalcApply}
              onClose={() => setCalcModal(false)}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: 'center',
  },
  totalLabel: { color: C.textMut, fontSize: 14, fontWeight: '600' },
  totalValue: { color: C.text, fontSize: 30, fontWeight: '800' },

  sideTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  sideTab: {
    backgroundColor: C.card2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADII.button,
  },
  sideTabText: { color: C.text, fontWeight: '700' },

  periodTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  periodBtn: {
    backgroundColor: C.card2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.button,
    marginBottom: 8,
  },
  periodBtnText: { color: C.text, fontWeight: '700', fontSize: 12 },

  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  arrowBtn: { backgroundColor: C.card2, padding: 8, borderRadius: RADII.button },
  periodText: { color: C.text, fontWeight: '700' },
  rangeTrigger: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 10,
    borderRadius: RADII.button,
    alignItems: 'center',
    backgroundColor: C.card2,
  },
  rangeTriggerText: { color: C.text, fontWeight: '700' },

  chartCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: { color: C.text, fontWeight: '800', fontSize: 16 },
  chartToggle: { color: C.accent2, fontWeight: '700' },

  goalWrap: { marginTop: 8 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  goalHeaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: C.accent2,
  },
  goalEditBtnText: { color: C.accent2, fontWeight: '700' },
  goalLabel: { color: C.text, fontWeight: '700' },
  goalBar: {
    height: 12,
    borderRadius: RADII.button,
    backgroundColor: C.card2,
    marginTop: 8,
    overflow: 'hidden',
  },
  goalFill: { height: '100%', backgroundColor: C.accent2 },
  goalPct: { color: C.textMut, marginTop: 6 },
  goalSub: { color: C.textMut, fontSize: 12, marginTop: 4 },

  htttcRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  htttcBtn: {
    backgroundColor: C.card2,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADII.button,
  },
  htttcText: { color: C.text, fontWeight: '700' },

  /* États sélectionnés TURQUOISE (partout) */
  selectedTurq: { backgroundColor: C.accent2 },
  selectedTextDark: { color: C.darkInk, fontWeight: '900' },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: RADII.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    ...SHADOW.card,
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catIconText: { color: C.text, fontSize: 16 },
  catName: { color: C.text, fontWeight: '700' },
  catPct: { color: C.textMut, fontSize: 12 },
  catAmount: { color: C.text, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  modalBox: {
    width: '100%',
    backgroundColor: C.card,
    borderRadius: RADII.card,
    padding: 16,
    maxWidth: 520,
    borderWidth: 1,
    borderColor: C.border,
  },
  calcFullScreenShell: {
    flex: 1,
    width: '100%',
    backgroundColor: C.card,
    paddingHorizontal: 18,
  },
  calcHeaderRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  calcCloseBtn: {
    padding: 10,
    borderRadius: RADII.button,
    backgroundColor: C.card2,
  },
  txBlock: {
    backgroundColor: C.card,
    borderRadius: RADII.card,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.card2,
  },
  txModalBox: {
    backgroundColor: C.card2,
    borderWidth: 0,
    maxHeight: '96%',
    width: '98%',
    alignSelf: 'center',
    flex: 1,
  },
  txModalContent: {
    paddingBottom: 32,
  },

  modalTitle: { color: C.text, fontWeight: '800', fontSize: 18, marginBottom: 8 },

  row: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  pill: {
    backgroundColor: C.card2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADII.button,
  },
  pillText: { color: C.text, fontWeight: '700' },

  amountRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: C.card2,
    color: C.text,
    borderRadius: RADII.input,
    padding: 10,
    marginTop: 8,
  },

  pillMini: {
    backgroundColor: C.card2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.button,
    marginTop: 8,
  },
  pillMiniText: { color: C.text, fontWeight: '800' },
  iconBtn: { padding: 8, borderRadius: 8, marginTop: 8 },

  tvaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  tvaBtn: {
    backgroundColor: C.card2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADII.button,
  },
  tvaText: { color: C.text, fontWeight: '800' },

  label: {
    color: C.textMut,
    marginTop: 14,
    marginBottom: 6,
    fontWeight: '700',
  },
  catPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  catPick: {
    backgroundColor: C.card2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  catPickText: { color: C.text, fontWeight: '700', maxWidth: 100 },

  smallAction: { marginLeft: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  smallActionText: { color: C.text, fontWeight: '800' },

  /* Boutons de date : mêmes styles que les autres pills (harmonisés) */
  quickDatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  quickBtn: {
    backgroundColor: C.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADII.button,
  },
  quickText: { color: C.text, fontWeight: '700' },
  dateDisplay: {
    backgroundColor: C.card2,
    borderRadius: RADII.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  dateDisplayText: { color: C.text, fontWeight: '700' },

  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  goalEditHint: { color: C.textMut, fontSize: 12, marginTop: 6 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    backgroundColor: C.card2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: { color: C.text },
  chipDel: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  photosRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  photoSlot: {
    width: 80,
    height: 80,
    backgroundColor: C.card2,
    borderRadius: RADII.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADII.button,
    backgroundColor: C.accent1,
    alignItems: 'center',
  },
  saveBtnText: { color: C.darkInk, fontWeight: '900' },
  cancelBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADII.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { color: C.textMut },

  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: C.text },

  iconPick: {
    backgroundColor: C.card2,
    padding: 8,
    borderRadius: RADII.button,
    marginRight: 6,
  },
  catManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomColor: C.border,
    borderBottomWidth: 1,
    marginTop: 4,
  },

});
