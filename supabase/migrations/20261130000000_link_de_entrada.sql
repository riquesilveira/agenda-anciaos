-- Link de entrada da igreja: líderes entram sozinhos (nome, e-mail, senha e o
-- departamento que lideram) e já começam a usar. Os anciãos/pastor são
-- avisados e podem remover o acesso. Tudo do lado público passa pelo servidor
-- (service role) conferindo o código.

alter table igrejas add column codigo_entrada uuid not null default gen_random_uuid();
create unique index igrejas_codigo_entrada_idx on igrejas (codigo_entrada);

-- Quando a pessoa entrou pelo link (null = convidada por alguém).
alter table perfis add column entrou_pelo_link_em timestamptz;
