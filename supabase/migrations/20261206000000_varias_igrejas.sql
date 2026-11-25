-- Uma pessoa em mais de uma igreja (ex: o pastor do distrito). perfis.igreja_id
-- continua sendo a igreja "aberta agora" (todo o RLS usa minha_igreja()); a
-- pessoa troca entre as igrejas liberadas em perfil_igrejas.

create table perfil_igrejas (
  perfil_id uuid not null references perfis (id) on delete cascade,
  igreja_id uuid not null references igrejas (id) on delete cascade,
  primary key (perfil_id, igreja_id)
);
alter table perfil_igrejas enable row level security;
create policy "minhas igrejas" on perfil_igrejas for select to authenticated using (perfil_id = auth.uid());
grant select on perfil_igrejas to authenticated;
grant select, insert, update, delete on perfil_igrejas to service_role;
revoke all on perfil_igrejas from anon;

-- Nomes das igrejas que eu posso abrir (igrejas só mostra a atual pelo RLS).
create or replace function minhas_igrejas() returns table (id uuid, nome text, atual boolean)
language sql stable security definer set search_path = public as $$
  select i.id, i.nome, i.id = minha_igreja()
  from igrejas i
  where i.id = minha_igreja()
     or exists (select 1 from perfil_igrejas pi where pi.perfil_id = auth.uid() and pi.igreja_id = i.id)
  order by i.nome
$$;
revoke execute on function minhas_igrejas() from public, anon;
grant execute on function minhas_igrejas() to authenticated;

-- Abrir outra igreja (só uma das liberadas).
create or replace function trocar_igreja(destino uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from perfil_igrejas where perfil_id = auth.uid() and igreja_id = destino) then
    return false;
  end if;
  update perfis set igreja_id = destino where id = auth.uid();
  return found;
end $$;
revoke execute on function trocar_igreja(uuid) from public, anon;
grant execute on function trocar_igreja(uuid) to authenticated;
