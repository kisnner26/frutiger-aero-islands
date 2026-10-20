create table public.island_likes (
  island_id uuid not null references public.islands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (island_id, user_id)
);

create table public.island_favorites (
  island_id uuid not null references public.islands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (island_id, user_id)
);

create table public.island_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  island_id uuid not null references public.islands(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create table public.expeditions (
  id text primary key,
  title text not null,
  kind text not null check (kind in ('faro', 'arrecife', 'isla_flotante')),
  region text not null,
  goal integer not null check (goal > 0),
  progress integer not null default 0 check (progress >= 0),
  reward text not null,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  constraint expeditions_dates check (closes_at > opens_at)
);

create table public.expedition_contributions (
  expedition_id text not null references public.expeditions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (expedition_id, user_id)
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9_]{2,23}$'),
  name text not null check (char_length(name) between 3 and 40),
  motto text not null default '' check (char_length(motto) <= 100),
  badge text not null default 'orb' check (badge in ('orb', 'wave', 'palm', 'crystal')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  contribution integer not null default 0 check (contribution >= 0),
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id),
  unique (user_id)
);

create table public.gadget_catalog (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('camera', 'music', 'laptop', 'watch', 'phone')),
  description text not null,
  unlock_level integer not null default 1 check (unlock_level >= 1)
);

create table public.island_gadgets (
  island_id uuid not null references public.islands(id) on delete cascade,
  gadget_id text not null references public.gadget_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (island_id, gadget_id)
);

insert into public.expeditions (id, title, kind, region, goal, reward, closes_at) values
  ('lighthouse-atlantic', 'enciende el faro azul', 'faro', 'atlántico', 5000, 'baliza oceánica', now() + interval '14 days'),
  ('reef-pacific', 'restaura el arrecife de cristal', 'arrecife', 'pacífico', 8000, 'coral iridiscente', now() + interval '21 days'),
  ('sky-islet', 'eleva la isla de las nubes', 'isla_flotante', 'cielo central', 12000, 'muelle flotante', now() + interval '30 days')
on conflict (id) do nothing;

insert into public.gadget_catalog (id, name, kind, description, unlock_level) values
  ('aero-camera', 'cámara aero', 'camera', 'fotografía recuerdos de tu isla', 1),
  ('wave-player', 'reproductor wave', 'music', 'cambia la música y el ambiente', 2),
  ('glassbook', 'glassbook', 'laptop', 'mira planos y visitas', 3),
  ('sun-watch', 'sun watch', 'watch', 'recibe retos rápidos', 4),
  ('islandberry', 'islandberry', 'phone', 'abre cámara, radio y minijuegos', 1)
on conflict (id) do nothing;

alter table public.island_likes enable row level security;
alter table public.island_favorites enable row level security;
alter table public.island_presence enable row level security;
alter table public.expeditions enable row level security;
alter table public.expedition_contributions enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.gadget_catalog enable row level security;
alter table public.island_gadgets enable row level security;

create policy "own likes" on public.island_likes for select to authenticated using (user_id = auth.uid());
create policy "own favorites" on public.island_favorites for select to authenticated using (user_id = auth.uid());
create policy "public expeditions" on public.expeditions for select using (true);
create policy "public clubs" on public.clubs for select using (true);
create policy "public club members" on public.club_members for select using (true);
create policy "public gadgets" on public.gadget_catalog for select using (true);
create policy "own gadgets" on public.island_gadgets for select to authenticated using (exists (select 1 from public.islands where islands.id = island_gadgets.island_id and islands.owner_id = auth.uid()));

create or replace function public.island_social_status(p_island_id uuid)
returns table (likes bigint, favorites bigint, is_liked boolean, is_favorited boolean)
language sql security definer set search_path = '' as $$
  select
    (select count(*) from public.island_likes where island_id = p_island_id),
    (select count(*) from public.island_favorites where island_id = p_island_id),
    exists(select 1 from public.island_likes where island_id = p_island_id and user_id = auth.uid()),
    exists(select 1 from public.island_favorites where island_id = p_island_id and user_id = auth.uid());
$$;

create or replace function public.toggle_island_like(p_island_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if exists (select 1 from public.island_likes where island_id = p_island_id and user_id = auth.uid()) then
    delete from public.island_likes where island_id = p_island_id and user_id = auth.uid(); return false;
  end if;
  insert into public.island_likes (island_id, user_id) values (p_island_id, auth.uid()); return true;
end; $$;

create or replace function public.toggle_island_favorite(p_island_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if exists (select 1 from public.island_favorites where island_id = p_island_id and user_id = auth.uid()) then
    delete from public.island_favorites where island_id = p_island_id and user_id = auth.uid(); return false;
  end if;
  insert into public.island_favorites (island_id, user_id) values (p_island_id, auth.uid()); return true;
end; $$;

create or replace function public.touch_island_presence(p_island_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  insert into public.island_presence (user_id, island_id, last_seen_at) values (auth.uid(), p_island_id, now())
  on conflict (user_id) do update set island_id = excluded.island_id, last_seen_at = excluded.last_seen_at;
end; $$;

create or replace function public.world_presence()
returns table (island_id uuid, online_count bigint)
language sql security definer set search_path = '' as $$
  select island_id, count(*) from public.island_presence
  where last_seen_at > now() - interval '5 minutes'
  group by island_id;
$$;

create or replace function public.contribute_to_expedition(p_expedition_id text, p_amount integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_progress integer;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if p_amount < 1 or p_amount > 100 then raise exception 'aporte inválido' using errcode = '22023'; end if;
  update public.expeditions set progress = least(goal, progress + p_amount) where id = p_expedition_id and closes_at > now()
  returning progress into v_progress;
  if not found then raise exception 'expedición no disponible' using errcode = 'P0002'; end if;
  insert into public.expedition_contributions (expedition_id, user_id, amount) values (p_expedition_id, auth.uid(), p_amount)
  on conflict (expedition_id, user_id) do update set amount = expedition_contributions.amount + excluded.amount, created_at = now();
  return v_progress;
end; $$;

grant execute on function public.island_social_status(uuid), public.toggle_island_like(uuid), public.toggle_island_favorite(uuid), public.touch_island_presence(uuid), public.world_presence(), public.contribute_to_expedition(text, integer) to authenticated;
grant execute on function public.world_presence() to anon;
