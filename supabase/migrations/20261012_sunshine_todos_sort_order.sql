-- Persist manual todo order for drag-and-drop.
alter table public.sunshine_todos
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select id,
         row_number() over (
           partition by vault_key
           order by created_at desc
         ) - 1 as rn
  from public.sunshine_todos
)
update public.sunshine_todos t
set sort_order = ranked.rn
from ranked
where t.id = ranked.id;

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
  select coalesce(jsonb_agg(to_jsonb(t) order by t.sort_order asc, t.created_at desc), '[]'::jsonb)
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
  next_order integer;
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
    select coalesce(max(t.sort_order), -1) + 1
      into next_order
    from public.sunshine_todos t
    where t.vault_key = trim(p_key);

    insert into public.sunshine_todos (
      vault_key, title, status, source, due_at, recurrence, reminded_at, sort_order
    )
    values (
      trim(p_key), next_title, next_status, next_source, p_due_at, next_recurrence, p_reminded_at, next_order
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

create or replace function public.sunshine_todos_reorder(p_key text, p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  i integer;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    raise exception 'invalid sync key';
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return jsonb_build_object('ok', true);
  end if;

  for i in 1 .. array_length(p_ids, 1) loop
    update public.sunshine_todos t
    set sort_order = i - 1,
        updated_at = now()
    where t.id = p_ids[i]
      and t.vault_key = trim(p_key);
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sunshine_todos_reorder(text, uuid[]) to anon, authenticated;
