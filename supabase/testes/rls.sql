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

  update perfis set tratamento = 'Anciã' where id = auth.uid();

  begin
    insert into programacoes (igreja_id, titulo, data, data_fim)
      values ('00000000-0000-0000-0000-00000000000a', 'Fim antes do início', '2026-12-20', '2026-12-19');
    raise exception 'FALHOU: aceitou data_fim < data';
  exception when check_violation then null;
  end;

  insert into programacoes (igreja_id, titulo, data, chave_importacao)
    values ('00000000-0000-0000-0000-00000000000a', 'Importado', '2027-01-16', 'anp-2027:x');
  begin
    insert into programacoes (igreja_id, titulo, data, chave_importacao)
      values ('00000000-0000-0000-0000-00000000000a', 'Importado de novo', '2027-01-16', 'anp-2027:x');
    raise exception 'FALHOU: duplicou importação';
  exception when unique_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Líder de departamento: vê tudo da igreja, mas só mexe no próprio departamento.
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users values ('30000000-0000-0000-0000-000000000003', 'lider@x');
insert into perfis (id, igreja_id, nome, papel, email) values
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Ana', 'lider', 'lider@x');
insert into departamentos (id, igreja_id, nome) values
  ('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Jovens'),
  ('d2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Música');
insert into departamento_lideres (departamento_id, perfil_id) values
  ('d1000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003');
insert into programacoes (id, igreja_id, titulo, data, departamento_id) values
  ('e2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Ensaio', '2026-12-01', 'd2000000-0000-0000-0000-000000000002');

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', false);

do $$
declare n int;
begin
  select count(*) into n from programacoes;
  assert n >= 4, 'líder deveria ver todas as programações da igreja, viu ' || n;
  select count(*) into n from programacoes where igreja_id = '00000000-0000-0000-0000-00000000000b';
  assert n = 0, 'líder não pode ver outra igreja';

  -- pode criar no próprio departamento (origem local)
  insert into programacoes (igreja_id, titulo, data, departamento_id, origem)
    values ('00000000-0000-0000-0000-00000000000a', 'Culto Jovem', '2026-12-05', 'd1000000-0000-0000-0000-000000000001', 'local');
  update programacoes set titulo = 'Culto Jovem (editado)' where titulo = 'Culto Jovem';
  get diagnostics n = row_count;
  assert n = 1, 'líder deveria editar programação do próprio departamento';

  begin
    insert into programacoes (igreja_id, titulo, data, departamento_id)
      values ('00000000-0000-0000-0000-00000000000a', 'Invasão', '2026-12-05', 'd2000000-0000-0000-0000-000000000002');
    raise exception 'FALHOU: líder criou em outro departamento';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into programacoes (igreja_id, titulo, data)
      values ('00000000-0000-0000-0000-00000000000a', 'Sem departamento', '2026-12-05');
    raise exception 'FALHOU: líder criou sem departamento';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into programacoes (igreja_id, titulo, data, departamento_id, origem)
      values ('00000000-0000-0000-0000-00000000000a', 'Fingindo Associação', '2026-12-05', 'd1000000-0000-0000-0000-000000000001', 'associacao');
    raise exception 'FALHOU: líder criou programação da Associação';
  exception when insufficient_privilege then null;
  end;

  begin
    update programacoes set departamento_id = 'd2000000-0000-0000-0000-000000000002' where titulo = 'Culto Jovem (editado)';
    raise exception 'FALHOU: líder moveu programação para outro departamento';
  exception when insufficient_privilege then null;
  end;

  update programacoes set titulo = 'hack' where id = 'e2000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'líder não pode editar programação de outro departamento';
  delete from programacoes where id = 'e2000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'líder não pode excluir programação de outro departamento';

  update departamentos set nome = 'hack' where id = 'd2000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'líder não pode editar departamentos';

  begin
    insert into departamento_lideres (departamento_id, perfil_id)
      values ('d2000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
    raise exception 'FALHOU: líder se colocou como líder de outro departamento';
  exception when insufficient_privilege then null;
  end;

  begin
    update perfis set papel = 'anciao' where id = auth.uid();
    raise exception 'FALHOU: líder virou ancião';
  exception when insufficient_privilege then null;
  end;

  update perfis set novidades_vistas_em = now() where id = auth.uid();
end $$;

-- Ancião continua podendo tudo na igreja, inclusive gerir líderes.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  update programacoes set titulo = 'Ensaio geral' where id = 'e2000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'ancião deveria editar qualquer programação da igreja';
  insert into departamento_lideres (departamento_id, perfil_id)
    values ('d2000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
  update departamentos set cor = '#000000' where id = 'd2000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 1, 'ancião deveria editar departamento';
end $$;

-- ---------------------------------------------------------------------------
-- Escala de pregação: só o ancião responsável edita.
-- ---------------------------------------------------------------------------
reset role;
insert into auth.users values ('40000000-0000-0000-0000-000000000004', 'j@x');
insert into perfis (id, igreja_id, nome, papel, email) values
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', 'Jurandir', 'anciao', 'j@x');

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  -- Henrique assume o sábado 05/12/2026 (é sábado)
  insert into escala_pregacao (igreja_id, data, culto, anciao_id)
    values ('00000000-0000-0000-0000-00000000000a', '2026-12-05', 'sabado_manha', '10000000-0000-0000-0000-000000000001');
  update escala_pregacao set pregador_nome = 'Pr. Visitante', status = 'convidado' where data = '2026-12-05';
  get diagnostics n = row_count;
  assert n = 1, 'responsável deveria editar';

  begin
    insert into escala_pregacao (igreja_id, data, culto, anciao_id)
      values ('00000000-0000-0000-0000-00000000000a', '2026-12-06', 'sabado_manha', '10000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: aceitou sábado em dia que não é sábado';
  exception when check_violation then null;
  end;

  begin
    insert into escala_pregacao (igreja_id, data, culto, anciao_id)
      values ('00000000-0000-0000-0000-00000000000a', '2026-12-09', 'quarta', '40000000-0000-0000-0000-000000000004');
    raise exception 'FALHOU: assumiu culto em nome de outro ancião';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into escala_pregacao (igreja_id, data, culto, anciao_id)
      values ('00000000-0000-0000-0000-00000000000a', '2026-12-05', 'sabado_manha', '10000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: duplicou o mesmo culto';
  exception when unique_violation then null;
  end;
end $$;

-- Outro ancião vê, mas não edita nem apaga.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', false);
do $$
declare n int;
begin
  select count(*) into n from escala_pregacao;
  assert n = 1, 'outro ancião deveria ver a escala';
  update escala_pregacao set tema = 'hack' where data = '2026-12-05';
  get diagnostics n = row_count;
  assert n = 0, 'outro ancião não pode editar';
  delete from escala_pregacao where data = '2026-12-05';
  get diagnostics n = row_count;
  assert n = 0, 'outro ancião não pode liberar';
end $$;

-- Líder vê, mas não assume.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', false);
do $$
begin
  assert (select count(*) from escala_pregacao) = 1, 'líder deveria ver a escala';
  begin
    insert into escala_pregacao (igreja_id, data, culto, anciao_id)
      values ('00000000-0000-0000-0000-00000000000a', '2026-12-09', 'quarta', '30000000-0000-0000-0000-000000000003');
    raise exception 'FALHOU: líder assumiu culto';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Responsável passa para outro ancião; depois disso, perde a edição.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  begin
    update escala_pregacao set anciao_id = '30000000-0000-0000-0000-000000000003' where data = '2026-12-05';
    raise exception 'FALHOU: passou o culto para um líder';
  exception when insufficient_privilege then null;
  end;
  update escala_pregacao set anciao_id = '40000000-0000-0000-0000-000000000004' where data = '2026-12-05';
  update escala_pregacao set tema = 'depois' where data = '2026-12-05';
  get diagnostics n = row_count;
  assert n = 0, 'quem passou o culto não edita mais';
end $$;

-- ---------------------------------------------------------------------------
-- Escalas dos departamentos: líder do departamento (e anciãos) editam.
-- ---------------------------------------------------------------------------
-- Ana lidera Jovens (d1) e também Música (d2, vinculada pelo ancião acima).
-- Cria uma equipe e um dia de escala em Jovens.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', false);
do $$
declare dia uuid; m1 uuid; n int;
begin
  insert into departamento_membros (id, departamento_id, nome, whatsapp)
    values ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Pedro', '43999990000')
    returning id into m1;
  insert into escala_dias (id, departamento_id, data, titulo)
    values ('f2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '2026-12-05', 'Culto Divino')
    returning id into dia;
  insert into escala_dia_pessoas (escala_dia_id, membro_id, funcao) values (dia, m1, 'Teclado');
  update escala_dia_pessoas set avisado_em = now() where escala_dia_id = dia;
  get diagnostics n = row_count;
  assert n = 1, 'líder deveria marcar avisado';
end $$;

-- Outro ancião vê; um líder de outro departamento não edita.
reset role;
insert into auth.users values ('50000000-0000-0000-0000-000000000005', 'b@x');
insert into perfis (id, igreja_id, nome, papel, email) values
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Bruno', 'lider', 'b@x');
insert into departamentos (id, igreja_id, nome) values
  ('d3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a', 'Sonoplastia');
insert into departamento_lideres (departamento_id, perfil_id) values
  ('d3000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005');
set role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000005', false);
do $$
declare n int;
begin
  select count(*) into n from escala_dias;
  assert n >= 1, 'líder de outro departamento deveria ver a escala';
  update escala_dias set titulo = 'hack' where id = 'f2000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'líder de outro departamento não pode editar';
  delete from departamento_membros where id = 'f1000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'líder de outro departamento não pode apagar equipe alheia';
  begin
    insert into departamento_membros (departamento_id, nome) values ('d1000000-0000-0000-0000-000000000001', 'Intruso');
    raise exception 'FALHOU: cadastrou na equipe de outro departamento';
  exception when insufficient_privilege then null;
  end;
  -- não pode colocar membro de outro departamento na própria escala
  insert into escala_dias (id, departamento_id, data) values ('f2000000-0000-0000-0000-000000000003', 'd3000000-0000-0000-0000-000000000003', '2026-12-06');
  begin
    insert into escala_dia_pessoas (escala_dia_id, membro_id) values ('f2000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: usou membro de outro departamento';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Ancião edita qualquer escala.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  update escala_dias set observacao = 'ok' where id = 'f2000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'ancião deveria editar a escala do departamento';
end $$;

-- Notificações: cada um só mexe nas próprias inscrições.
reset role;
insert into push_inscricoes (perfil_id, endpoint, p256dh, auth) values
  ('10000000-0000-0000-0000-000000000001', 'https://push.exemplo/henrique', 'k', 'a');
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', false);
do $$
declare n int;
begin
  select count(*) into n from push_inscricoes;
  assert n = 0, 'líder viu inscrição de outra pessoa';
  insert into push_inscricoes (perfil_id, endpoint, p256dh, auth)
    values ('30000000-0000-0000-0000-000000000003', 'https://push.exemplo/ana', 'k', 'a');
  begin
    insert into push_inscricoes (perfil_id, endpoint, p256dh, auth)
      values ('10000000-0000-0000-0000-000000000001', 'https://push.exemplo/falsa', 'k', 'a');
    raise exception 'FALHOU: criou inscrição em nome de outra pessoa';
  exception when insufficient_privilege then null;
  end;
  delete from push_inscricoes where endpoint = 'https://push.exemplo/henrique';
  get diagnostics n = row_count;
  assert n = 0, 'apagou inscrição de outra pessoa';
end $$;

-- Culto especial vale em qualquer dia; os fixos continuam presos ao dia da semana.
reset role;
set role service_role;
do $$ begin
  insert into escala_pregacao (igreja_id, data, culto, anciao_id, titulo)
    values ('00000000-0000-0000-0000-00000000000a', '2026-12-15', 'especial', '10000000-0000-0000-0000-000000000001', 'Semana de Oração');
  begin
    insert into escala_pregacao (igreja_id, data, culto, anciao_id)
      values ('00000000-0000-0000-0000-00000000000a', '2026-12-15', 'quarta', '10000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: aceitou culto de quarta numa terça';
  exception when check_violation then null;
  end;
end $$;

-- Igreja nova recebe o calendário da ANP e liga os departamentos pelo nome.
reset role;
set role service_role;
do $$
declare nova uuid; dep uuid; n int;
begin
  insert into departamentos (id, igreja_id, nome) values ('d0000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Embaixadores');
  insert into programacoes (igreja_id, titulo, data, origem, chave_importacao, departamento_id)
    values ('00000000-0000-0000-0000-00000000000a', 'Congresso JA', '2027-03-10', 'associacao', 'anp-2027-x', 'd0000000-0000-0000-0000-0000000000a1');
  insert into igrejas (nome) values ('Igreja Nova') returning id into nova;
  select count(*) into n from programacoes where igreja_id = nova and origem = 'associacao';
  assert n >= 1, 'igreja nova não recebeu o calendário da ANP';
  insert into departamentos (igreja_id, nome) values (nova, 'embaixadores') returning id into dep;
  assert (select departamento_id from programacoes where igreja_id = nova and chave_importacao = 'anp-2027-x') = dep,
    'evento da ANP não foi ligado ao departamento novo';
  assert copiar_calendario_associacao(nova) = 0, 'copiou de novo (duplicou)';
end $$;

-- Chave de administrador (cron/scripts) lê e grava tudo.
reset role;
set role service_role;
do $$ begin
  assert (select count(*) from programacoes) >= 2, 'service_role deveria ver todas as igrejas';
  insert into departamentos (igreja_id, nome) values ('00000000-0000-0000-0000-00000000000b', 'Via service_role');
end $$;

-- Mensagem da escala: outra igreja não vê nem grava.
reset role;
set role service_role;
insert into departamentos (id, igreja_id, nome) values
  ('d0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Música da outra');
insert into escala_mensagens (departamento_id, texto) values ('d0000000-0000-0000-0000-00000000000b', 'segredo');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare n int;
begin
  select count(*) into n from escala_mensagens;
  assert n = 0, 'viu mensagem de outra igreja';
  begin
    insert into escala_mensagens (departamento_id, texto) values ('d0000000-0000-0000-0000-00000000000b', 'invasão');
    raise exception 'FALHOU: gravou mensagem em outra igreja';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Aparelhos dos associados: só o servidor.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$ begin
  perform count(*) from membro_push_inscricoes;
  raise exception 'FALHOU: usuário logado leu aparelhos de associados';
exception when insufficient_privilege then null;
end $$;

-- Sem login não vê nada.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform count(*) from programacoes;
  raise exception 'FALHOU: anon conseguiu ler programações';
exception when insufficient_privilege then null;
end $$;

\echo 'RLS OK'
