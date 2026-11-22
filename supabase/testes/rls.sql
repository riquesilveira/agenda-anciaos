-- Testes de RLS. Rode com: psql -v ON_ERROR_STOP=1 -f stub -f migration -f este
\set QUIET on
insert into igrejas (id, nome) values
  ('00000000-0000-0000-0000-00000000000a', 'Aeroporto'),
  ('00000000-0000-0000-0000-00000000000b', 'Outra');
insert into auth.users values
  ('10000000-0000-0000-0000-000000000001', 'h@x'),
  ('20000000-0000-0000-0000-000000000002', 'o@x');
insert into perfis (id, igreja_id, nome, papel, email) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Henrique', 'anciao', 'h@x'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Outro', 'anciao', 'o@x');
insert into programacoes (igreja_id, titulo, data) values
  ('00000000-0000-0000-0000-00000000000a', 'Culto Aeroporto', '2026-12-14'),
  ('00000000-0000-0000-0000-00000000000b', 'Culto Outra', '2026-12-14');

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);

do $$
declare n int;
begin
  select count(*) into n from programacoes;
  assert n = 1, 'deveria ver só as programações da própria igreja, viu ' || n;
  select count(*) into n from perfis;
  assert n = 1, 'deveria ver só perfis da própria igreja';

  insert into programacoes (igreja_id, titulo, data) values ('00000000-0000-0000-0000-00000000000a', 'Nova', '2026-12-20');

  begin
    insert into programacoes (igreja_id, titulo, data) values ('00000000-0000-0000-0000-00000000000b', 'Invasão', '2026-12-20');
    raise exception 'FALHOU: inseriu em outra igreja';
  exception when insufficient_privilege then null;
  end;

  update programacoes set titulo = 'hack' where titulo = 'Culto Outra';
  get diagnostics n = row_count;
  assert n = 0, 'não deveria editar programação de outra igreja';

  update perfis set whatsapp = '11999999999' where id = auth.uid();
  get diagnostics n = row_count;
  assert n = 1, 'deveria editar o próprio whatsapp';

  begin
    update perfis set papel = 'pastor' where id = auth.uid();
    raise exception 'FALHOU: trocou o próprio papel';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into programacoes (igreja_id, titulo, data, hora_inicio, hora_fim)
      values ('00000000-0000-0000-0000-00000000000a', 'Horário invertido', '2026-12-20', '20:00', '19:00');
    raise exception 'FALHOU: aceitou hora_fim < hora_inicio';
  exception when check_violation then null;
  end;
end $$;

-- Sem login não vê nada.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin assert (select count(*) from programacoes) = 0, 'anon viu dados'; end $$;

\echo 'RLS OK'
