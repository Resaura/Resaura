// app/(tabs)/bookings.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, Platform, Share, LayoutAnimation, UIManager, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import { listReservations, createReservation, updateReservation, removeReservation, transitionReservation, type Reservation, type ReservationCreate, type ReservationUpdate, ListParams } from '@/lib/reservations.service';
import { useAppAlert } from '@/contexts/AlertContext';
import CalendarSingle from '@/components/CalendarSingle';
import TimePicker from '@/components/TimePicker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Statuts normalisés */
const STATUSES = [
  { key: 'a_venir', label: 'À venir' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'terminee', label: 'Terminée' },
  { key: 'annulee', label: 'Annulée' },
  { key: 'no_show', label: 'No-show' },
] as const;
type StatusKey = typeof STATUSES[number]['key'];

type DateFilter = 'all' | 'today' | 'week' | 'custom';

export default function BookingsScreen() {
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusKey | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
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
    payment_mode: null as string|null,
  });

  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);

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
      alert.show('Erreur', "Impossible de charger les réservations.");
    } finally {
      setIsLoading(false);
    }
  }, [query, status, computedDateRange, page]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(0);
    try { await load(true); }
    finally { setIsRefreshing(false); }
  }, [load]);

  useFocusEffect(useCallback(() => {
    setPage(0);
    load(true);
  }, [query, status, dateFilter, customFrom, customTo]));

  useEffect(() => {
    if (page > 0) load(false);
  }, [page]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      client_first: '',
      client_last: '',
      phone: '',
      pickup: '',
      dropoff: '',
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
      payment_mode: null,
    });
    setFormDate(new Date());
    setFormTimeHHMM(new Date().toTimeString().slice(0,5));
    setModalOpen(true);
  };

  const openEdit = (item: Reservation) => {
    setEditing(item);
    setForm({
      client_first: item.client_first,
      client_last: item.client_last,
      phone: item.phone,
      pickup: item.pickup,
      dropoff: item.dropoff,
      passengers: item.passengers ?? 1,
      luggage: item.luggage ?? 0,
      child_seat: !!item.child_seat,
      flight_no: item.flight_no ?? null,
      train_no: (item as any).train_no ?? null,
      transport_kind: item.flight_no ? 'flight' : ((item as any).train_no ? 'train' : 'none'),
      note_client: item.note_client ?? '',
      payment_mode: (item as any).payment_mode ?? null,
      price_est: item.price_est ?? null,
      distance_km: item.distance_km ?? null,
      duration_min: item.duration_min ?? null,
    });
    const d = new Date(item.datetime);
    setFormDate(d);
    setFormTimeHHMM(d.toTimeString().slice(0,5));
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveForm = async () => {
    if (!form.client_first || !form.client_last || !form.phone || !form.pickup || !form.dropoff) {
      alert.show('Champs manquants', 'Merci de remplir tous les champs requis.');
      return;
    }
    // combine date + time
    const [h, m] = formTimeHHMM.split(':').map(n=>parseInt(n,10));
    const dt = new Date(formDate);
    dt.setHours(h||0, m||0, 0, 0);

    const payload = {
      client_first: form.client_first.trim(),
      client_last: form.client_last.trim().toUpperCase(),
      phone: form.phone.trim(),
      pickup: form.pickup.trim(),
      dropoff: form.dropoff.trim(),
      datetime: dt.toISOString(),
      passengers: Number(form.passengers) || 1,
      luggage: Number(form.luggage) || 0,
      child_seat: !!form.child_seat,
      flight_no: form.transport_kind === 'flight' ? (form.flight_no || '').trim() || null : null,
      train_no: form.transport_kind === 'train' ? (form.train_no || '').trim() || null : null,
      note_client: (form.note_client || '').trim() || null,
      payment_mode: form.payment_mode || null,
      price_est: form.price_est != null ? Number(form.price_est) : null,
      distance_km: form.distance_km != null ? Number(form.distance_km) : null,
      duration_min: form.duration_min != null ? Number(form.duration_min) : null,
    };

    try {
      const ok = editing
        ? await updateReservation(editing.id, payload as ReservationUpdate)
        : await createReservation(payload as ReservationCreate);

      if (!ok) { alert.show('Erreur', editing ? 'La mise à jour a échoué.' : 'La création a échoué.'); return; }
      closeModal();
      refresh();
    } catch {
      alert.show('Erreur', 'Une erreur est survenue lors de la sauvegarde.');
    }
  };

  const onDelete = async (item: Reservation) => {
    alert.confirm('Supprimer ?', 'Cette action est définitive.', async () => {
      const ok = await removeReservation(item.id);
      if (!ok) { alert.show('Erreur', 'Suppression échouée'); return; }
      refresh();
    });
  };

  const onTransition = async (item: Reservation, next: StatusKey) => {
    const title =
      next === 'en_cours' ? 'Démarrer cette course ?' :
      next === 'terminee' ? 'Terminer cette course ?' :
      next === 'annulee' ? 'Annuler cette course ?' :
      'Marquer en no-show ?';
    alert.confirm(title, '', async () => {
      const ok = await transitionReservation(item.id, next);
      if (!ok) { alert.show('Erreur', 'Transition échouée'); return; }
      refresh();
    });
  };

  const exportCSV = async () => {
    const header = [
      'Date/Heure','Client','Téléphone','Adresse départ','Adresse arrivée','Passagers','Bagages','Siège enfant','Statut','Vol','Train','Prix estimé','Distance(km)','Durée(min)'
    ];
    const rows = data.map(r => ([
      r.datetime,
      `${r.client_last} ${r.client_first}`,
      r.phone,
      r.pickup,
      r.dropoff,
      r.passengers ?? 1,
      r.luggage ?? 0,
      r.child_seat ? 'oui' : 'non',
      r.status,
      r.flight_no ?? '',
      (r as any).train_no ?? '',
      r.price_est ?? '',
      r.distance_km ?? '',
      r.duration_min ?? ''
    ].join(';')));
    const csv = [header.join(';'), ...rows].join('\n');
    await Share.share({ message: csv });
  };

  const renderItem = ({ item }: { item: Reservation }) => (
    <Pressable style={styles.card} onPress={() => openEdit(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.client_last} {item.client_first}</Text>
        <Text style={styles.cardTime}>{new Date(item.datetime).toLocaleString()}</Text>
      </View>
      <Text style={styles.cardLine}><Text style={styles.cardLabel}>Départ :</Text> {item.pickup}</Text>
      <Text style={styles.cardLine}><Text style={styles.cardLabel}>Arrivée :</Text> {item.dropoff}</Text>
      <View style={styles.badgesRow}>
        <Badge text={`${item.passengers ?? 1} pax`} />
        {!!item.luggage && <Badge text={`${item.luggage} bag.`} />}
        {item.child_seat && <Badge text="Siège enfant" />}
        {!!item.flight_no && <Badge text={`Vol ${item.flight_no}`} />}
        {!!(item as any).train_no && <Badge text={`Train ${(item as any).train_no}`} />}
        <StatusBadge status={item.status as StatusKey} />
      </View>
      <View style={styles.actionsRow}>
        <GhostButton label="Démarrer" onPress={() => onTransition(item, 'en_cours')} />
        <GhostButton label="Terminer" onPress={() => onTransition(item, 'terminee')} />
        <GhostButton label="Annuler" onPress={() => onTransition(item, 'annulee')} />
        <GhostButton label="Supprimer" onPress={() => onDelete(item)} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Recherche (nom, téléphone, adresse)"
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

      {/* Filtres statut — même hauteur que les toggles date */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {STATUSES.map(s => (
          <Chip
            key={s.key}
            label={s.label}
            selected={status === s.key}
            onPress={() => { setStatus(prev => prev === s.key ? undefined : s.key); setPage(0); }}
          />
        ))}
      </ScrollView>

      {/* Filtres date */}
      <View style={styles.dateRow}>
        <Toggle label="Tous" selected={dateFilter === 'all'} onPress={() => setDateFilter('all')} />
        <Toggle label="Aujourd’hui" selected={dateFilter === 'today'} onPress={() => setDateFilter('today')} />
        <Toggle label="Cette semaine" selected={dateFilter === 'week'} onPress={() => setDateFilter('week')} />
        <Toggle label="Dates" selected={dateFilter === 'custom'} onPress={() => setDateFilter('custom')} />
      </View>
      {dateFilter === 'custom' && (
        <View style={styles.customDates}>
          <TextInput placeholder="Du (YYYY-MM-DD)" placeholderTextColor={COLORS.textMuted} value={customFrom} onChangeText={setCustomFrom} style={[styles.input, { flex: 1 }]} />
          <TextInput placeholder="Au (YYYY-MM-DD)" placeholderTextColor={COLORS.textMuted} value={customTo} onChangeText={setCustomTo} style={[styles.input, { flex: 1, marginLeft: 8 }]} />
          <Pressable onPress={() => { setPage(0); load(true); }} style={[styles.ctaSmall, { marginLeft: 8 }]}>
            <Text style={styles.ctaSmallText}>OK</Text>
          </Pressable>
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(120, insets.bottom + 80) }}
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
            {isLoading && <Text style={{ color: COLORS.textMuted }}>Chargement…</Text>}
            {total != null && data.length >= total && <Text style={{ color: COLORS.textMuted }}>Fin de liste</Text>}
          </View>
        }
      />

      {/* Boutons flottants */}
      <View style={styles.fabColumn}>
        <Pressable onPress={exportCSV} style={styles.fabGhost}><Text style={styles.fabGhostText}>Exporter CSV</Text></Pressable>
        <Pressable onPress={openCreate} style={styles.fab}><Text style={styles.fabText}>＋</Text></Pressable>
      </View>

      {/* Modale create/edit */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal} transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing ? 'Modifier la réservation' : 'Nouvelle réservation'}</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <Row>
                <Input label="Nom" value={form.client_last} onChangeText={(v)=>setForm(f=>({...f, client_last:v}))} half />
                <Input label="Prénom" value={form.client_first} onChangeText={(v)=>setForm(f=>({...f, client_first:v}))} half />
              </Row>
              <Input label="Téléphone" value={form.phone} onChangeText={(v)=>setForm(f=>({...f, phone:v}))} keyboardType="phone-pad" />
              <Input label="Adresse de départ" value={form.pickup} onChangeText={(v)=>setForm(f=>({...f, pickup:v}))} />
              <Input label="Adresse d’arrivée" value={form.dropoff} onChangeText={(v)=>setForm(f=>({...f, dropoff:v}))} />

              <Row>
                <Pressable onPress={()=>setDateModal(true)} style={[styles.inputLike, { flex:1 }]}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.inputLikeText}>
                    {formDate.toLocaleDateString()}
                  </Text>
                </Pressable>
                <View style={{ width: 8 }} />
                <Pressable onPress={()=>setTimeModal(true)} style={[styles.inputLike, { flex:1 }]}>
                  <Text style={styles.label}>Heure</Text>
                  <Text style={styles.inputLikeText}>{formTimeHHMM}</Text>
                </Pressable>
              </Row>

              <Row>
                <Input label="Passagers" value={String(form.passengers)} onChangeText={(v)=>setForm(f=>({...f, passengers:Number(v)||1}))} keyboardType="number-pad" half />
                <Input label="Bagages" value={String(form.luggage)} onChangeText={(v)=>setForm(f=>({...f, luggage:Number(v)||0}))} keyboardType="number-pad" half />
              </Row>

              <Row>
                <Toggle small label="Siège enfant" selected={!!form.child_seat} onPress={()=>setForm(f=>({...f, child_seat:!f.child_seat}))} />
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
              <Pressable style={styles.ghostBtn} onPress={closeModal}><Text style={styles.ghostBtnText}>Annuler</Text></Pressable>
              <Pressable style={styles.cta} onPress={saveForm}><Text style={styles.ctaText}>{editing ? 'Enregistrer' : 'Créer'}</Text></Pressable>
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
    </View>
  );
}

/* ——— UI atoms ——— */

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}
function StatusBadge({ status }: { status: StatusKey }) {
  const label = STATUSES.find(s=>s.key===status)?.label ?? status;
  return (
    <View style={[styles.badge, { borderColor: COLORS.azure }]}>
      <Text style={[styles.badgeText, { color: COLORS.azure }]}>{label}</Text>
    </View>
  );
}
function GhostButton({ label, onPress }: { label: string; onPress: ()=>void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghostBtnSm}>
      <Text style={styles.ghostBtnSmText}>{label}</Text>
    </Pressable>
  );
}
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: ()=>void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, selected ? styles.toggleSelected : styles.toggleGhost]}>
      <Text style={[styles.toggleText, selected ? styles.toggleTextSelected : styles.toggleTextGhost]}>{label}</Text>
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
function Input({ label, half, multiline, ...props }: any) {
  return (
    <View style={{ marginBottom: 12, flex: half ? 1 : undefined }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} multiline={multiline} placeholderTextColor={COLORS.textMuted} style={[styles.input, multiline && { height: 90 }]} />
    </View>
  );
}

/* ——— styles ——— */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8 },
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

  ctaSmall: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  ctaSmallText: { color: '#003642', fontWeight: '700' },

  // Tous les boutons "chips/toggles" partagent la même hauteur
  chipsRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  dateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  toggle: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADII.button, borderWidth: 1, height: 42, alignItems: 'center', justifyContent: 'center' },
  toggleSmall: { paddingVertical: 8, height: 38 },
  toggleSelected: { backgroundColor: COLORS.azure, borderColor: COLORS.azure },
  toggleGhost: { backgroundColor: 'transparent', borderColor: COLORS.outline },
  toggleText: { fontWeight: '800' },
  toggleTextSelected: { color: '#003642' },
  toggleTextGhost: { color: COLORS.text },

  customDates: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },

  card: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: RADII.card,
    padding: 12,
    marginBottom: 12,
    ...SHADOW.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 16 },
  cardTime: { color: COLORS.textMuted },
  cardLine: { color: COLORS.text, marginTop: 2 },
  cardLabel: { color: COLORS.textMuted, fontWeight: '700' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  badge: { borderRadius: RADII.button, borderWidth: 1, borderColor: COLORS.inputBorder, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: COLORS.text },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  ghostBtnSm: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtnSmText: { color: COLORS.text },

  fabColumn: { position: 'absolute', right: 16, bottom: 24, alignItems: 'flex-end', gap: 8 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.azure, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: '#003642', fontWeight: '900', fontSize: 28, lineHeight: 28 },
  fabGhost: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'transparent' },
  fabGhostText: { color: COLORS.text, fontWeight: '700' },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADII.card, borderTopRightRadius: RADII.card, borderColor: COLORS.inputBorder, borderWidth: 1, padding: 16, maxHeight: '90%' },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },

  label: { color: COLORS.text, fontWeight: '800', marginBottom: 6 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalBox: { width:'92%', backgroundColor:COLORS.background, borderRadius:RADII.card, borderWidth:1, borderColor:COLORS.inputBorder, padding:16 },
  modalButtonsRow: { flexDirection:'row', justifyContent:'flex-end', gap:8, marginTop:12 },

  cta: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ctaText: { color:'#003642', fontWeight:'800' },
  ghostBtn: { borderColor: COLORS.outline, borderWidth: 1, borderRadius: RADII.button, paddingHorizontal: 16, paddingVertical: 10 },
  ghostBtnText: { color: COLORS.text, fontWeight: '700' },
});
