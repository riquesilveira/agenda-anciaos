-- Agenda dos Anciãos — schema inicial
--
-- Multi-igreja desde o começo (coluna igreja_id em tudo), mas a v1 só usa a
-- Igreja do Aeroporto. Cada usuário enxerga apenas os dados da própria igreja
-- via RLS.

create type papel_usuario as enum ('anciao', 'pastor');
create type origem_programacao as enum ('associacao', 'distrito', 'local');

create table igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now()
);

-- Um perfil por usuário do Supabase Auth (anciãos e pastor).
create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  igreja_id uuid not null references igrejas (id),
  nome text not null,
  papel papel_usuario not null default 'anciao',
  email text not null,
  whatsapp text,
  created_at timestamptz not null default now()
);

-- Departamento/ministério. O líder não tem login: é só nome + WhatsApp.
create table departamentos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas (id),
  nome text not null,
  cor text not null default '#64748b',
  anciao_id uuid references perfis (id) on delete set null,
  lider_nome text,
  lider_whatsapp text,
  created_at timestamptz not null default now(),
  unique (igreja_id, nome)
);

create table programacoes (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas (id),
  titulo text not null,
  descricao text,
  data date not null,
  hora_inicio time,
  hora_fim time,
  local text,
  origem origem_programacao not null default 'local',
  departamento_id uuid references departamentos (id) on delete set null,
  -- "Avisei o líder": marcado pelo ancião responsável.
  lider_avisado_em timestamptz,
  lider_avisado_por uuid references perfis (id) on delete set null,
  criado_por uuid references perfis (id) on delete set null,
  atualizado_por uuid references perfis (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hora_fim is null or hora_inicio is null or hora_fim >= hora_inicio)
);

create index programacoes_igreja_data_idx on programacoes (igreja_id, data);
create index programacoes_departamento_idx on programacoes (departamento_id);

create or replace function tocar_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger programacoes_updated_at
  before update on programacoes
  for each row execute function tocar_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: cada usuário só vê/edita dados da própria igreja.
-- Todos os anciãos e o pastor podem cadastrar e editar (decisão do PRD).
-- ---------------------------------------------------------------------------

-- security definer para não cair em recursão na policy de perfis.
create or replace function minha_igreja() returns uuid
language sql stable security definer set search_path = public as $$
  select igreja_id from perfis where id = auth.uid()
$$;

alter table igrejas enable row level security;
alter table perfis enable row level security;
alter table departamentos enable row level security;
alter table programacoes enable row level security;

create policy "ver a própria igreja" on igrejas
  for select using (id = minha_igreja());

create policy "ver perfis da igreja" on perfis
  for select using (igreja_id = minha_igreja());
create policy "editar o próprio perfil" on perfis
  for update using (id = auth.uid()) with check (igreja_id = minha_igreja());

create policy "departamentos da igreja" on departamentos
  for all using (igreja_id = minha_igreja()) with check (igreja_id = minha_igreja());

create policy "programações da igreja" on programacoes
  for all using (igreja_id = minha_igreja()) with check (igreja_id = minha_igreja());

-- No próprio perfil, só nome e WhatsApp são editáveis (papel e igreja não).
revoke update on perfis from authenticated;
grant update (nome, whatsapp) on perfis to authenticated;
