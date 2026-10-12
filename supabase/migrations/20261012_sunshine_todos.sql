-- Todos and habits for Noorie (single shared vault key).
create table if not exists public.sunshine_todos (
  id uuid primary key default gen_random_uuid(),
  vault_key text not null,
  title text not null,
  status text not null default 'open'
    check (status in ('open', 'done', 'suggested')),
  source text not null default 'noorie'
    check (source in ('noorie', 'maria')),
  due_at timestamptz,
  recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly')),
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sunshine_todos_vault_status_idx
  on public.sunshine_todos (vault_key, status, due_at);

alter table public.sunshine_todos enable row level security;

create or replace function public.sunshine_todos_list(p_key text)
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
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
    into items
  from public.sunshine_todos t
  where t.vault_key = trim(p_key);
  return jsonb_build_object('items', items);
end;
$$;

create or replace function public.sunshine_todos_upsert(
  p_key text,
  p_id uuid,
  p_title text,
  p_status text,
  p_source text,
  p_due_at timestamptz,
  p_recurrence text,
  p_reminded_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_todos;
  next_status text := coalesce(nullif(trim(p_status), ''), 'open');
  next_source text := coalesce(nullif(trim(p_source), ''), 'noorie');
  next_recurrence text := coalesce(nullif(trim(p_recurrence), ''), 'none');
  next_title text := trim(coalesce(p_title, ''));
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  if next_title = '' then
    raise exception 'title required';
  end if;
  if next_status not in ('open', 'done', 'suggested') then
    raise exception 'invalid status';
  end if;
  if next_source not in ('noorie', 'maria') then
    raise exception 'invalid source';
  end if;
  if next_recurrence not in ('none', 'daily', 'weekly') then
    raise exception 'invalid recurrence';
  end if;

  if p_id is null then
    insert into public.sunshine_todos (
      vault_key, title, status, source, due_at, recurrence, reminded_at
    )
    values (
      trim(p_key), next_title, next_status, next_source, p_due_at, next_recurrence, p_reminded_at
    )
    returning * into row;
  else
    update public.sunshine_todos t
    set title = next_title,
        status = next_status,
        source = next_source,
        due_at = p_due_at,
        recurrence = next_recurrence,
        reminded_at = p_reminded_at,
        updated_at = now()
    where t.id = p_id and t.vault_key = trim(p_key)
    returning * into row;
    if not found then
      raise exception 'todo not found';
    end if;
  end if;

  return to_jsonb(row);
end;
$$;

create or replace function public.sunshine_todos_set_status(
  p_key text,
  p_id uuid,
  p_status text,
  p_due_at timestamptz default null,
  p_reminded_at timestamptz default null,
  p_clear_reminded boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  row public.sunshine_todos;
  next_status text := trim(coalesce(p_status, ''));
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  if next_status not in ('open', 'done', 'suggested') then
    raise exception 'invalid status';
  end if;

  update public.sunshine_todos t
  set status = next_status,
      due_at = coalesce(p_due_at, t.due_at),
      reminded_at = case
        when p_clear_reminded then null
        when p_reminded_at is not null then p_reminded_at
        else t.reminded_at
      end,
      updated_at = now()
  where t.id = p_id and t.vault_key = trim(p_key)
  returning * into row;

  if not found then
    raise exception 'todo not found';
  end if;

  return to_jsonb(row);
end;
$$;

create or replace function public.sunshine_todos_delete(p_key text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  delete from public.sunshine_todos t
  where t.id = p_id and t.vault_key = trim(p_key);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sunshine_todos_list(text) to anon, authenticated;
grant execute on function public.sunshine_todos_upsert(text, uuid, text, text, text, timestamptz, text, timestamptz) to anon, authenticated;
grant execute on function public.sunshine_todos_set_status(text, uuid, text, timestamptz, timestamptz, boolean) to anon, authenticated;
grant execute on function public.sunshine_todos_delete(text, uuid) to anon, authenticated;
