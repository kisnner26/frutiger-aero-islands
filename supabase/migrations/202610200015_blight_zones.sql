-- zonas dañadas: ya no todo el planeta está gris. solo hay unos pocos rincones apartados (lejos de los países donde viven las islas)
-- que la gente puede encontrar y restaurar entre varias personas. el resto del mundo está sano.

create table public.blight_cells (
  cx smallint not null,
  cy smallint not null,
  zone text not null,
  primary key (cx, cy),
  constraint blight_bounds check (cx between 0 and 23 and cy between 0 and 23)
);
alter table public.blight_cells enable row level security;
revoke all on public.blight_cells from anon, authenticated;

insert into public.blight_cells (cx, cy, zone) values
  (12, 23, 'la fábrica muda'),
  (11, 23, 'la fábrica muda'),
  (12, 22, 'la fábrica muda'),
  (13, 23, 'la fábrica muda'),
  (11, 22, 'la fábrica muda'),
  (13, 22, 'la fábrica muda'),
  (4, 5, 'el valle opaco'),
  (3, 5, 'el valle opaco'),
  (4, 4, 'el valle opaco'),
  (4, 6, 'el valle opaco'),
  (5, 5, 'el valle opaco'),
  (3, 4, 'el valle opaco'),
  (3, 6, 'el valle opaco'),
  (5, 4, 'el valle opaco'),
  (9, 1, 'el mar turbio'),
  (8, 1, 'el mar turbio'),
  (9, 2, 'el mar turbio'),
  (10, 1, 'el mar turbio'),
  (8, 2, 'el mar turbio'),
  (10, 0, 'el mar turbio'),
  (10, 2, 'el mar turbio'),
  (7, 1, 'el mar turbio'),
  (16, 19, 'la ciudad plana'),
  (15, 19, 'la ciudad plana'),
  (16, 20, 'la ciudad plana'),
  (17, 19, 'la ciudad plana'),
  (15, 18, 'la ciudad plana'),
  (15, 20, 'la ciudad plana'),
  (17, 18, 'la ciudad plana'),
  (17, 20, 'la ciudad plana'),
  (2, 18, 'el puerto de ceniza'),
  (2, 17, 'el puerto de ceniza'),
  (3, 18, 'el puerto de ceniza'),
  (3, 17, 'el puerto de ceniza'),
  (3, 19, 'el puerto de ceniza'),
  (0, 13, 'el campo seco'),
  (0, 12, 'el campo seco'),
  (1, 13, 'el campo seco'),
  (1, 12, 'el campo seco'),
  (1, 14, 'el campo seco'),
  (2, 13, 'el campo seco'),
  (1, 15, 'el campo seco'),
  (2, 12, 'el campo seco'),
  (21, 12, 'la antena apagada'),
  (21, 13, 'la antena apagada'),
  (22, 12, 'la antena apagada'),
  (20, 13, 'la antena apagada'),
  (22, 11, 'la antena apagada'),
  (10, 10, 'el lago de aceite'),
  (9, 10, 'el lago de aceite'),
  (10, 9, 'el lago de aceite'),
  (10, 11, 'el lago de aceite'),
  (9, 9, 'el lago de aceite'),
  (11, 11, 'el lago de aceite')
on conflict (cx, cy) do nothing;

-- solo se puede restaurar donde hay zona dañada
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
  if not exists (select 1 from public.blight_cells b where b.cx = p_cx and b.cy = p_cy) then
    raise exception 'esta zona está sana: busca las zonas grises del mapa' using errcode = '22023';
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

-- las celdas dañadas con su avance (las sanas no aparecen)
drop function if exists public.world_restoration();
create function public.world_restoration()
returns table (cx smallint, cy smallint, progress integer, zone text)
language sql stable security definer set search_path = '' as $$
  select b.cx, b.cy, coalesce(r.progress, 0), b.zone
  from public.blight_cells b left join public.parcel_restoration r on r.cx = b.cx and r.cy = b.cy;
$$;

-- el porcentaje del planeta se mide solo sobre las zonas dañadas
drop function if exists public.restoration_summary();
create function public.restoration_summary()
returns table (total_cells integer, restored_cells integer, percent numeric, helpers integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from public.blight_cells),
    (select count(*)::integer from public.blight_cells b join public.parcel_restoration r on r.cx = b.cx and r.cy = b.cy where r.progress >= 100),
    round(coalesce((select sum(coalesce(r.progress, 0)) from public.blight_cells b left join public.parcel_restoration r on r.cx = b.cx and r.cy = b.cy), 0)::numeric
      / greatest(1, (select count(*) from public.blight_cells)), 2),
    (select count(distinct c.user_id)::integer from public.parcel_contributions c join public.blight_cells b on b.cx = c.cx and b.cy = c.cy);
$$;

revoke all on function public.restore_parcel(integer, integer), public.world_restoration(), public.restoration_summary() from public;
grant execute on function public.restore_parcel(integer, integer) to authenticated;
grant execute on function public.world_restoration(), public.restoration_summary() to anon, authenticated;
