-- zona geográfica de cada isla: el país lo elige la persona y fija en qué parte del mundo aparece su isla.
-- migración aditiva: no modifica complete_profile ni save_island. la lista de códigos debe coincidir con src/world/countries.ts (hay una prueba que lo comprueba).
-- estado: escrita y revisada, NO aplicada a ningún proyecto de supabase.

create table public.countries (
  code text primary key check (code ~ '^[a-z]{2}$')
);

insert into public.countries (code) values
  ('us'),
  ('ca'),
  ('mx'),
  ('gt'),
  ('sv'),
  ('hn'),
  ('ni'),
  ('cr'),
  ('pa'),
  ('cu'),
  ('do'),
  ('pr'),
  ('jm'),
  ('ht'),
  ('co'),
  ('ve'),
  ('ec'),
  ('pe'),
  ('bo'),
  ('br'),
  ('py'),
  ('uy'),
  ('ar'),
  ('cl'),
  ('es'),
  ('pt'),
  ('fr'),
  ('it'),
  ('de'),
  ('gb'),
  ('ie'),
  ('nl'),
  ('be'),
  ('ch'),
  ('at'),
  ('se'),
  ('no'),
  ('fi'),
  ('dk'),
  ('pl'),
  ('cz'),
  ('gr'),
  ('tr'),
  ('ua'),
  ('ro'),
  ('ru'),
  ('hu'),
  ('rs'),
  ('hr'),
  ('bg'),
  ('is'),
  ('ma'),
  ('dz'),
  ('tn'),
  ('eg'),
  ('ng'),
  ('gh'),
  ('sn'),
  ('ci'),
  ('cm'),
  ('et'),
  ('ke'),
  ('tz'),
  ('ug'),
  ('za'),
  ('ao'),
  ('mz'),
  ('zw'),
  ('cd'),
  ('ly'),
  ('sd'),
  ('mg'),
  ('gq'),
  ('cn'),
  ('jp'),
  ('kr'),
  ('in'),
  ('pk'),
  ('bd'),
  ('id'),
  ('ph'),
  ('vn'),
  ('th'),
  ('my'),
  ('sg'),
  ('tw'),
  ('sa'),
  ('ae'),
  ('il'),
  ('ir'),
  ('iq'),
  ('kz'),
  ('np'),
  ('lk'),
  ('mn'),
  ('bz'),
  ('tt'),
  ('bs'),
  ('bb'),
  ('lt'),
  ('lv'),
  ('ee'),
  ('sk'),
  ('si'),
  ('lu'),
  ('cy'),
  ('mt'),
  ('ge'),
  ('am'),
  ('az'),
  ('uz'),
  ('kh'),
  ('la'),
  ('mm'),
  ('af'),
  ('jo'),
  ('lb'),
  ('kw'),
  ('qa'),
  ('om'),
  ('ye'),
  ('bw'),
  ('na'),
  ('zm'),
  ('mw'),
  ('ml'),
  ('ne'),
  ('td'),
  ('bf'),
  ('gn'),
  ('sl'),
  ('lr'),
  ('so'),
  ('pg'),
  ('fj'),
  ('au'),
  ('nz');

alter table public.countries enable row level security;
revoke all on public.countries from anon, authenticated;
grant select on public.countries to anon, authenticated;
create policy "countries public read" on public.countries for select using (true);

alter table public.profiles
  add column country_code text references public.countries(code),
  add column country_changed_at timestamptz;

create index profiles_country_idx on public.profiles (country_code);

-- el país es público (sirve para ubicar la isla); la fecha del último cambio es privada
grant select (country_code) on public.profiles to anon, authenticated;

-- fija o cambia el país de quien llama. el cliente nunca escribe la tabla directamente.
-- regla: se puede elegir libremente la primera vez; después, un cambio como máximo cada 30 días.
create or replace function public.set_my_country(p_country text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := lower(trim(p_country));
  v_current text;
  v_changed timestamptz;
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if v_code !~ '^[a-z]{2}$' or not exists (select 1 from public.countries where code = v_code) then
    raise exception 'país no válido' using errcode = '22023';
  end if;
  select country_code, country_changed_at into v_current, v_changed from public.profiles where id = v_user for update;
  if not found then raise exception 'primero crea tu perfil' using errcode = 'P0002'; end if;
  if v_current is not null and v_current <> v_code and v_changed is not null and v_changed > now() - interval '30 days' then
    raise exception 'solo puedes cambiar de país una vez cada 30 días' using errcode = '42501';
  end if;
  update public.profiles
     set country_code = v_code,
         country_changed_at = case when v_current is distinct from v_code then now() else country_changed_at end,
         updated_at = now()
   where id = v_user;
  return v_code;
end;
$$;

revoke all on function public.set_my_country(text) from public;
grant execute on function public.set_my_country(text) to authenticated;
