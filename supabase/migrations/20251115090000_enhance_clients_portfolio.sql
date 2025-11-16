-- Clients portfolio enhancements: additional metadata + stats view

alter table if exists public.clients
  add column if not exists phone_normalized text,
  add column if not exists favorite_addresses jsonb default jsonb_build_object('home', null, 'work', null, 'airport', null),
  add column if not exists notes text,
  add column if not exists tags text[] default '{}'::text[],
  add column if not exists is_vip boolean default false,
  add column if not exists is_blacklisted boolean default false,
  add column if not exists loyalty_status text default 'bronze',
  add column if not exists loyalty_points integer default 0,
  add column if not exists opt_in_sms boolean default true,
  add column if not exists opt_in_email boolean default true,
  add column if not exists company_flag boolean default false,
  add column if not exists billing_mode text default 'bord',
  add column if not exists communication_prefs jsonb default '{}'::jsonb,
  add column if not exists last_contact_channel text;

create unique index if not exists clients_user_phone_unique
  on public.clients (user_id, coalesce(phone_normalized, phone));

drop view if exists public.client_portfolio cascade;

create view public.client_portfolio
with (security_invoker = true)
as
select
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.phone_normalized,
  c.email,
  c.favorite_addresses,
  c.notes,
  c.tags,
  c.is_loyal,
  c.is_vip,
  c.is_blacklisted,
  c.loyalty_status,
  c.loyalty_points,
  c.opt_in_sms,
  c.opt_in_email,
  c.company_flag,
  c.billing_mode,
  c.communication_prefs,
  c.created_at,
  c.updated_at,
  coalesce(stats.total_courses, 0) as total_courses,
  coalesce(stats.lifetime_value, 0)::numeric as lifetime_value,
  stats.last_reservation_at
from public.clients c
left join (
  select
    client_id,
    user_id,
    count(*)::int as total_courses,
    coalesce(sum(coalesce(actual_price, price_est, 0)), 0) as lifetime_value,
    max(datetime) as last_reservation_at
  from public.reservations
  where client_id is not null
  group by user_id, client_id
) stats on stats.client_id = c.id and stats.user_id = c.user_id;
