-- Simula o mínimo do Supabase para testar a migration num Postgres puro.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated, anon;
grant usage on schema public to authenticated, anon;
create role service_role nologin bypassrls;
grant usage on schema public to service_role;
-- Como nos projetos novos do Supabase: tabelas criadas por SQL NÃO ganham
-- select/insert/update/delete automático para os papéis da API.
alter default privileges in schema public grant references, trigger, truncate on tables to authenticated, anon, service_role;
alter default privileges in schema public grant all on functions to authenticated, anon;
