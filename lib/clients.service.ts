// lib/clients.service.ts
import { supabase } from '@/lib/supabase';

export const PHONE_E164_REGEX = /^\+[1-9]\d{7,14}$/;

export class ClientPortfolioUnavailableError extends Error {
  constructor(message = 'Le portefeuille clients est indisponible.') {
    super(message);
    this.name = 'ClientPortfolioUnavailableError';
  }
}

export type ClientListFilters = {
  recents: boolean;
  frequent: boolean;
  notes: boolean;
  vip: boolean;
  blacklist: boolean;
};

export type ClientSortOption = 'lastRide' | 'totalCourses' | 'alphaAsc' | 'alphaDesc';

export type FavoriteAddresses = {
  home: string | null;
  work: string | null;
  airport: string | null;
};

export type ClientCursor = {
  id: string;
  created_at: string;
};

export type ClientHistoryCursor = {
  id: string;
  datetime: string;
};

export type ClientListItem = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  tags: string[] | null;
  favorite_addresses: FavoriteAddresses;
  is_vip: boolean;
  is_blacklisted: boolean;
  loyalty_status: string | null;
  loyalty_points: number | null;
  opt_in_sms: boolean;
  opt_in_email: boolean;
  company_flag: boolean;
  billing_mode: string | null;
  total_courses: number;
  lifetime_value: number;
  last_reservation_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientDetail = ClientListItem & {
  communication_prefs?: Record<string, unknown> | null;
};

export type ClientHistoryEntry = {
  id: string;
  datetime: string;
  pickup: string;
  dropoff: string;
  status: string;
  actual_price: number | null;
};

export type ClientHistoryResult = {
  items: ClientHistoryEntry[];
  nextCursor: ClientHistoryCursor | null;
};

export type FetchClientsParams = {
  search?: string;
  filters?: ClientListFilters;
  sort?: ClientSortOption;
  cursor?: ClientCursor | null;
  limit?: number;
};

export type FetchClientsResult = {
  items: ClientListItem[];
  nextCursor: ClientCursor | null;
};

export type ClientFormValues = {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
  is_vip: boolean;
  is_blacklisted: boolean;
  opt_in_sms: boolean;
  opt_in_email: boolean;
  company_flag: boolean;
  billing_mode: 'bord' | 'compte';
  favorite_addresses: FavoriteAddresses;
};

export type QuickCreatePayload = {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
};

type RawClientRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized?: string | null;
  email?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  favorite_addresses?: FavoriteAddresses | null;
  is_vip?: boolean | null;
  is_blacklisted?: boolean | null;
  loyalty_status?: string | null;
  loyalty_points?: number | null;
  opt_in_sms?: boolean | null;
  opt_in_email?: boolean | null;
  company_flag?: boolean | null;
  billing_mode?: string | null;
  total_courses?: number | null;
  lifetime_value?: number | null;
  last_reservation_at?: string | null;
  created_at: string;
  updated_at: string;
  communication_prefs?: Record<string, unknown> | null;
};

const DEFAULT_FILTERS: ClientListFilters = {
  recents: false,
  frequent: false,
  notes: false,
  vip: false,
  blacklist: false,
};

const DEFAULT_FETCH_LIMIT = 25;
const FREQUENT_THRESHOLD = 8;
const escapeLikeTerm = (value: string) => value.replace(/'/g, "''");

const ensureFavoriteAddresses = (value?: FavoriteAddresses | null): FavoriteAddresses => ({
  home: value?.home ?? null,
  work: value?.work ?? null,
  airport: value?.airport ?? null,
});

const mapClientRow = (row: RawClientRow): ClientListItem => ({
  id: row.id,
  user_id: row.user_id,
  first_name: row.first_name,
  last_name: row.last_name,
  phone: row.phone,
  email: row.email ?? null,
  notes: row.notes ?? null,
  tags: row.tags ?? null,
  favorite_addresses: ensureFavoriteAddresses(row.favorite_addresses),
  is_vip: Boolean(row.is_vip),
  is_blacklisted: Boolean(row.is_blacklisted),
  loyalty_status: row.loyalty_status ?? null,
  loyalty_points: row.loyalty_points ?? null,
  opt_in_sms: row.opt_in_sms ?? true,
  opt_in_email: row.opt_in_email ?? true,
  company_flag: row.company_flag ?? false,
  billing_mode: row.billing_mode ?? null,
  total_courses: row.total_courses ?? 0,
  lifetime_value: Number(row.lifetime_value ?? 0),
  last_reservation_at: row.last_reservation_at ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const withPortfolioGuard = <T>(error: { code?: string; message?: string } | null, fallback?: () => T): T => {
  if (error?.code === '42P01' || error?.message?.includes('client_portfolio')) {
    throw new ClientPortfolioUnavailableError();
  }
  if (error) {
    throw new Error(error.message || 'Erreur portefeuille clients.');
  }
  return fallback?.() as T;
};

const ensureUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Session invalide.');
  }
  return data.user;
};

export function normalizePhone(input: string) {
  const raw = input.replace(/[^\d+]/g, '');
  if (!raw) return '';

  if (raw.startsWith('+')) {
    return raw;
  }
  if (raw.startsWith('00')) {
    return `+${raw.slice(2)}`;
  }
  if (raw.startsWith('0') && raw.length === 10) {
    return `+33${raw.slice(1)}`;
  }
  if (raw.length >= 10 && !raw.startsWith('+')) {
    return `+${raw}`;
  }
  return raw;
}

export function maskPhone(phone: string) {
  const compact = phone.replace(/\s+/g, '');
  if (compact.length <= 6) return compact;
  const prefix = compact.slice(0, 4);
  const suffix = compact.slice(-2);
  const masked = '*'.repeat(Math.max(compact.length - 6, 2));
  return `${prefix}${masked}${suffix}`;
}

export function sortClientItems(items: ClientListItem[], sort: ClientSortOption): ClientListItem[] {
  const copy = [...items];
  switch (sort) {
    case 'totalCourses':
      copy.sort((a, b) => b.total_courses - a.total_courses);
      break;
    case 'alphaDesc':
      copy.sort((a, b) => {
        const aName = `${a.last_name} ${a.first_name}`.trim().toLowerCase();
        const bName = `${b.last_name} ${b.first_name}`.trim().toLowerCase();
        return bName.localeCompare(aName);
      });
      break;
    case 'alphaAsc':
      copy.sort((a, b) => {
        const aName = `${a.last_name} ${a.first_name}`.trim().toLowerCase();
        const bName = `${b.last_name} ${b.first_name}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
      break;
    case 'lastRide':
    default:
      copy.sort((a, b) => {
        const aTime = a.last_reservation_at ? new Date(a.last_reservation_at).getTime() : 0;
        const bTime = b.last_reservation_at ? new Date(b.last_reservation_at).getTime() : 0;
        return bTime - aTime;
      });
      break;
  }
  return copy;
}

export async function fetchClients(params: FetchClientsParams = {}): Promise<FetchClientsResult> {
  const user = await ensureUser();
  const limit = params.limit ?? DEFAULT_FETCH_LIMIT;
  const filters = params.filters ?? DEFAULT_FILTERS;
  let query = supabase
    .from('client_portfolio')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (params.cursor) {
    query = query.lt('created_at', params.cursor.created_at);
  }

  if (filters.vip) query = query.eq('is_vip', true);
  if (filters.blacklist) query = query.eq('is_blacklisted', true);
  if (filters.recents) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    query = query.gte('last_reservation_at', since.toISOString());
  }
  if (filters.frequent) {
    query = query.gte('total_courses', FREQUENT_THRESHOLD);
  }

  const search = params.search?.trim();
  if (search) {
    const sanitized = escapeLikeTerm(search);
    const normalized = normalizePhone(search);
    const clauses = [
      `first_name.ilike.%${sanitized}%`,
      `last_name.ilike.%${sanitized}%`,
      `email.ilike.%${sanitized}%`,
      `notes.ilike.%${sanitized}%`,
      `phone.ilike.%${sanitized}%`,
    ];
    if (normalized) {
      clauses.push(`phone_normalized.ilike.%${normalized}%`);
    }
    query = query.or(clauses.join(','));
  }

  const { data, error } = await query;
  const rows = withPortfolioGuard<RawClientRow[]>(error, () => (data ?? [] as RawClientRow[]));

  let processed = rows.map(mapClientRow);
  if (filters.notes) {
    processed = processed.filter(
      (item) => Boolean(item.notes?.trim()) || Boolean(item.tags?.length),
    );
  }

  const hasNext = processed.length > limit;
  if (hasNext) {
    processed = processed.slice(0, limit);
  }

  return {
    items: processed,
    nextCursor: hasNext
      ? { id: processed[processed.length - 1].id, created_at: processed[processed.length - 1].created_at }
      : null,
  };
}

export const listClients = fetchClients;

export async function fetchClientDetail(clientId: string): Promise<ClientDetail> {
  const user = await ensureUser();
  const { data, error } = await supabase
    .from('client_portfolio')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', clientId)
    .maybeSingle();
  const row = withPortfolioGuard<RawClientRow | null>(error, () => (data as RawClientRow | null));
  if (!row) {
    throw new Error('Client introuvable.');
  }
  return mapClientRow(row);
}

export async function fetchClientHistory(
  clientId: string,
  cursor: ClientHistoryCursor | null = null,
  limit = 10,
): Promise<ClientHistoryResult> {
  const user = await ensureUser();
  let query = supabase
    .from('reservations')
    .select('id, datetime, pickup, dropoff, status, actual_price')
    .eq('user_id', user.id)
    .eq('client_id', clientId)
    .order('datetime', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('datetime', cursor.datetime);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Historique indisponible.');
  }

  let rows = (data ?? []) as ClientHistoryEntry[];
  const hasNext = rows.length > limit;
  if (hasNext) {
    rows = rows.slice(0, limit);
  }

  return {
    items: rows,
    nextCursor: hasNext ? { id: rows[rows.length - 1].id, datetime: rows[rows.length - 1].datetime } : null,
  };
}

type ClientSummaryRow = { id: string; first_name: string; last_name: string; phone: string };

export async function lookupClientByPhone(phone: string) {
  const user = await ensureUser();
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('client_portfolio')
    .select('id, first_name, last_name, phone')
    .eq('user_id', user.id)
    .or([
      `phone.eq.${normalized}`,
      `phone_normalized.eq.${normalized}`,
    ].join(','))
    .maybeSingle();

  const row = withPortfolioGuard<ClientSummaryRow | null>(
    error,
    () => data as ClientSummaryRow | null,
  );
  return row ?? null;
}

const buildClientRow = (values: ClientFormValues) => ({
  first_name: values.first_name.trim(),
  last_name: values.last_name.trim(),
  phone: values.phone,
  phone_normalized: normalizePhone(values.phone),
  email: values.email?.trim() || null,
  notes: values.notes?.trim() || null,
  tags: values.tags ?? [],
  is_vip: values.is_vip,
  is_blacklisted: values.is_blacklisted,
  opt_in_sms: values.opt_in_sms,
  opt_in_email: values.opt_in_email,
  company_flag: values.company_flag,
  billing_mode: values.billing_mode,
  favorite_addresses: ensureFavoriteAddresses(values.favorite_addresses),
});

export async function createClient(values: ClientFormValues): Promise<ClientDetail> {
  const user = await ensureUser();
  const payload = buildClientRow(values);
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(error?.message || 'Création impossible.');
  }
  return fetchClientDetail(data.id);
}

export async function updateClient(values: ClientFormValues): Promise<ClientDetail> {
  if (!values.id) throw new Error('Client inconnu.');
  const payload = buildClientRow(values);
  const { error } = await supabase.from('clients').update(payload).eq('id', values.id);
  if (error) {
    throw new Error(error.message || 'Mise à jour impossible.');
  }
  return fetchClientDetail(values.id);
}

export async function upsertClient(values: ClientFormValues): Promise<ClientDetail> {
  return values.id ? updateClient(values) : createClient(values);
}

export async function removeClient(id: string) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) {
    throw new Error(error.message || 'Suppression impossible.');
  }
}

export async function toggleBlacklist(id: string, value: boolean) {
  const { error } = await supabase.from('clients').update({ is_blacklisted: value }).eq('id', id);
  if (error) {
    throw new Error(error.message || 'Action impossible.');
  }
}

export async function toggleVip(id: string, value: boolean) {
  const { error } = await supabase.from('clients').update({ is_vip: value }).eq('id', id);
  if (error) {
    throw new Error(error.message || 'Action impossible.');
  }
}

export async function quickCreateClient(payload: QuickCreatePayload) {
  let existing: ClientSummaryRow | null = null;
  try {
    existing = await lookupClientByPhone(payload.phone);
  } catch (error) {
    if (!(error instanceof ClientPortfolioUnavailableError)) {
      throw error;
    }
  }
  if (existing) {
    return fetchClientDetail(existing.id);
  }
  const values: ClientFormValues = {
    first_name: payload.first_name || '',
    last_name: payload.last_name || '',
    phone: payload.phone,
    email: payload.email ?? '',
    notes: '',
    tags: [],
    is_vip: false,
    is_blacklisted: false,
    opt_in_sms: true,
    opt_in_email: true,
    company_flag: false,
    billing_mode: 'bord',
    favorite_addresses: { home: null, work: null, airport: null },
  };
  return createClient(values);
}
