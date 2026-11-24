#!/usr/bin/env bash
# Testa a migration + RLS num Postgres local (sem Supabase).
# Uso: DATABASE_URL=postgres://... npm run test:db   (o banco é recriado)
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${DATABASE_URL:?defina DATABASE_URL apontando para um banco descartável}"
psql "$URL" -q -c "drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;" \
  -c "do \$\$ declare r text; begin
        foreach r in array array['anon','authenticated','service_role'] loop
          if exists (select 1 from pg_roles where rolname = r) then
            execute format('drop owned by %I', r); execute format('drop role %I', r);
          end if;
        end loop; end \$\$;" >/dev/null
psql "$URL" -q -c "select 1" >/dev/null
ARQS=(-f testes/stub_supabase.sql)
for m in migrations/*.sql; do ARQS+=(-f "$m"); done
psql "$URL" -q -v ON_ERROR_STOP=1 "${ARQS[@]}" -f testes/rls.sql
