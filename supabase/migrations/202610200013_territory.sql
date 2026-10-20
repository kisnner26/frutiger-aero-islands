-- conquista del mundo: parcelas en una cuadrícula global (como r/place), con energía que se regenera,
-- adyacencia para expandirse, escudo tras reclamar, ranking por jugador y por país, y retos semanales.
-- todo se escribe solo mediante funciones del servidor: nadie puede tocar las tablas directamente.

create table public.parcels (
  cx smallint not null,
  cy smallint not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  shield_until timestamptz not null default now(),
  captures integer not null default 0 check (captures >= 0),
  primary key (cx, cy),
  constraint parcels_bounds check (cx between 0 and 23 and cy between 0 and 23)
);
create index parcels_owner_idx on public.parcels (owner_id);

create table public.parcel_energy (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  energy numeric not null default 5 check (energy >= 0 and energy <= 5),
  updated_at timestamptz not null default now()
);

create table public.parcel_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('claim', 'capture', 'restore')),
  cx smallint not null,
  cy smallint not null,
  created_at timestamptz not null default now()
);
create index parcel_events_user_time_idx on public.parcel_events (user_id, created_at desc);
create index parcel_events_time_idx on public.parcel_events (created_at desc);

-- zonas feas: todo el planeta empieza dañado y la comunidad lo restaura entre muchas personas
create table public.parcel_restoration (
  cx smallint not null,
  cy smallint not null,
  progress integer not null default 0 check (progress between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (cx, cy),
  constraint restoration_bounds check (cx between 0 and 23 and cy between 0 and 23)
);
create table public.parcel_contributions (
  cx smallint not null,
  cy smallint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount between 1 and 40),
  primary key (cx, cy, user_id)
);

alter table public.parcel_restoration enable row level security;
alter table public.parcel_contributions enable row level security;
alter table public.parcels enable row level security;
alter table public.parcel_energy enable row level security;
alter table public.parcel_events enable row level security;
revoke all on public.parcels, public.parcel_energy, public.parcel_events, public.parcel_restoration, public.parcel_contributions from anon, authenticated;

-- reclamar una parcela libre (1 energía) o capturar una ajena sin escudo (2 energías)
create or replace function public.claim_parcel(p_cx integer, p_cy integer)
returns table (action text, energy numeric, owned integer)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_energy numeric;
  v_updated timestamptz;
  v_cost integer;
  v_action text;
  v_owner uuid;
  v_shield timestamptz;
  v_owned integer;
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'crea tu isla antes de conquistar' using errcode = '42501'; end if;
  if p_cx is null or p_cy is null or p_cx not between 0 and 23 or p_cy not between 0 and 23
     or power(p_cx + 0.5 - 12, 2) + power(p_cy + 0.5 - 12, 2) > power(11.6, 2) then
    raise exception 'esa parcela está fuera del mundo' using errcode = '22023';
  end if;

  insert into public.parcel_energy (user_id) values (v_user) on conflict (user_id) do nothing;
  select pe.energy, pe.updated_at into v_energy, v_updated from public.parcel_energy pe where pe.user_id = v_user for update;
  v_energy := least(5, v_energy + extract(epoch from (now() - v_updated)) / 1200.0);

  select p.owner_id, p.shield_until into v_owner, v_shield from public.parcels p where p.cx = p_cx and p.cy = p_cy for update;
  if found then
    if v_owner = v_user then raise exception 'esa parcela ya es tuya' using errcode = '22023'; end if;
    if v_shield > now() then raise exception 'parcela protegida por un escudo temporal' using errcode = '22023'; end if;
    v_cost := 2; v_action := 'capture';
  else
    v_cost := 1; v_action := 'claim';
  end if;

  select count(*) into v_owned from public.parcels where owner_id = v_user;
  if v_owned > 0 and not exists (
    select 1 from public.parcels p where p.owner_id = v_user and abs(p.cx - p_cx) <= 1 and abs(p.cy - p_cy) <= 1
  ) then
    raise exception 'solo puedes expandirte junto a tus parcelas' using errcode = '22023';
  end if;
  if v_energy < v_cost then raise exception 'te falta energía: se recupera 1 cada 20 minutos' using errcode = '22023'; end if;

  if v_action = 'capture' then
    update public.parcels set owner_id = v_user, claimed_at = now(), shield_until = now() + interval '30 minutes', captures = captures + 1
      where cx = p_cx and cy = p_cy;
  else
    insert into public.parcels (cx, cy, owner_id, shield_until) values (p_cx, p_cy, v_user, now() + interval '30 minutes')
      on conflict (cx, cy) do nothing;
    if not found then raise exception 'otra persona fue más rápida' using errcode = '40001'; end if;
  end if;

  update public.parcel_energy set energy = v_energy - v_cost, updated_at = now() where user_id = v_user;
  insert into public.parcel_events (user_id, kind, cx, cy) values (v_user, v_action, p_cx, p_cy);
  return query select v_action, v_energy - v_cost, v_owned + 1;
end;
$$;

-- restaurar una zona dañada: cuesta 1 energía y suma 20 puntos; cada persona aporta como máximo 40 por parcela,
-- así que hacen falta al menos tres personas para devolverle el color a una zona
create or replace function public.restore_parcel(p_cx integer, p_cy integer)
returns table (progress integer, energy numeric)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_energy numeric;
  v_updated timestamptz;
  v_mine integer;
  v_progress integer;
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'crea tu isla antes de restaurar' using errcode = '42501'; end if;
  if p_cx is null or p_cy is null or p_cx not between 0 and 23 or p_cy not between 0 and 23
     or power(p_cx + 0.5 - 12, 2) + power(p_cy + 0.5 - 12, 2) > power(11.6, 2) then
    raise exception 'esa zona está fuera del mundo' using errcode = '22023';
  end if;

  insert into public.parcel_energy (user_id) values (v_user) on conflict (user_id) do nothing;
  select pe.energy, pe.updated_at into v_energy, v_updated from public.parcel_energy pe where pe.user_id = v_user for update;
  v_energy := least(5, v_energy + extract(epoch from (now() - v_updated)) / 1200.0);
  if v_energy < 1 then raise exception 'te falta energía: se recupera 1 cada 20 minutos' using errcode = '22023'; end if;

  insert into public.parcel_restoration (cx, cy) values (p_cx, p_cy) on conflict (cx, cy) do nothing;
  select r.progress into v_progress from public.parcel_restoration r where r.cx = p_cx and r.cy = p_cy for update;
  if v_progress >= 100 then raise exception 'esta zona ya está restaurada' using errcode = '22023'; end if;
  select coalesce(sum(c.amount), 0) into v_mine from public.parcel_contributions c where c.cx = p_cx and c.cy = p_cy and c.user_id = v_user;
  if v_mine >= 40 then raise exception 'ya aportaste todo lo que puedes a esta zona: otras personas deben terminarla' using errcode = '22023'; end if;

  v_progress := least(100, v_progress + 20);
  update public.parcel_restoration set progress = v_progress, updated_at = now() where cx = p_cx and cy = p_cy;
  insert into public.parcel_contributions (cx, cy, user_id, amount) values (p_cx, p_cy, v_user, 20)
    on conflict (cx, cy, user_id) do update set amount = public.parcel_contributions.amount + 20;
  update public.parcel_energy set energy = v_energy - 1, updated_at = now() where user_id = v_user;
  insert into public.parcel_events (user_id, kind, cx, cy) values (v_user, 'restore', p_cx, p_cy);
  return query select v_progress, v_energy - 1;
end;
$$;

-- avance de restauración por parcela (solo las que ya tienen algo) y resumen del planeta
create or replace function public.world_restoration()
returns table (cx smallint, cy smallint, progress integer)
language sql stable security definer set search_path = '' as $$
  select r.cx, r.cy, r.progress from public.parcel_restoration r where r.progress > 0;
$$;

create or replace function public.restoration_summary()
returns table (total_cells integer, restored_cells integer, percent numeric, helpers integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from generate_series(0, 23) x, generate_series(0, 23) y where power(x + 0.5 - 12, 2) + power(y + 0.5 - 12, 2) <= power(11.6, 2)),
    (select count(*)::integer from public.parcel_restoration where progress >= 100),
    round(coalesce((select sum(progress) from public.parcel_restoration), 0)::numeric * 100
      / greatest(1, (select count(*) from generate_series(0, 23) x, generate_series(0, 23) y where power(x + 0.5 - 12, 2) + power(y + 0.5 - 12, 2) <= power(11.6, 2)) * 100), 2),
    (select count(distinct user_id)::integer from public.parcel_contributions);
$$;

-- el mapa completo (sin identificadores internos)
create or replace function public.world_parcels()
returns table (cx smallint, cy smallint, owner text, country text, shield_until timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.cx, p.cy, pr.username, pr.country_code, p.shield_until
  from public.parcels p join public.profiles pr on pr.id = p.owner_id;
$$;

create or replace function public.my_territory()
returns table (energy numeric, max_energy integer, seconds_to_next integer, owned integer, captured integer)
language sql stable security definer set search_path = '' as $$
  with me as (
    select least(5, coalesce(pe.energy, 5) + extract(epoch from (now() - coalesce(pe.updated_at, now()))) / 1200.0) as e
    from (select 1) x left join public.parcel_energy pe on pe.user_id = auth.uid()
  )
  select me.e, 5,
    case when me.e >= 5 then 0 else ceil((1 - (me.e - floor(me.e))) * 1200)::integer end,
    (select count(*)::integer from public.parcels where owner_id = auth.uid()),
    (select count(*)::integer from public.parcel_events where user_id = auth.uid() and kind = 'capture')
  from me;
$$;

create or replace function public.territory_leaderboard()
returns table (username text, country text, parcels integer)
language sql stable security definer set search_path = '' as $$
  select pr.username, pr.country_code, count(*)::integer as n
  from public.parcels p join public.profiles pr on pr.id = p.owner_id
  group by pr.username, pr.country_code, pr.created_at
  order by n desc, pr.created_at asc limit 20;
$$;

create or replace function public.country_leaderboard()
returns table (country text, parcels integer, players integer)
language sql stable security definer set search_path = '' as $$
  select pr.country_code, count(*)::integer as n, count(distinct pr.id)::integer
  from public.parcels p join public.profiles pr on pr.id = p.owner_id
  where pr.country_code is not null
  group by pr.country_code order by n desc, pr.country_code limit 20;
$$;

-- retos semanales (el progreso sale del registro de eventos de esta semana)
create or replace function public.weekly_challenges()
returns table (id text, title text, description text, kind text, goal integer, reward text, ends_at timestamptz)
language sql stable set search_path = '' as $$
  select * from (values
    ('expansion', 'expansión semanal', 'reclama 8 parcelas libres esta semana', 'claim', 8, 'insignia de explorador', date_trunc('week', now()) + interval '7 days'),
    ('conquista', 'conquistador', 'captura 3 parcelas a otros exploradores', 'capture', 3, 'insignia de conquistador', date_trunc('week', now()) + interval '7 days'),
    ('restaura', 'restaurador', 'restaura 10 zonas dañadas del planeta esta semana', 'restore', 10, 'insignia de restaurador', date_trunc('week', now()) + interval '7 days'),
    ('constancia', 'constancia', 'haz 15 movimientos en el mapa esta semana', 'any', 15, 'insignia de constancia', date_trunc('week', now()) + interval '7 days')
  ) as t(id, title, description, kind, goal, reward, ends_at);
$$;

create or replace function public.my_challenges()
returns table (id text, title text, description text, goal integer, progress integer, reward text, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.description, c.goal,
    least(c.goal, (select count(*)::integer from public.parcel_events e
      where e.user_id = auth.uid() and e.created_at >= date_trunc('week', now()) and (c.kind = 'any' or e.kind = c.kind))),
    c.reward, c.ends_at
  from public.weekly_challenges() c;
$$;

create or replace function public.challenge_leaderboard(p_id text)
returns table (username text, score integer)
language sql stable security definer set search_path = '' as $$
  select pr.username, count(*)::integer as n
  from public.parcel_events e
  join public.profiles pr on pr.id = e.user_id
  join public.weekly_challenges() c on c.id = p_id
  where e.created_at >= date_trunc('week', now()) and (c.kind = 'any' or e.kind = c.kind)
  group by pr.username order by n desc, pr.username limit 10;
$$;

revoke all on function public.restore_parcel(integer, integer), public.world_restoration(), public.restoration_summary(), public.claim_parcel(integer, integer), public.world_parcels(), public.my_territory(), public.territory_leaderboard(),
  public.country_leaderboard(), public.weekly_challenges(), public.my_challenges(), public.challenge_leaderboard(text) from public;
grant execute on function public.claim_parcel(integer, integer), public.restore_parcel(integer, integer), public.my_territory(), public.my_challenges() to authenticated;
grant execute on function public.world_restoration(), public.restoration_summary(), public.world_parcels(), public.territory_leaderboard(), public.country_leaderboard(),
  public.weekly_challenges(), public.challenge_leaderboard(text) to anon, authenticated;
