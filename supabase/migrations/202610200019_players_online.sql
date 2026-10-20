-- que todos se vean entre sí: presencia en cualquier pantalla, lista de jugadores en línea, directorio con búsqueda
-- y consultas por país para que el mundo no se limite a las primeras islas.

-- tu presencia desde cualquier pantalla (no solo desde tu isla)
create or replace function public.touch_my_presence()
returns void language plpgsql security definer set search_path = '' as $$
declare v_island uuid;
begin
  if auth.uid() is null then return; end if;
  select i.id into v_island from public.islands i where i.owner_id = auth.uid();
  if v_island is null then return; end if;
  insert into public.island_presence (user_id, island_id, last_seen_at) values (auth.uid(), v_island, now())
  on conflict (user_id) do update set island_id = excluded.island_id, last_seen_at = excluded.last_seen_at;
end;
$$;

-- jugadores conectados en los últimos 3 minutos
create or replace function public.online_players()
returns table (username text, display_name text, country text, seconds_ago integer)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name, p.country_code, extract(epoch from (now() - pr.last_seen_at))::integer
  from public.island_presence pr join public.profiles p on p.id = pr.user_id
  where pr.last_seen_at > now() - interval '3 minutes'
  order by pr.last_seen_at desc, p.username
  limit 100;
$$;

-- directorio de todos los jugadores, con búsqueda y páginas (total en cada fila)
create or replace function public.directory_players(p_query text default '', p_limit integer default 30, p_offset integer default 0)
returns table (username text, display_name text, country text, online boolean, created_at timestamptz, total bigint)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name, p.country_code,
    exists (select 1 from public.island_presence pr where pr.user_id = p.id and pr.last_seen_at > now() - interval '3 minutes'),
    p.created_at, count(*) over ()
  from public.profiles p
  where exists (select 1 from public.islands i where i.owner_id = p.id)
    and (coalesce(trim(p_query), '') = '' or p.username ilike '%' || replace(replace(lower(trim(p_query)), '%', ''), '_', '\_') || '%')
  order by 4 desc, p.created_at desc, p.username
  limit greatest(1, least(coalesce(p_limit, 30), 60)) offset greatest(0, coalesce(p_offset, 0));
$$;

-- islas del mundo: primero quienes están en línea y luego las más recientes (antes eran solo las 32 más antiguas)
create or replace function public.world_island_summaries(p_limit integer default 32)
returns table (island_id uuid, username text, display_name text, country_code text, objects jsonb, level integer, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, p.username, p.display_name, p.country_code,
    coalesce((select jsonb_agg(s.value order by s.ordinality) from (
      select o.value, o.ordinality from jsonb_array_elements(coalesce(i.layout -> 'objects', '[]'::jsonb)) with ordinality as o(value, ordinality)
      order by o.ordinality limit 12) s), '[]'::jsonb),
    greatest(1, least(100, coalesce((i.layout ->> 'maxLevel')::integer, 1))),
    i.created_at
  from public.islands i
  join public.profiles p on p.id = i.owner_id
  left join public.island_presence pr on pr.user_id = i.owner_id and pr.last_seen_at > now() - interval '3 minutes'
  order by (pr.user_id is not null) desc, i.created_at desc, i.id
  limit greatest(1, least(coalesce(p_limit, 32), 48));
$$;

-- todas las islas de un país (para cuando alguien explora esa zona)
create or replace function public.world_islands_by_country(p_country text, p_limit integer default 30)
returns table (island_id uuid, username text, display_name text, country_code text, objects jsonb, level integer, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, p.username, p.display_name, p.country_code,
    coalesce((select jsonb_agg(s.value order by s.ordinality) from (
      select o.value, o.ordinality from jsonb_array_elements(coalesce(i.layout -> 'objects', '[]'::jsonb)) with ordinality as o(value, ordinality)
      order by o.ordinality limit 12) s), '[]'::jsonb),
    greatest(1, least(100, coalesce((i.layout ->> 'maxLevel')::integer, 1))),
    i.created_at
  from public.islands i join public.profiles p on p.id = i.owner_id
  where p.country_code = lower(p_country)
  order by i.created_at asc, i.id
  limit greatest(1, least(coalesce(p_limit, 30), 60));
$$;

-- cuántas islas y cuántas personas en línea hay en cada país
create or replace function public.island_counts_by_country()
returns table (country text, islands integer, online integer)
language sql stable security definer set search_path = '' as $$
  select p.country_code, count(*)::integer,
    count(*) filter (where pr.user_id is not null and pr.last_seen_at > now() - interval '3 minutes')::integer
  from public.profiles p
  join public.islands i on i.owner_id = p.id
  left join public.island_presence pr on pr.user_id = p.id
  where p.country_code is not null
  group by p.country_code;
$$;

revoke all on function public.touch_my_presence(), public.online_players(), public.directory_players(text, integer, integer),
  public.world_island_summaries(integer), public.world_islands_by_country(text, integer), public.island_counts_by_country() from public;
grant execute on function public.touch_my_presence() to authenticated;
grant execute on function public.online_players(), public.directory_players(text, integer, integer),
  public.world_island_summaries(integer), public.world_islands_by_country(text, integer), public.island_counts_by_country() to authenticated;
