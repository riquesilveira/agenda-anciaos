-- Eventos de vários dias (Missão Calebe, 40 Dias de Oração…), fonte detalhada
-- do calendário da Associação (ANP, USB, DSA, Nacional) e chave para importar
-- de novo sem duplicar.

alter table programacoes
  add column data_fim date,
  add column fonte text,
  add column chave_importacao text,
  add constraint programacoes_data_fim_check check (data_fim is null or data_fim >= data),
  add constraint programacoes_chave_importacao_key unique (igreja_id, chave_importacao);

create index programacoes_igreja_data_fim_idx on programacoes (igreja_id, data_fim);

-- Como a pessoa é chamada nos resumos ("Ancião", "Anciã", "Pastor"…).
-- Vazio = padrão pelo papel.
alter table perfis add column tratamento text;
grant update (tratamento) on perfis to authenticated;
