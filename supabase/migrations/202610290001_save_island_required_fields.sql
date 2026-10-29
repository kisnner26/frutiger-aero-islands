-- Reject missing/JSON-null required fields instead of SQL UNKNOWN bypassing validation.
-- terreno sin techo: las islas ampliadas pueden usar coordenadas lejos del centro (-50000..51000),
-- guardar hasta 1000 objetos (150 + 25 por cada tamaño comprado pasado el 5.º) y llevar `landExtra` (0..400).
-- el resto de validaciones es igual que en 0014.
create or replace function public.save_island(p_island_id uuid, p_expected_revision bigint, p_layout jsonb)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_revision bigint;
  v_count integer;
  v_distinct_count integer;
  v_extra integer := 0;
  v_tier integer;
  v_max_objects integer;
begin
  if auth.uid() is null then
    raise exception 'sesión requerida' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'revisión inválida' using errcode = '22023';
  end if;
  if p_layout is null or jsonb_typeof(p_layout) is distinct from 'object' or pg_column_size(p_layout) > 262144 then
    raise exception 'diseño inválido' using errcode = '22023';
  end if;
  if jsonb_typeof(p_layout -> 'objects') is distinct from 'array' or jsonb_array_length(p_layout -> 'objects') > 1000 then
    raise exception 'objetos inválidos' using errcode = '22023';
  end if;
  if jsonb_typeof(p_layout -> 'brillos') is distinct from 'number' or jsonb_typeof(p_layout -> 'maxLevel') is distinct from 'number'
    or jsonb_typeof(p_layout -> 'stats') is distinct from 'object'
    or jsonb_typeof(p_layout -> 'stats' -> 'pops') is distinct from 'number'
    or jsonb_typeof(p_layout -> 'stats' -> 'bestCombo') is distinct from 'number' then
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

  if p_layout ? 'landExtra' then
    if jsonb_typeof(p_layout -> 'landExtra') is distinct from 'number'
      or (p_layout ->> 'landExtra')::numeric < 0 or (p_layout ->> 'landExtra')::numeric > 400
      or mod((p_layout ->> 'landExtra')::numeric, 1) <> 0 then
      raise exception 'terreno inválido' using errcode = '22023';
    end if;
    v_extra := (p_layout ->> 'landExtra')::integer;
  end if;
  v_tier := case
    when (p_layout ->> 'maxLevel')::numeric >= 14 then 4
    when (p_layout ->> 'maxLevel')::numeric >= 10 then 3
    when (p_layout ->> 'maxLevel')::numeric >= 7 then 2
    when (p_layout ->> 'maxLevel')::numeric >= 4 then 1
    else 0 end;
  v_max_objects := least(1000, 150 + 25 * greatest(0, v_tier + v_extra - 4));
  if jsonb_array_length(p_layout -> 'objects') > v_max_objects then
    raise exception 'objetos inválidos' using errcode = '22023';
  end if;

  select count(*), count(distinct o ->> 'id')
    into v_count, v_distinct_count
    from jsonb_array_elements(p_layout -> 'objects') as o;
  if v_count <> v_distinct_count or exists (
    select 1 from jsonb_array_elements(p_layout -> 'objects') as o
    where jsonb_typeof(o) is distinct from 'object'
      or jsonb_typeof(o -> 'id') is distinct from 'string' or char_length(o ->> 'id') not between 1 and 80
      or jsonb_typeof(o -> 'assetId') is distinct from 'string'
      or o ->> 'assetId' not in ('palmera', 'arbol', 'flores', 'roca', 'cristal', 'pez', 'fuente', 'pabellon', 'girasol', 'arbusto', 'banco', 'hongos', 'farol', 'nenufar', 'burbuja', 'boya', 'columpio', 'picnic', 'medusa', 'molino', 'velero', 'casita', 'delfin', 'estatua', 'globo', 'arcoiris', 'maceta', 'pecera', 'cd', 'monitor', 'nube', 'puente', 'antena', 'gota', 'tortuga', 'cascada', 'arbol_cristal', 'ballena', 'orbe')
      or jsonb_typeof(o -> 'x') is distinct from 'number' or jsonb_typeof(o -> 'y') is distinct from 'number'
      or jsonb_typeof(o -> 'scale') is distinct from 'number' or jsonb_typeof(o -> 'rotation') is distinct from 'number'
      or (o ->> 'x')::numeric < -50000 or (o ->> 'x')::numeric > 51000 or mod((o ->> 'x')::numeric, 1) <> 0
      or (o ->> 'y')::numeric < -50000 or (o ->> 'y')::numeric > 51000 or mod((o ->> 'y')::numeric, 1) <> 0
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

revoke all on function public.save_island(uuid, bigint, jsonb) from public;
grant execute on function public.save_island(uuid, bigint, jsonb) to authenticated;
