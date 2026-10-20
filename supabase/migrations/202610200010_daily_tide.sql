-- recompensa diaria validada por postgres. usa UTC para que el ciclo sea igual para toda la comunidad.
create table public.daily_tides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0 check (streak between 0 and 7),
  last_claimed_on date,
  updated_at timestamptz not null default now()
);

alter table public.daily_tides enable row level security;
revoke all on public.daily_tides from anon, authenticated;

create or replace function public.my_daily_tide()
returns table (streak integer, can_claim boolean, last_claimed_on date)
language plpgsql security definer set search_path = '' as $$
declare v_today date := timezone('utc', now())::date;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  return query
    select coalesce(t.streak, 0), coalesce(t.last_claimed_on <> v_today, true), t.last_claimed_on
    from (select 1) seed
    left join public.daily_tides t on t.user_id = auth.uid();
end;
$$;

create or replace function public.claim_daily_tide()
returns table (streak integer, water integer, crystals integer, leaves integer, reward_water integer, reward_crystals integer, reward_leaves integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := timezone('utc', now())::date;
  v_last date;
  v_streak integer;
  v_water_reward integer;
  v_crystal_reward integer;
  v_leaf_reward integer;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;

  insert into public.daily_tides (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select t.last_claimed_on, t.streak into v_last, v_streak
    from public.daily_tides t where t.user_id = auth.uid() for update;
  if v_last = v_today then
    raise exception 'la marea de hoy ya fue recogida' using errcode = '22023';
  end if;

  v_streak := case when v_last = v_today - 1 then least(v_streak + 1, 7) else 1 end;
  v_water_reward := 8 + v_streak * 2;
  v_crystal_reward := 1 + floor(v_streak / 3.0)::integer;
  v_leaf_reward := 4 + v_streak;

  insert into public.player_resources (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.player_resources r
    set water = r.water + v_water_reward,
        crystals = r.crystals + v_crystal_reward,
        leaves = r.leaves + v_leaf_reward,
        updated_at = now()
    where r.user_id = auth.uid()
    returning r.water, r.crystals, r.leaves into water, crystals, leaves;

  update public.daily_tides t
    set streak = v_streak, last_claimed_on = v_today, updated_at = now()
    where t.user_id = auth.uid();

  streak := v_streak;
  reward_water := v_water_reward;
  reward_crystals := v_crystal_reward;
  reward_leaves := v_leaf_reward;
  return next;
end;
$$;

revoke all on function public.my_daily_tide() from public;
revoke all on function public.claim_daily_tide() from public;
grant execute on function public.my_daily_tide(), public.claim_daily_tide() to authenticated;
