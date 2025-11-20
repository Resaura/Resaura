import { supabase } from '@/lib/supabase';

export type Reservation = {
  id: string;
  created_at: string;
  user_id: string;
  client_first: string;
  client_last: string;
  phone: string;
  pickup: string;
  dropoff: string;
  datetime: string;
  passengers?: number | null;
  luggage?: number | null;
  child_seat?: boolean | null;
  flight_no?: string | null;
  train_no?: string | null;
  transport_kind?: 'none' | 'flight' | 'train' | null;
  note_driver?: string | null;
  note_client?: string | null;
  distance_km?: number | null;
  duration_min?: number | null;
  approach_duration_min?: number | null;
  ride_duration_min?: number | null;
  return_duration_min?: number | null;
  price_est?: number | null;
  payment_mode?: 'cash'|'card'|'transfer'|'other'|null;
  status: 'a_venir'|'en_cours'|'terminee'|'annulee'|'no_show';
};

export type ReservationCreate = Omit<Reservation, 'id'|'created_at'|'user_id'|'status'> & {
  status?: Reservation['status'];
};
export type ReservationUpdate = Partial<Omit<ReservationCreate, 'datetime'>> & { datetime?: string };

export type ListParams = {
  q?: string;
  status?: Reservation['status'];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

const STATUS_VALUES: Reservation['status'][] = ['a_venir', 'en_cours', 'terminee', 'annulee', 'no_show'];
const STATUS_FILTER_ALIASES: Record<Reservation['status'], string[]> = {
  a_venir: ['a_venir'],
  en_cours: ['en_cours', 'en cours', 'encours'],
  terminee: ['terminee', 'terminée', 'terminé', 'terminer', 'Terminee', 'Terminée', 'Terminé', 'Terminer'],
  annulee: ['annulee', 'annulée', 'Annulee', 'Annulée', 'annule'],
  no_show: ['no_show', 'no-show', 'noshow', 'No-show'],
};

const stripDiacritics = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeStatusValue = (value?: string | null): Reservation['status'] => {
  if (!value) return 'a_venir';
  const sanitized = stripDiacritics(value).replace(/[\s-]+/g, '_').toLowerCase();
  if (sanitized.includes('avenir')) return 'a_venir';
  if (sanitized.includes('cours')) return 'en_cours';
  if (sanitized.includes('termine')) return 'terminee';
  if (sanitized.includes('annul')) return 'annulee';
  if (sanitized.includes('show')) return 'no_show';
  return STATUS_VALUES.find((candidate) => candidate === sanitized) ?? 'a_venir';
};

export async function listReservations(params: ListParams) {
  const {
    q, status, from, to,
    page = 0, pageSize = 25
  } = params;

  let query = supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .order('datetime', { ascending: true });

  if (status) {
    const aliases = STATUS_FILTER_ALIASES[status] ?? [status];
    const unique = Array.from(new Set(aliases));
    query = unique.length === 1
      ? query.eq('status', unique[0])
      : query.in('status', unique);
  }
  if (from) query = query.gte('datetime', from);
  if (to) query = query.lte('datetime', to);

  if (q) {
    // Recherche pro : nom + téléphone + adresses
    const normalizedPhone = q.replace(/[^\d+]/g, '');
    const fragments = [
      `client_last.ilike.%${q.toUpperCase()}%`,
      `client_first.ilike.%${q}%`,
      `pickup.ilike.%${q}%`,
      `dropoff.ilike.%${q}%`,
    ];
    if (normalizedPhone) {
      fragments.push(`phone.ilike.%${normalizedPhone}%`);
    }
    query = query.or(fragments.join(','));
  }

  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;
  query = query.range(fromIdx, toIdx);

  const { data, error, count } = await query;
  if (error) {
    console.log('[reservations.list] error', error);
    return { items: [] as Reservation[], total: 0 };
  }
  const rows = ((data as Reservation[]) ?? []).map((row) => ({
    ...row,
    status: normalizeStatusValue(row.status),
  }));
  return { items: rows, total: count ?? 0 };
}

export async function createReservation(payload: ReservationCreate) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) { return false; }
  const row = {
    ...payload,
    user_id: user.id,
    status: normalizeStatusValue(payload.status),
  };
  const { error } = await supabase.from('reservations').insert(row);
  if (error) { console.log('[reservations.create] error', error); return false; }
  return true;
}

export async function updateReservation(id: string, patch: ReservationUpdate) {
  const { error } = await supabase.from('reservations').update(patch).eq('id', id);
  if (error) { console.log('[reservations.update] error', error); return false; }
  return true;
}

export async function removeReservation(id: string) {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) { console.log('[reservations.remove] error', error); return false; }
  return true;
}

export async function transitionReservation(id: string, next: Reservation['status']) {
  const { error } = await supabase.from('reservations').update({ status: normalizeStatusValue(next) }).eq('id', id);
  if (error) { console.log('[reservations.transition] error', error); return false; }
  return true;
}
