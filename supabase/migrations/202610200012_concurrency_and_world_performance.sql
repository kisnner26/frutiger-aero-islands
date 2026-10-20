-- reduce la carga inicial del mundo y serializa acciones que pueden llegar repetidas
-- desde varias pestañas o dispositivos de una misma cuenta.

create or replace function public.world_island_summaries(p_limit integer default 32)
returns table (
  island_id uuid,
  username text,
  display_name text,
  country_code text,
  objects jsonb,
  level integer,
  created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    i.id,
    p.username,
    p.display_name,
    p.country_code,
    coalesce((
      select jsonb_agg(sample.value order by sample.ordinality)
      from (
        select object_rows.value, object_rows.ordinality
        from jsonb_array_elements(coalesce(i.layout -> 'objects', '[]'::jsonb))
          with ordinality as object_rows(value, ordinality)
        order by object_rows.ordinality
        limit 12
      ) sample
    ), '[]'::jsonb),
    greatest(1, least(100, coalesce((i.layout ->> 'maxLevel')::integer, 1))),
    i.created_at
  from public.islands i
  join public.profiles p on p.id = i.owner_id
  order by i.created_at asc, i.id asc
  limit greatest(1, least(coalesce(p_limit, 32), 48));
$$;

create or replace function public.complete_profile(p_username text, p_display_name text default null)
returns table (id uuid, username text, display_name text, island_id uuid, island_name text, layout jsonb, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_username text := lower(trim(p_username));
  v_display text := coalesce(nullif(trim(p_display_name), ''), v_username);
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if v_username !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'nombre de usuario inválido' using errcode = '22023'; end if;
  if char_length(v_display) > 40 then raise exception 'nombre público demasiado largo' using errcode = '22023'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('profile:' || v_user::text, 0));

  insert into public.profiles (id, username, display_name)
  values (v_user, v_username, v_display)
  on conflict on constraint profiles_pkey do update
    set display_name = excluded.display_name, updated_at = now();

  insert into public.islands (owner_id)
  values (v_user)
  on conflict (owner_id) do nothing;

  return query
    select p.id, p.username, p.display_name, i.id, i.name, i.layout, i.revision
    from public.profiles p
    join public.islands i on i.owner_id = p.id
    where p.id = v_user;
end;
$$;

create or replace function public.toggle_island_like(p_island_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('like:' || v_user::text || ':' || p_island_id::text, 0));
  if exists (select 1 from public.island_likes where island_id = p_island_id and user_id = v_user) then
    delete from public.island_likes where island_id = p_island_id and user_id = v_user;
    return false;
  end if;
  insert into public.island_likes (island_id, user_id) values (p_island_id, v_user);
  return true;
end;
$$;

create or replace function public.toggle_island_favorite(p_island_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('favorite:' || v_user::text || ':' || p_island_id::text, 0));
  if exists (select 1 from public.island_favorites where island_id = p_island_id and user_id = v_user) then
    delete from public.island_favorites where island_id = p_island_id and user_id = v_user;
    return false;
  end if;
  insert into public.island_favorites (island_id, user_id) values (p_island_id, v_user);
  return true;
end;
$$;

revoke all on function public.world_island_summaries(integer) from public;
revoke all on function public.complete_profile(text, text) from public;
revoke all on function public.toggle_island_like(uuid) from public;
revoke all on function public.toggle_island_favorite(uuid) from public;

grant execute on function public.world_island_summaries(integer) to authenticated;
grant execute on function public.complete_profile(text, text) to authenticated;
grant execute on function public.toggle_island_like(uuid) to authenticated;
grant execute on function public.toggle_island_favorite(uuid) to authenticated;
