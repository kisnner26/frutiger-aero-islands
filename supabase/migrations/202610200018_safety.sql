-- seguridad de la comunidad: reportes de nombres e islas ofensivas y borrado de la propia cuenta.

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_username text not null check (target_username ~ '^[a-z][a-z0-9_]{2,23}$'),
  reason text not null check (reason in ('nombre', 'contenido', 'acoso', 'spam', 'otro')),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'nuevo' check (status in ('nuevo', 'revisado', 'descartado')),
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

-- reportar a una persona (su nombre o su isla). 5 reportes por día y uno por persona cada 24 horas.
create or replace function public.report_user(p_username text, p_reason text, p_note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_target text := lower(trim(p_username));
begin
  if v_user is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then raise exception 'crea tu isla antes de reportar' using errcode = '42501'; end if;
  if p_reason not in ('nombre', 'contenido', 'acoso', 'spam', 'otro') then raise exception 'motivo inválido' using errcode = '22023'; end if;
  if char_length(coalesce(p_note, '')) > 300 then raise exception 'la nota es demasiado larga' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where username = v_target) then raise exception 'esa persona no existe' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where id = v_user and username = v_target) then raise exception 'no puedes reportarte a ti mismo' using errcode = '22023'; end if;
  if (select count(*) from public.reports where reporter_id = v_user and created_at > now() - interval '1 day') >= 5 then
    raise exception 'ya enviaste varios reportes hoy: gracias, los revisaremos' using errcode = '22023';
  end if;
  if exists (select 1 from public.reports where reporter_id = v_user and target_username = v_target and created_at > now() - interval '1 day') then
    return; -- ya reportado hoy: no se duplica
  end if;
  insert into public.reports (reporter_id, target_username, reason, note) values (v_user, v_target, p_reason, coalesce(trim(p_note), ''));
end;
$$;

-- borrar la propia cuenta y todo lo que cuelga de ella (perfil, isla, parcelas, reportes enviados...)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sesión requerida' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.report_user(text, text, text), public.delete_my_account() from public;
grant execute on function public.report_user(text, text, text), public.delete_my_account() to authenticated;
