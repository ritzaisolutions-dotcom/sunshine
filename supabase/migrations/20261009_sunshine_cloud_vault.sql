-- Cloud vault so chats and About Noorie follow Noorie across devices.
create table if not exists public.sunshine_vaults (
  sync_key text primary key,
  chats jsonb not null default '[]'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.sunshine_vaults enable row level security;

create or replace function public.sunshine_pull(p_key text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_vaults;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  select * into row from public.sunshine_vaults where sync_key = trim(p_key);
  if not found then
    return jsonb_build_object('found', false);
  end if;
  return jsonb_build_object(
    'found', true,
    'chats', row.chats,
    'notes', row.notes,
    'updatedAt', row.updated_at
  );
end;
$$;

create or replace function public.sunshine_push(p_key text, p_chats jsonb, p_notes jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_vaults;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  insert into public.sunshine_vaults (sync_key, chats, notes, updated_at)
  values (trim(p_key), coalesce(p_chats, '[]'::jsonb), coalesce(p_notes, '{}'::jsonb), now())
  on conflict (sync_key) do update
    set chats = excluded.chats,
        notes = excluded.notes,
        updated_at = now()
  returning * into row;
  return jsonb_build_object(
    'ok', true,
    'updatedAt', row.updated_at
  );
end;
$$;

grant execute on function public.sunshine_pull(text) to anon, authenticated;
grant execute on function public.sunshine_push(text, jsonb, jsonb) to anon, authenticated;
