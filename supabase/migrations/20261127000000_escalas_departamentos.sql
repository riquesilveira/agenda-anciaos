-- Escalas dos departamentos (Música, Sonoplastia, Diaconato…).
-- O líder cadastra a equipe (associados, sem login) e monta os dias da
-- escala em qualquer data, com várias pessoas e a função de cada uma.
-- Todos da igreja veem; editam o líder do departamento e anciãos/pastor
-- (mesma regra de posso_editar_departamento).

create table departamento_membros (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references departamentos (id) on delete cascade,
  nome text not null,
  whatsapp text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index departamento_membros_dep_idx on departamento_membros (departamento_id);

create table escala_dias (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references departamentos (id) on delete cascade,
  data date not null,
  horario time,
  titulo text,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index escala_dias_dep_data_idx on escala_dias (departamento_id, data);
create trigger escala_dias_updated_at before update on escala_dias
  for each row execute function tocar_updated_at();

create table escala_dia_pessoas (
  id uuid primary key default gen_random_uuid(),
  escala_dia_id uuid not null references escala_dias (id) on delete cascade,
  membro_id uuid not null references departamento_membros (id) on delete cascade,
  funcao text,
  avisado_em timestamptz,
  ordem int not null default 0
);
create index escala_dia_pessoas_dia_idx on escala_dia_pessoas (escala_dia_id);

-- departamento pertence à igreja de quem está logado?
create or replace function departamento_da_minha_igreja(dep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from departamentos d where d.id = dep and d.igreja_id = minha_igreja())
$$;
revoke execute on function departamento_da_minha_igreja(uuid) from public, anon;
grant execute on function departamento_da_minha_igreja(uuid) to authenticated;

alter table departamento_membros enable row level security;
alter table escala_dias enable row level security;
alter table escala_dia_pessoas enable row level security;

create policy "ver equipe" on departamento_membros for select to authenticated
  using (departamento_da_minha_igreja(departamento_id));
create policy "gerir equipe" on departamento_membros for all to authenticated
  using (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id))
  with check (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id));

create policy "ver dias da escala" on escala_dias for select to authenticated
  using (departamento_da_minha_igreja(departamento_id));
create policy "gerir dias da escala" on escala_dias for all to authenticated
  using (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id))
  with check (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id));

create policy "ver pessoas da escala" on escala_dia_pessoas for select to authenticated
  using (exists (select 1 from escala_dias e where e.id = escala_dia_id and departamento_da_minha_igreja(e.departamento_id)));
create policy "gerir pessoas da escala" on escala_dia_pessoas for all to authenticated
  using (exists (
    select 1 from escala_dias e
    where e.id = escala_dia_id and departamento_da_minha_igreja(e.departamento_id) and posso_editar_departamento(e.departamento_id)
  ))
  with check (exists (
    select 1 from escala_dias e join departamento_membros m on m.id = membro_id
    where e.id = escala_dia_id and m.departamento_id = e.departamento_id
      and departamento_da_minha_igreja(e.departamento_id) and posso_editar_departamento(e.departamento_id)
  ));

grant select, insert, update, delete on departamento_membros, escala_dias, escala_dia_pessoas to authenticated, service_role;
revoke all on departamento_membros, escala_dias, escala_dia_pessoas from anon;
