create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z][a-z0-9_]{2,23}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 40),
  constraint profiles_username_reserved check (username not in ('admin', 'support', 'moderator', 'system', 'islands'))
);

create table public.islands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null default 'mi isla',
  layout jsonb not null default '{"objects":[],"brillos":100,"maxLevel":1,"stats":{"pops":0,"bestCombo":0}}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint islands_name_length check (char_length(name) between 1 and 60),
  constraint islands_layout_object check (jsonb_typeof(layout) = 'object'),
  constraint islands_layout_objects check (jsonb_typeof(layout -> 'objects') = 'array' and jsonb_array_length(layout -> 'objects') <= 150)
);

create index islands_created_at_idx on public.islands (created_at desc, id desc);
create index profiles_username_prefix_idx on public.profiles (username text_pattern_ops);

alter table public.profiles enable row level security;
alter table public.islands enable row level security;

revoke all on public.profiles, public.islands from anon, authenticated;
grant select (id, username, display_name, created_at) on public.profiles to anon, authenticated;
grant select (id, owner_id, name, layout, revision, created_at, updated_at) on public.islands to anon, authenticated;

create policy "profiles public read" on public.profiles for select using (true);
create policy "islands public read" on public.islands for select using (true);

create or replace function public.complete_profile(p_username text, p_display_name text default null)
returns table (id uuid, username text, display_name text, island_id uuid, island_name text, layout jsonb, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_username text := lower(trim(p_username));
  v_display text := coalesce(nullif(trim(p_display_name), ''), v_username);
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if v_username !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'nombre de usuario inválido' using errcode = '22023'; end if;
  if char_length(v_display) > 40 then raise exception 'nombre público demasiado largo' using errcode = '22023'; end if;

  insert into public.profiles (id, username, display_name)
  values (v_user, v_username, v_display)
  on conflict (id) do update set display_name = excluded.display_name, updated_at = now();
  insert into public.islands (owner_id) values (v_user) on conflict (owner_id) do nothing;

  return query select p.id, p.username, p.display_name, i.id, i.name, i.layout, i.revision
    from public.profiles p join public.islands i on i.owner_id = p.id where p.id = v_user;
end;
$$;

create or replace function public.save_island(p_island_id uuid, p_expected_revision bigint, p_layout jsonb)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_revision bigint;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if jsonb_typeof(p_layout) <> 'object' or jsonb_typeof(p_layout -> 'objects') <> 'array' or jsonb_array_length(p_layout -> 'objects') > 150 then
    raise exception 'diseño inválido' using errcode = '22023';
  end if;
  select owner_id, revision into v_owner, v_revision from public.islands where id = p_island_id for update;
  if not found then raise exception 'isla no encontrada' using errcode = 'P0002'; end if;
  if v_owner <> auth.uid() then raise exception 'no puedes modificar esta isla' using errcode = '42501'; end if;
  if v_revision <> p_expected_revision then raise exception 'conflicto de edición' using errcode = '40001'; end if;
  update public.islands set layout = p_layout, revision = revision + 1, updated_at = now() where id = p_island_id
    returning islands.revision, islands.updated_at into revision, updated_at;
  return next;
end;
$$;

grant execute on function public.complete_profile(text, text) to authenticated;
grant execute on function public.save_island(uuid, bigint, jsonb) to authenticated;
