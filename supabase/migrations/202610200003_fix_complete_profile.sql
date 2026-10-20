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

grant execute on function public.complete_profile(text, text) to authenticated;
