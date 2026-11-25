-- Igrejas do mesmo distrito veem as programações do distrito umas das outras
-- (sem copiar): quem cadastrou continua sendo o único que edita.

alter table igrejas add column distrito text;

-- A outra igreja é do meu distrito? (security definer: o usuário só enxerga
-- a própria linha em igrejas.)
create or replace function igreja_do_meu_distrito(outra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from igrejas eu, igrejas ela
    where eu.id = minha_igreja() and ela.id = outra
      and eu.distrito is not null and eu.distrito = ela.distrito
  )
$$;
revoke execute on function igreja_do_meu_distrito(uuid) from public, anon;
grant execute on function igreja_do_meu_distrito(uuid) to authenticated;

create policy "ver programações do distrito" on programacoes for select to authenticated
  using (origem = 'distrito' and igreja_do_meu_distrito(igreja_id));
