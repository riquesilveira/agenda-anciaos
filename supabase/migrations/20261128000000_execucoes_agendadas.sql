-- Controle de tarefas diárias (ex: lembrete de véspera da escala), para que
-- rodem uma vez só por dia mesmo sendo chamadas várias vezes (keep-alive).
create table execucoes_agendadas (
  tarefa text not null,
  dia date not null,
  executada_em timestamptz not null default now(),
  resultado jsonb,
  primary key (tarefa, dia)
);
alter table execucoes_agendadas enable row level security;
-- Sem policies: só a service role (servidor) acessa.
revoke all on execucoes_agendadas from anon, authenticated;
grant select, insert, update, delete on execucoes_agendadas to service_role;
