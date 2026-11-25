-- Lembretes automáticos para associados (sem login), por notificação no celular.
-- Cada associado tem um link pessoal (/m/<token>) onde ativa os lembretes e
-- confirma ou recusa os dias da escala. Tudo que é feito por esse link passa
-- pelo servidor com service role, conferindo o token.

alter table departamento_membros
  add column token uuid not null default gen_random_uuid(),
  -- preenchido pelo servidor quando o associado ativa os lembretes; null = não ativou
  add column lembretes_ativos_em timestamptz;
create unique index departamento_membros_token_idx on departamento_membros (token);

alter table escala_dia_pessoas
  add column resposta text check (resposta in ('confirmado', 'recusado')),
  add column respondido_em timestamptz,
  add column lembrete_enviado_em timestamptz;

-- Aparelhos dos associados. Só o servidor (service role) lê e grava.
create table membro_push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references departamento_membros (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  aparelho text,
  created_at timestamptz not null default now(),
  unique (membro_id, endpoint)
);
alter table membro_push_inscricoes enable row level security;
revoke all on membro_push_inscricoes from anon, authenticated;
grant select, insert, update, delete on membro_push_inscricoes to service_role;
