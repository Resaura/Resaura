import { supabase } from '@/lib/supabase';
import { normalizePhone } from '@/lib/clients.service';

export type ClientSummary = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export async function searchClients(query: string, limit = 10): Promise<ClientSummary[]> {
  const { data: session, error: authErr } = await supabase.auth.getUser();
  if (authErr || !session?.user || !query.trim()) {
    return [];
  }
  const q = query.trim();
  const sanitized = q.replace(/'/g, "''");
  const normalized = normalizePhone(q);
  const clauses = [
    `first_name.ilike.%${sanitized}%`,
    `last_name.ilike.%${sanitized}%`,
    `phone.ilike.%${sanitized}%`,
  ];
  if (normalized) {
    clauses.push(`phone_normalized.ilike.%${normalized}%`);
  }
  const { data, error } = await supabase
    .from('client_portfolio')
    .select('id, first_name, last_name, phone')
    .eq('user_id', session.user.id)
    .or(clauses.join(','))
    .limit(limit);
  if (error || !data) {
    console.log('[clients.search] error', error);
    return [];
  }
  return data as ClientSummary[];
}
