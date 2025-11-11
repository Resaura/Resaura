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
  note_driver?: string | null;
  note_client?: string | null;
  distance_km?: number | null;
  duration_min?: number | null;
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

export async function listReservations(params: ListParams) {
  const {
    q, status, from, to,
    page = 0, pageSize = 25
  } = params;

  let query = supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .order('datetime', { ascending: true });

  if (status) query = query.eq('status', status);
  if (from) query = query.gte('datetime', from);
  if (to) query = query.lte('datetime', to);

  if (q) {
    // Recherche pro : client_last normalisé en UPPER, + pickup/dropoff
    query = query.or(`client_last.ilike.%${q.toUpperCase()}%,client_first.ilike.%${q}%,pickup.ilike.%${q}%,dropoff.ilike.%${q}%`);
  }

  const fromIdx = page * pageSize;
  const toIdx = fromIdx + pageSize - 1;
  query = query.range(fromIdx, toIdx);

  const { data, error, count } = await query;
  if (error) {
    console.log('[reservations.list] error', error);
    return { items: [] as Reservation[], total: 0 };
  }
  return { items: (data as Reservation[]) ?? [], total: count ?? 0 };
}

export async function createReservation(payload: ReservationCreate) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) { return false; }
  const row = { ...payload, user_id: user.id, status: payload.status ?? 'a_venir' };
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
  const { error } = await supabase.from('reservations').update({ status: next }).eq('id', id);
  if (error) { console.log('[reservations.transition] error', error); return false; }
  return true;
}
