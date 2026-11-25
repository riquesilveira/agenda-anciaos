-- Fotos de perfil (usuários) e dos associados (sem login, o líder envia).
-- Arquivos no Storage, bucket público "fotos" (caminhos com uuid):
--   perfis/<id do usuário>.jpg   -> a própria pessoa
--   membros/<id do associado>.jpg -> líder do departamento ou ancião/pastor
-- A URL (com ?v= para furar o cache) fica em foto_url.

alter table perfis add column foto_url text;
grant update (foto_url) on perfis to authenticated;
alter table departamento_membros add column foto_url text;

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    return; -- banco de teste local, sem Storage
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('fotos', 'fotos', true, 1048576, array['image/jpeg'])
  on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

  execute $p$
    create policy "fotos: a própria" on storage.objects for all to authenticated
      using (bucket_id = 'fotos' and name = 'perfis/' || auth.uid()::text || '.jpg')
      with check (bucket_id = 'fotos' and name = 'perfis/' || auth.uid()::text || '.jpg')
  $p$;

  execute $p$
    create policy "fotos: equipe do departamento" on storage.objects for all to authenticated
      using (
        bucket_id = 'fotos' and exists (
          select 1 from public.departamento_membros m
          where name = 'membros/' || m.id::text || '.jpg'
            and public.departamento_da_minha_igreja(m.departamento_id)
            and public.posso_editar_departamento(m.departamento_id)
        )
      )
      with check (
        bucket_id = 'fotos' and exists (
          select 1 from public.departamento_membros m
          where name = 'membros/' || m.id::text || '.jpg'
            and public.departamento_da_minha_igreja(m.departamento_id)
            and public.posso_editar_departamento(m.departamento_id)
        )
      )
  $p$;
end $$;
