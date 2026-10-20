-- personaje del jugador: cada campo es un entero pequeño que indexa opciones fijas del cliente (src/avatar/model.ts).
-- migración aditiva y sin aplicar. el cliente nunca escribe profiles.avatar directamente: solo set_my_avatar.

alter table public.profiles add column avatar jsonb;
alter table public.profiles add constraint profiles_avatar_shape
  check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) <= 1200));

-- el personaje es público (se muestra en la isla y en visitas)
grant select (avatar) on public.profiles to anon, authenticated;

create or replace function public.set_my_avatar(p_avatar jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_key text;
  v_val jsonb;
  v_num numeric;
  v_allowed text[] := array['v', 'skin', 'head', 'eyes', 'eyeColor', 'brows', 'nose', 'mouth', 'hair', 'hairColor', 'beard', 'top', 'topColor', 'bottom', 'bottomColor', 'shoes', 'shoesColor', 'accessory', 'accessoryColor', 'body', 'freckles'];
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if p_avatar is null or jsonb_typeof(p_avatar) <> 'object' then raise exception 'personaje no válido' using errcode = '22023'; end if;
  if (select count(*) from jsonb_object_keys(p_avatar)) <> array_length(v_allowed, 1) then
    raise exception 'personaje incompleto' using errcode = '22023';
  end if;
  for v_key, v_val in select key, value from jsonb_each(p_avatar) loop
    if not (v_key = any(v_allowed)) then raise exception 'campo no permitido: %', v_key using errcode = '22023'; end if;
    if jsonb_typeof(v_val) <> 'number' then raise exception 'valor no válido en %', v_key using errcode = '22023'; end if;
    v_num := (v_val #>> '{}')::numeric;
    if v_num <> trunc(v_num) or v_num < 0 or v_num > 11 then raise exception 'valor fuera de rango en %', v_key using errcode = '22023'; end if;
  end loop;
  update public.profiles set avatar = p_avatar, updated_at = now() where id = v_user;
  if not found then raise exception 'primero crea tu perfil' using errcode = 'P0002'; end if;
  return p_avatar;
end;
$$;

revoke all on function public.set_my_avatar(jsonb) from public;
grant execute on function public.set_my_avatar(jsonb) to authenticated;
