-- aporte acotado: cada jugador puede sumar como máximo 100 por expedición, así el progreso refleja personas reales y no clics repetidos.
create or replace function public.contribute_to_expedition(p_expedition_id text, p_amount integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_progress integer; v_mine integer; v_add integer;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if p_amount < 1 or p_amount > 100 then raise exception 'aporte inválido' using errcode = '22023'; end if;
  select coalesce(amount, 0) into v_mine from public.expedition_contributions where expedition_id = p_expedition_id and user_id = auth.uid();
  v_mine := coalesce(v_mine, 0);
  v_add := least(p_amount, 100 - v_mine);
  if v_add <= 0 then raise exception 'ya aportaste el máximo a esta expedición' using errcode = '22023'; end if;
  update public.expeditions set progress = least(goal, progress + v_add) where id = p_expedition_id and closes_at > now() returning progress into v_progress;
  if not found then raise exception 'expedición no disponible' using errcode = 'P0002'; end if;
  insert into public.expedition_contributions (expedition_id, user_id, amount) values (p_expedition_id, auth.uid(), v_add)
  on conflict (expedition_id, user_id) do update set amount = public.expedition_contributions.amount + excluded.amount, created_at = now();
  return v_progress;
end; $$;

create or replace function public.my_expedition_contributions()
returns table (expedition_id text, amount integer) language sql security definer set search_path = '' as $$
  select expedition_id, amount from public.expedition_contributions where user_id = auth.uid();
$$;
grant execute on function public.contribute_to_expedition(text, integer), public.my_expedition_contributions() to authenticated;
