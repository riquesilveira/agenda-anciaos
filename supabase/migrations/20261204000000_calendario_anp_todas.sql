-- O calendário da Associação (ANP) vale para todas as igrejas.
-- * copiar_calendario_associacao(destino): copia os eventos da Associação da
--   igreja que mais tem (ligando ao departamento de mesmo nome) sem duplicar.
-- * Igreja nova recebe a cópia sozinha (trigger), e quando ela cadastra um
--   departamento os eventos da ANP com esse nome se ligam a ele.
-- * scripts/importar.ts grava o PDF novo em todas as igrejas.

create or replace function copiar_calendario_associacao(destino uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  modelo uuid;
  n integer;
begin
  select igreja_id into modelo from programacoes
  where origem = 'associacao' and igreja_id <> destino
  group by igreja_id order by count(*) desc limit 1;
  if modelo is null then return 0; end if;

  insert into programacoes (igreja_id, titulo, descricao, data, data_fim, hora_inicio, hora_fim, local, origem, fonte, chave_importacao, departamento_id)
  select destino, p.titulo, p.descricao, p.data, p.data_fim, p.hora_inicio, p.hora_fim, p.local, 'associacao', p.fonte, p.chave_importacao,
         (select d2.id from departamentos d2 where d2.igreja_id = destino and lower(d2.nome) = lower(d.nome) limit 1)
  from programacoes p
  left join departamentos d on d.id = p.departamento_id
  where p.igreja_id = modelo and p.origem = 'associacao'
    and not exists (
      select 1 from programacoes x
      where x.igreja_id = destino and x.origem = 'associacao'
        and (x.chave_importacao = p.chave_importacao or (x.titulo = p.titulo and x.data = p.data))
    );
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function copiar_calendario_associacao(uuid) from public, anon, authenticated;
grant execute on function copiar_calendario_associacao(uuid) to service_role;

create or replace function igreja_nova_recebe_anp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform copiar_calendario_associacao(new.id);
  return new;
end $$;
create trigger igrejas_copiar_anp after insert on igrejas
  for each row execute function igreja_nova_recebe_anp();

create or replace function departamento_novo_liga_anp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update programacoes p set departamento_id = new.id
  from programacoes src
  join departamentos sd on sd.id = src.departamento_id
  where p.igreja_id = new.igreja_id and p.origem = 'associacao' and p.departamento_id is null
    and p.chave_importacao is not null and src.chave_importacao = p.chave_importacao
    and src.igreja_id <> new.igreja_id and lower(sd.nome) = lower(new.nome);
  return new;
end $$;
create trigger departamentos_ligar_anp after insert on departamentos
  for each row execute function departamento_novo_liga_anp();
