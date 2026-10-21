-- duelos frutiger aero: dos personas juegan la misma partida (misma semilla) y gana quien puntúa más.
-- no hay apuesta de soles: los soles viven en la isla del cliente y el servidor no puede comprobarlos.

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check (game in ('bubbles', 'memory')),
  seed integer not null,
  challenger_score integer check (challenger_score >= 0),
  opponent_score integer check (opponent_score >= 0),
  status text not null default 'open' check (status in ('open', 'done', 'declined')),
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 days',
  constraint duels_not_self check (challenger_id <> opponent_id)
);
create index duels_challenger_idx on public.duels (challenger_id, created_at desc);
create index duels_opponent_idx on public.duels (opponent_id, created_at desc);
alter table public.duels enable row level security;
revoke all on public.duels from anon, authenticated;

create or replace function public.duel_max_score(p_game text) returns integer
language sql immutable set search_path = '' as $$
  select case p_game when 'bubbles' then 100 when 'memory' then 1000 else 0 end;
$$;

-- retar a otra persona. 5 duelos abiertos como máximo y uno por pareja y juego a la vez.
create or replace function public.create_duel(p_opponent text, p_game text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'crea tu isla antes de retar' using errcode = '42501'; end if;
  if p_game not in ('bubbles', 'memory') then raise exception 'juego inválido' using errcode = '22023'; end if;
  select id into v_target from public.profiles where username = lower(trim(p_opponent));
  if v_target is null then raise exception 'esa persona no existe' using errcode = '22023'; end if;
  if v_target = v_user then raise exception 'no puedes retarte a ti mismo' using errcode = '22023'; end if;
  if (select count(*) from public.duels where challenger_id = v_user and status = 'open' and expires_at > now()) >= 5 then
    raise exception 'ya tienes 5 duelos abiertos: espera a que terminen' using errcode = '22023';
  end if;
  if exists (select 1 from public.duels where status = 'open' and expires_at > now() and game = p_game
             and ((challenger_id = v_user and opponent_id = v_target) or (challenger_id = v_target and opponent_id = v_user))) then
    raise exception 'ya hay un duelo abierto con esa persona en ese juego' using errcode = '22023';
  end if;
  insert into public.duels (challenger_id, opponent_id, game, seed)
  values (v_user, v_target, p_game, floor(random() * 2147483646)::integer + 1)
  returning id into v_id;
  return v_id;
end;
$$;

-- mis duelos. el puntaje del rival solo se ve cuando yo ya jugué o el duelo terminó, para no copiar.
create or replace function public.my_duels()
returns table (id uuid, game text, seed integer, challenger text, opponent text, i_am_challenger boolean,
               my_score integer, their_score integer, status text, won boolean, tie boolean, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.game, d.seed, pc.username, po.username, (d.challenger_id = auth.uid()),
         case when d.challenger_id = auth.uid() then d.challenger_score else d.opponent_score end,
         case when d.status = 'done' or (case when d.challenger_id = auth.uid() then d.challenger_score else d.opponent_score end) is not null
              then case when d.challenger_id = auth.uid() then d.opponent_score else d.challenger_score end end,
         case when d.status = 'open' and d.expires_at <= now() then 'expired' else d.status end,
         (d.status = 'done' and d.winner_id = auth.uid()),
         (d.status = 'done' and d.winner_id is null),
         d.expires_at, d.created_at
  from public.duels d
  join public.profiles pc on pc.id = d.challenger_id
  join public.profiles po on po.id = d.opponent_id
  where auth.uid() in (d.challenger_id, d.opponent_id)
  order by d.created_at desc
  limit 30;
$$;

-- enviar mi puntaje. solo una vez, antes de que caduque, y dentro del máximo posible del juego.
create or replace function public.submit_duel_score(p_id uuid, p_score integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  d public.duels%rowtype;
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  select * into d from public.duels where id = p_id for update;
  if not found or v_user not in (d.challenger_id, d.opponent_id) then raise exception 'ese duelo no existe' using errcode = '22023'; end if;
  if d.status <> 'open' or d.expires_at <= now() then raise exception 'este duelo ya terminó' using errcode = '22023'; end if;
  if p_score is null or p_score < 0 or p_score > public.duel_max_score(d.game) then raise exception 'puntaje inválido' using errcode = '22023'; end if;
  if v_user = d.challenger_id then
    if d.challenger_score is not null then raise exception 'ya jugaste este duelo' using errcode = '22023'; end if;
    d.challenger_score := p_score;
  else
    if d.opponent_score is not null then raise exception 'ya jugaste este duelo' using errcode = '22023'; end if;
    d.opponent_score := p_score;
  end if;
  update public.duels set challenger_score = d.challenger_score, opponent_score = d.opponent_score where id = d.id;
  if d.challenger_score is not null and d.opponent_score is not null then
    update public.duels set status = 'done',
      winner_id = case when d.challenger_score > d.opponent_score then d.challenger_id
                       when d.opponent_score > d.challenger_score then d.opponent_id end
    where id = d.id;
  end if;
end;
$$;

-- rechazar un reto que todavía no jugué.
create or replace function public.decline_duel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  update public.duels set status = 'declined'
  where id = p_id and opponent_id = auth.uid() and status = 'open' and opponent_score is null;
end;
$$;

-- tabla de duelistas: victorias, empates y derrotas.
create or replace function public.duel_leaderboard()
returns table (username text, wins integer, losses integer, ties integer)
language sql stable security definer set search_path = '' as $$
  with sides as (
    select challenger_id as pid, winner_id, status from public.duels where status = 'done'
    union all
    select opponent_id, winner_id, status from public.duels where status = 'done'
  )
  select p.username,
         count(*) filter (where s.winner_id = s.pid)::integer,
         count(*) filter (where s.winner_id is not null and s.winner_id <> s.pid)::integer,
         count(*) filter (where s.winner_id is null)::integer
  from sides s join public.profiles p on p.id = s.pid
  group by p.username
  order by 2 desc, 3 asc, p.username
  limit 20;
$$;

revoke all on function public.duel_max_score(text), public.create_duel(text, text), public.my_duels(), public.submit_duel_score(uuid, integer), public.decline_duel(uuid), public.duel_leaderboard() from public;
grant execute on function public.create_duel(text, text), public.my_duels(), public.submit_duel_score(uuid, integer), public.decline_duel(uuid), public.duel_leaderboard() to authenticated;
