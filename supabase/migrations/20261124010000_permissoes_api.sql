-- Permissões explícitas para a API do Supabase.
--
-- Projetos novos do Supabase não liberam automaticamente para a API as
-- tabelas criadas por SQL. Aqui fica o mínimo que cada papel precisa;
-- quem enxerga QUAIS linhas continua sendo decidido pelas policies RLS.

-- Usuário logado (anciãos e pastor)
grant select on igrejas to authenticated;
grant select on perfis to authenticated;                 -- update só em colunas (migration inicial)
grant update (nome, whatsapp, tratamento) on perfis to authenticated;
grant select, insert, update, delete on departamentos to authenticated;
grant select, insert, update, delete on programacoes to authenticated;

-- Visitante anônimo: nada.
revoke all on igrejas, perfis, departamentos, programacoes from anon;

-- Chave de administrador (cron dos resumos e scripts de seed/importação).
grant select, insert, update, delete on igrejas, perfis, departamentos, programacoes to service_role;
