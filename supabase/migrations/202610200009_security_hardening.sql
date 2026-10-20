-- endurecimiento previo a lanzamiento: el navegador no puede subir layouts arbitrarios y
-- las funciones de juego quedan exclusivamente para usuarios autenticados.
-- nota: la economía competitiva debe otorgar recompensas mediante RPC del servidor;
-- save_island solo conserva el diseño y comprueba su forma.
create or replace function public.save_island(p_island_id uuid, p_expected_revision bigint, p_layout jsonb)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_revision bigint;
  v_count integer;
  v_distinct_count integer;
begin
  if auth.uid() is null then
    raise exception 'sesión requerida' using errcode = '42501';
  end if;
  if p_expected_revision < 0 then
    raise exception 'revisión inválida' using errcode = '22023';
  end if;
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' or pg_column_size(p_layout) > 262144 then
    raise exception 'diseño inválido' using errcode = '22023';
  end if;
  if jsonb_typeof(p_layout -> 'objects') <> 'array' or jsonb_array_length(p_layout -> 'objects') > 150 then
    raise exception 'objetos inválidos' using errcode = '22023';
  end if;
  if jsonb_typeof(p_layout -> 'brillos') <> 'number' or jsonb_typeof(p_layout -> 'maxLevel') <> 'number'
    or jsonb_typeof(p_layout -> 'stats') <> 'object'
    or jsonb_typeof(p_layout -> 'stats' -> 'pops') <> 'number'
    or jsonb_typeof(p_layout -> 'stats' -> 'bestCombo') <> 'number' then
    raise exception 'progreso inválido' using errcode = '22023';
  end if;
  if (p_layout ->> 'brillos')::numeric < 0 or (p_layout ->> 'brillos')::numeric > 1000000000
    or mod((p_layout ->> 'brillos')::numeric, 1) <> 0
    or (p_layout ->> 'maxLevel')::numeric < 1 or (p_layout ->> 'maxLevel')::numeric > 100
    or mod((p_layout ->> 'maxLevel')::numeric, 1) <> 0
    or (p_layout -> 'stats' ->> 'pops')::numeric < 0
    or mod((p_layout -> 'stats' ->> 'pops')::numeric, 1) <> 0
    or (p_layout -> 'stats' ->> 'bestCombo')::numeric < 0
    or mod((p_layout -> 'stats' ->> 'bestCombo')::numeric, 1) <> 0 then
    raise exception 'progreso fuera de rango' using errcode = '22023';
  end if;

  select count(*), count(distinct o ->> 'id')
    into v_count, v_distinct_count
    from jsonb_array_elements(p_layout -> 'objects') as o;
  if v_count <> v_distinct_count or exists (
    select 1 from jsonb_array_elements(p_layout -> 'objects') as o
    where jsonb_typeof(o) <> 'object'
      or jsonb_typeof(o -> 'id') <> 'string' or char_length(o ->> 'id') not between 1 and 80
      or jsonb_typeof(o -> 'assetId') <> 'string'
      or o ->> 'assetId' not in ('palmera', 'arbol', 'flores', 'roca', 'cristal', 'pez', 'fuente', 'pabellon')
      or jsonb_typeof(o -> 'x') <> 'number' or jsonb_typeof(o -> 'y') <> 'number'
      or jsonb_typeof(o -> 'scale') <> 'number' or jsonb_typeof(o -> 'rotation') <> 'number'
      or (o ->> 'x')::numeric < 0 or (o ->> 'x')::numeric > 1000 or mod((o ->> 'x')::numeric, 1) <> 0
      or (o ->> 'y')::numeric < 0 or (o ->> 'y')::numeric > 1000 or mod((o ->> 'y')::numeric, 1) <> 0
      or (o ->> 'scale')::numeric < 0.7 or (o ->> 'scale')::numeric > 2
      or (o ->> 'rotation')::numeric not in (0, 1)
  ) then
    raise exception 'uno de los objetos no es válido' using errcode = '22023';
  end if;

  select i.owner_id, i.revision into v_owner, v_revision
    from public.islands i where i.id = p_island_id for update;
  if not found then raise exception 'isla no encontrada' using errcode = 'P0002'; end if;
  if v_owner <> auth.uid() then raise exception 'no puedes modificar esta isla' using errcode = '42501'; end if;
  if v_revision <> p_expected_revision then
    raise exception 'conflicto de edición: recarga la isla antes de guardar' using errcode = '40001';
  end if;

  update public.islands i
    set layout = p_layout, revision = i.revision + 1, updated_at = now()
    where i.id = p_island_id
    returning i.revision, i.updated_at into revision, updated_at;
  return next;
end;
$$;

revoke all on function public.complete_profile(text, text) from public;
revoke all on function public.save_island(uuid, bigint, jsonb) from public;
revoke all on function public.island_social_status(uuid) from public;
revoke all on function public.toggle_island_like(uuid) from public;
revoke all on function public.toggle_island_favorite(uuid) from public;
revoke all on function public.touch_island_presence(uuid) from public;
revoke all on function public.world_presence() from public;
revoke all on function public.contribute_to_expedition(text, integer) from public;
revoke all on function public.my_expedition_contributions() from public;

revoke execute on function public.world_presence() from anon;
grant execute on function public.complete_profile(text, text), public.save_island(uuid, bigint, jsonb),
  public.island_social_status(uuid), public.toggle_island_like(uuid), public.toggle_island_favorite(uuid),
  public.touch_island_presence(uuid), public.world_presence(), public.contribute_to_expedition(text, integer),
  public.my_expedition_contributions() to authenticated;
