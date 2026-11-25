-- Aparelhos (navegadores) em que cada pessoa ativou as notificações.
create table push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  created_at timestamptz not null default now()
);
create index push_inscricoes_perfil_idx on push_inscricoes (perfil_id);

alter table push_inscricoes enable row level security;
-- Cada pessoa só vê e gerencia as próprias inscrições. O envio usa a service role.
create policy "minhas inscrições" on push_inscricoes
  for all to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid());

grant select, insert, update, delete on push_inscricoes to authenticated;
revoke all on push_inscricoes from anon;
grant select, insert, update, delete on push_inscricoes to service_role;
