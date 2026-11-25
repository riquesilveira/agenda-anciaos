-- Mensagem padrão do aviso da escala, escrita pelo líder de cada departamento.
-- Aceita marcadores: {nome}, {quando}, {data}, {horario}, {funcao}, {programacao}, {departamento}.
create table escala_mensagens (
  departamento_id uuid primary key references departamentos (id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 1000),
  updated_at timestamptz not null default now()
);
create trigger escala_mensagens_updated_at before update on escala_mensagens
  for each row execute function tocar_updated_at();

alter table escala_mensagens enable row level security;
create policy "ver mensagem da escala" on escala_mensagens for select to authenticated
  using (departamento_da_minha_igreja(departamento_id));
create policy "líder edita a mensagem" on escala_mensagens for all to authenticated
  using (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id))
  with check (departamento_da_minha_igreja(departamento_id) and posso_editar_departamento(departamento_id));

grant select, insert, update, delete on escala_mensagens to authenticated, service_role;
revoke all on escala_mensagens from anon;
