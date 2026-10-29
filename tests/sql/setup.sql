-- Disposable CI database only. Not a Supabase migration.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;
create table public.islands (
  id uuid primary key, owner_id uuid not null, revision bigint not null default 0,
  layout jsonb not null default '{}', updated_at timestamptz default now()
);
insert into public.islands(id,owner_id) values
 ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
