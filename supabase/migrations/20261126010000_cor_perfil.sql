-- Cor de cada pessoa na grade da escala (ex: Henrique laranja).
alter table perfis
  add column cor text,
  add constraint perfis_cor_check check (
    cor is null or cor in ('laranja', 'verde_escuro', 'rosa', 'azul', 'roxo', 'azul_claro', 'amarelo', 'verde_agua')
  );
grant update (cor) on perfis to authenticated;
