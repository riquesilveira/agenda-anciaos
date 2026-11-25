-- Escala de pregação: cada culto (sábado de manhã, quarta, domingo à noite)
-- tem um ancião responsável, que convida o pregador. Só o responsável edita.

create type culto_pregacao as enum ('sabado_manha', 'quarta', 'domingo_noite');
create type status_pregacao as enum ('a_convidar', 'convidado', 'confirmado', 'recusou');

create table escala_pregacao (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas (id),
  data date not null,
  culto culto_pregacao not null,
  anciao_id uuid not null references perfis (id),
  pregador_nome text,
  pregador_whatsapp text,
  pregador_igreja text,
  tema text,
  status status_pregacao not null default 'a_convidar',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (igreja_id, data, culto),
  -- o culto precisa cair no dia da semana certo (0 = domingo … 6 = sábado)
  check (
    (culto = 'sabado_manha' and extract(dow from data) = 6)
    or (culto = 'quarta' and extract(dow from data) = 3)
    or (culto = 'domingo_noite' and extract(dow from data) = 0)
  )
);
create index escala_pregacao_igreja_data_idx on escala_pregacao (igreja_id, data);

create trigger escala_pregacao_updated_at
  before update on escala_pregacao
  for each row execute function tocar_updated_at();

alter table escala_pregacao enable row level security;

-- Todos da igreja veem a escala.
create policy "ver escala da igreja" on escala_pregacao
  for select to authenticated using (igreja_id = minha_igreja());

-- Ancião/pastor assume um culto livre (vira o responsável).
create policy "assumir culto" on escala_pregacao
  for insert to authenticated
  with check (
    igreja_id = minha_igreja()
    and meu_papel() in ('anciao', 'pastor')
    and anciao_id = auth.uid()
  );

-- Só o responsável edita; pode passar para outro ancião/pastor da igreja.
create policy "responsável edita" on escala_pregacao
  for update to authenticated
  using (igreja_id = minha_igreja() and anciao_id = auth.uid())
  with check (
    igreja_id = minha_igreja()
    and exists (
      select 1 from perfis p
      where p.id = anciao_id and p.igreja_id = minha_igreja() and p.papel in ('anciao', 'pastor')
    )
  );

-- Só o responsável libera (apaga) o culto.
create policy "responsável libera" on escala_pregacao
  for delete to authenticated
  using (igreja_id = minha_igreja() and anciao_id = auth.uid());

grant select, insert, update, delete on escala_pregacao to authenticated;
revoke all on escala_pregacao from anon;
grant select, insert, update, delete on escala_pregacao to service_role;
