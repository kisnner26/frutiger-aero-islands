-- endurece el guardado del juego online: limita el documento, conserva control optimista y evita
-- que un perfil pueda escribir layouts arbitrariamente grandes o incompletos.
create index if not exists island_presence_seen_idx on public.island_presence (last_seen_at desc);
create index if not exists expedition_contributions_user_idx on public.expedition_contributions (user_id, expedition_id);

create or replace function public.save_island(p_island_id uuid, p_expected_revision bigint, p_layout jsonb)
returns table (revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_revision bigint;
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if p_expected_revision < 0 then raise exception 'revisión inválida' using errcode = '22023'; end if;
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' or pg_column_size(p_layout) > 262144
    or jsonb_typeof(p_layout -> 'objects') <> 'array' or jsonb_array_length(p_layout -> 'objects') > 150
    or jsonb_typeof(p_layout -> 'brillos') <> 'number' or jsonb_typeof(p_layout -> 'maxLevel') <> 'number'
    or jsonb_typeof(p_layout -> 'stats') <> 'object' then
    raise exception 'diseño inválido' using errcode = '22023';
  end if;

  select i.owner_id, i.revision into v_owner, v_revision
    from public.islands i where i.id = p_island_id for update;
  if not found then raise exception 'isla no encontrada' using errcode = 'P0002'; end if;
  if v_owner <> auth.uid() then raise exception 'no puedes modificar esta isla' using errcode = '42501'; end if;
  if v_revision <> p_expected_revision then raise exception 'conflicto de edición: recarga la isla antes de guardar' using errcode = '40001'; end if;

  update public.islands i
    set layout = p_layout, revision = i.revision + 1, updated_at = now()
    where i.id = p_island_id
    returning i.revision, i.updated_at into revision, updated_at;
  return next;
end;
$$;

grant execute on function public.save_island(uuid, bigint, jsonb) to authenticated;
