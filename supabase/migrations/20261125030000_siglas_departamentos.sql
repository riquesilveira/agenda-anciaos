-- Sigla do departamento (ASA, MM, DBV…), mais fácil de reconhecer que a cor.
alter table departamentos
  add column sigla text,
  add constraint departamentos_sigla_check check (sigla is null or sigla ~ '^[A-Z0-9]{1,6}$');

create unique index departamentos_sigla_unica on departamentos (igreja_id, sigla) where sigla is not null;

-- Siglas sugeridas para os nomes mais comuns (ajustáveis no sistema).
update departamentos d set sigla = s.sigla
from (values
  ('jovens', 'JA'), ('ministerio jovem', 'JA'),
  ('desbravadores', 'DBV'),
  ('aventureiros', 'AVE'),
  ('ministerio da crianca', 'MC'), ('infantil', 'MC'),
  ('ministerio da mulher', 'MM'),
  ('ministerio da familia', 'MF'),
  ('escola sabatina', 'ES'),
  ('ministerio pessoal', 'MP'),
  ('musica', 'MUS'),
  ('mordomia', 'MOR'),
  ('acao solidaria', 'ASA'), ('acao solidaria adventista', 'ASA'),
  ('comunicacao', 'COM'),
  ('secretaria', 'SEC')
) as s(nome, sigla)
where d.sigla is null
  and lower(translate(d.nome, 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeiooouc' || 'AAAAEEIOOOUC')) = s.nome;
