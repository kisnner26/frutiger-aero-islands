-- top 100 de jugadores. la puntuación solo usa cosas que el servidor puede comprobar (no el progreso que guarda el cliente):
--   10 por cada parcela que tienes ahora, 3 por reclamar, 15 por capturar, 5 por restaurar y 2 por cada me gusta recibido.
-- hay dos periodos: 'semana' (acciones de esta semana) y 'siempre'.

create or replace function public.leaderboard_scores(p_period text)
returns table (user_id uuid, score integer, parcels integer, claims integer, captures integer, restores integer, likes integer)
language sql stable security definer set search_path = '' as $$
  with ev as (
    select e.user_id,
      count(*) filter (where e.kind = 'claim')::integer as claims,
      count(*) filter (where e.kind = 'capture')::integer as captures,
      count(*) filter (where e.kind = 'restore')::integer as restores
    from public.parcel_events e
    where p_period <> 'semana' or e.created_at >= date_trunc('week', now())
    group by e.user_id
  ),
  own as (
    select p.owner_id as user_id, count(*)::integer as n from public.parcels p group by p.owner_id
  ),
  lk as (
    select i.owner_id as user_id, count(*)::integer as n
    from public.island_likes l join public.islands i on i.id = l.island_id
    where p_period <> 'semana' or l.created_at >= date_trunc('week', now())
    group by i.owner_id
  ),
  ids as (select user_id from ev union select user_id from own union select user_id from lk)
  select ids.user_id,
    (coalesce(own.n, 0) * 10 + coalesce(ev.claims, 0) * 3 + coalesce(ev.captures, 0) * 15 + coalesce(ev.restores, 0) * 5 + coalesce(lk.n, 0) * 2)::integer,
    coalesce(own.n, 0), coalesce(ev.claims, 0), coalesce(ev.captures, 0), coalesce(ev.restores, 0), coalesce(lk.n, 0)
  from ids
  left join ev on ev.user_id = ids.user_id
  left join own on own.user_id = ids.user_id
  left join lk on lk.user_id = ids.user_id;
$$;

create or replace function public.leaderboard_top(p_period text default 'siempre')
returns table (rank integer, username text, country text, score integer, parcels integer, restores integer, captures integer, likes integer)
language sql stable security definer set search_path = '' as $$
  select (row_number() over (order by s.score desc, pr.created_at asc, pr.username))::integer,
    pr.username, pr.country_code, s.score, s.parcels, s.restores, s.captures, s.likes
  from public.leaderboard_scores(case when p_period = 'semana' then 'semana' else 'siempre' end) s
  join public.profiles pr on pr.id = s.user_id
  where s.score > 0
  order by 1
  limit 100;
$$;

-- tu posición aunque estés fuera del top 100
create or replace function public.leaderboard_me(p_period text default 'siempre')
returns table (rank integer, score integer, total integer)
language sql stable security definer set search_path = '' as $$
  with s as (
    select x.user_id, x.score, pr.created_at,
      row_number() over (order by x.score desc, pr.created_at asc, pr.username) as pos
    from public.leaderboard_scores(case when p_period = 'semana' then 'semana' else 'siempre' end) x
    join public.profiles pr on pr.id = x.user_id
    where x.score > 0
  )
  select (select pos::integer from s where s.user_id = auth.uid()),
    coalesce((select s.score from s where s.user_id = auth.uid()), 0),
    (select count(*)::integer from s);
$$;

revoke all on function public.leaderboard_scores(text), public.leaderboard_top(text), public.leaderboard_me(text) from public;
revoke execute on function public.leaderboard_scores(text) from anon, authenticated;
grant execute on function public.leaderboard_top(text) to anon, authenticated;
grant execute on function public.leaderboard_me(text) to anon, authenticated;
