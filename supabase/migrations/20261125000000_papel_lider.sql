-- Novo papel: líder de departamento (precisa ficar sozinho numa migration:
-- o Postgres não deixa usar um valor novo de enum na mesma transação).
alter type papel_usuario add value if not exists 'lider';
