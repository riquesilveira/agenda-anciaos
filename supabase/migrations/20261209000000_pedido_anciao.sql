-- Entrada pelo link como ancião: se a igreja ainda não tem ancião/pastor, a
-- pessoa entra como ancião; senão entra como líder com o pedido registrado
-- aqui, e um ancião/pastor aprova em Departamentos.
alter table perfis add column pedido_anciao_em timestamptz;
