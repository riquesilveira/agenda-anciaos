-- Ajustes apontados pelo Security Advisor do Supabase.

-- search_path fixo na função de trigger.
alter function tocar_updated_at() set search_path = public;

-- minha_igreja() só faz sentido para usuário logado (as policies RLS a usam
-- como "authenticated"). Visitante anônimo não precisa executá-la.
revoke execute on function minha_igreja() from public, anon;
grant execute on function minha_igreja() to authenticated;

-- Policies só para usuários logados: visitante anônimo não tem policy
-- nenhuma (vê lista vazia) e nem chega a chamar minha_igreja().
alter policy "ver a própria igreja" on igrejas to authenticated;
alter policy "ver perfis da igreja" on perfis to authenticated;
alter policy "editar o próprio perfil" on perfis to authenticated;
alter policy "departamentos da igreja" on departamentos to authenticated;
alter policy "programações da igreja" on programacoes to authenticated;
