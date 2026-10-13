-- Web Push subscriptions and notification preferences (single shared vault).

create table if not exists public.sunshine_notification_prefs (
  vault_key text primary key,
  enabled boolean not null default false,
  due_todos boolean not null default true,
  water boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.sunshine_notification_prefs enable row level security;

create table if not exists public.sunshine_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  vault_key text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sunshine_push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists sunshine_push_subscriptions_vault_idx
  on public.sunshine_push_subscriptions (vault_key);

alter table public.sunshine_push_subscriptions enable row level security;

create or replace function public.sunshine_notification_prefs_get(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_notification_prefs;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;

  select * into row
  from public.sunshine_notification_prefs p
  where p.vault_key = trim(p_key);

  if not found then
    return jsonb_build_object(
      'enabled', false,
      'dueTodos', true,
      'water', false
    );
  end if;

  return jsonb_build_object(
    'enabled', row.enabled,
    'dueTodos', row.due_todos,
    'water', row.water
  );
end;
$$;

create or replace function public.sunshine_notification_prefs_upsert(
  p_key text,
  p_enabled boolean,
  p_due_todos boolean,
  p_water boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_notification_prefs;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;

  insert into public.sunshine_notification_prefs (
    vault_key, enabled, due_todos, water, updated_at
  )
  values (
    trim(p_key),
    coalesce(p_enabled, false),
    coalesce(p_due_todos, true),
    coalesce(p_water, false),
    now()
  )
  on conflict (vault_key) do update
    set enabled = excluded.enabled,
        due_todos = excluded.due_todos,
        water = excluded.water,
        updated_at = now()
  returning * into row;

  return jsonb_build_object(
    'enabled', row.enabled,
    'dueTodos', row.due_todos,
    'water', row.water
  );
end;
$$;

create or replace function public.sunshine_push_subscribe(
  p_key text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_push_subscriptions;
  next_endpoint text := trim(coalesce(p_endpoint, ''));
  next_p256dh text := trim(coalesce(p_p256dh, ''));
  next_auth text := trim(coalesce(p_auth, ''));
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  if next_endpoint = '' or next_p256dh = '' or next_auth = '' then
    raise exception 'subscription required';
  end if;

  insert into public.sunshine_push_subscriptions (
    vault_key, endpoint, p256dh, auth, user_agent, updated_at
  )
  values (
    trim(p_key), next_endpoint, next_p256dh, next_auth, nullif(trim(coalesce(p_user_agent, '')), ''), now()
  )
  on conflict (endpoint) do update
    set vault_key = excluded.vault_key,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = now()
  returning * into row;

  return jsonb_build_object(
    'id', row.id,
    'endpoint', row.endpoint
  );
end;
$$;

create or replace function public.sunshine_push_unsubscribe(
  p_key text,
  p_endpoint text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  delete from public.sunshine_push_subscriptions s
  where s.vault_key = trim(p_key)
    and s.endpoint = trim(coalesce(p_endpoint, ''));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.sunshine_push_list(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  items jsonb;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'endpoint', s.endpoint,
        'p256dh', s.p256dh,
        'auth', s.auth
      )
      order by s.updated_at desc
    ),
    '[]'::jsonb
  )
    into items
  from public.sunshine_push_subscriptions s
  where s.vault_key = trim(p_key);
  return jsonb_build_object('items', items);
end;
$$;

create or replace function public.sunshine_push_delete_endpoint(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from public.sunshine_push_subscriptions s
  where s.endpoint = trim(coalesce(p_endpoint, ''));
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sunshine_notification_prefs_get(text) to anon, authenticated;
grant execute on function public.sunshine_notification_prefs_upsert(text, boolean, boolean, boolean) to anon, authenticated;
grant execute on function public.sunshine_push_subscribe(text, text, text, text, text) to anon, authenticated;
grant execute on function public.sunshine_push_unsubscribe(text, text) to anon, authenticated;
grant execute on function public.sunshine_push_list(text) to anon, authenticated;
grant execute on function public.sunshine_push_delete_endpoint(text) to anon, authenticated;
