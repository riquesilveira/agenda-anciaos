-- Líderes de departamento com login, permissões por departamento e "Novidades".
--
-- Regras:
-- - anciãos e pastor: criam/editam qualquer programação da igreja;
-- - líder: vê tudo, mas só cria/edita/exclui programações dos departamentos
--   que lidera, e só de origem "local";
-- - só anciãos e pastor mexem em departamentos e convidam líderes.

-- Quem lidera cada departamento (um líder pode ter vários; um departamento, vários líderes).
create table departamento_lideres (
  departamento_id uuid not null references departamentos (id) on delete cascade,
  perfil_id uuid not null references perfis (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (departamento_id, perfil_id)
);
create index departamento_lideres_perfil_idx on departamento_lideres (perfil_id);

-- Até quando a pessoa já viu as novidades (programações criadas por outros).
alter table perfis add column novidades_vistas_em timestamptz not null default now();
grant update (novidades_vistas_em) on perfis to authenticated;

create or replace function meu_papel() returns papel_usuario
language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid()
$$;

create or replace function posso_editar_departamento(dep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when meu_papel() in ('anciao', 'pastor') then true
    when dep is null then false
    else exists (
      select 1 from departamento_lideres dl
      where dl.departamento_id = dep and dl.perfil_id = auth.uid()
    )
  end
$$;

revoke execute on function meu_papel() from public, anon;
revoke execute on function posso_editar_departamento(uuid) from public, anon;
grant execute on function meu_papel() to authenticated;
grant execute on function posso_editar_departamento(uuid) to authenticated;

-- Programações: leitura para todos da igreja; escrita conforme o papel.
drop policy "programações da igreja" on programacoes;
create policy "ver programações da igreja" on programacoes
  for select to authenticated using (igreja_id = minha_igreja());
create policy "criar programações" on programacoes
  for insert to authenticated
  with check (
    igreja_id = minha_igreja()
    and posso_editar_departamento(departamento_id)
    and (meu_papel() <> 'lider' or origem = 'local')
  );
create policy "editar programações" on programacoes
  for update to authenticated
  using (igreja_id = minha_igreja() and posso_editar_departamento(departamento_id))
  with check (
    igreja_id = minha_igreja()
    and posso_editar_departamento(departamento_id)
    and (meu_papel() <> 'lider' or origem = 'local')
  );
create policy "excluir programações" on programacoes
  for delete to authenticated
  using (igreja_id = minha_igreja() and posso_editar_departamento(departamento_id));

-- Departamentos: todos veem; só anciãos e pastor alteram.
drop policy "departamentos da igreja" on departamentos;
create policy "ver departamentos" on departamentos
  for select to authenticated using (igreja_id = minha_igreja());
create policy "anciãos gerem departamentos" on departamentos
  for all to authenticated
  using (igreja_id = minha_igreja() and meu_papel() in ('anciao', 'pastor'))
  with check (igreja_id = minha_igreja() and meu_papel() in ('anciao', 'pastor'));

-- Vínculo líder/departamento: todos da igreja veem; só anciãos e pastor alteram.
alter table departamento_lideres enable row level security;
create policy "ver líderes da igreja" on departamento_lideres
  for select to authenticated
  using (exists (select 1 from departamentos d where d.id = departamento_id and d.igreja_id = minha_igreja()));
create policy "anciãos gerem líderes" on departamento_lideres
  for all to authenticated
  using (
    meu_papel() in ('anciao', 'pastor')
    and exists (select 1 from departamentos d where d.id = departamento_id and d.igreja_id = minha_igreja())
  )
  with check (
    meu_papel() in ('anciao', 'pastor')
    and exists (select 1 from departamentos d where d.id = departamento_id and d.igreja_id = minha_igreja())
  );

grant select, insert, delete on departamento_lideres to authenticated;
revoke all on departamento_lideres from anon;
grant select, insert, update, delete on departamento_lideres to service_role;
