import type { SupabaseClient } from "@supabase/supabase-js";
import type { Departamento, Perfil, Programacao } from "./tipos";

export async function listarDepartamentos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("departamentos")
    // !fkey: departamentos chega em perfis por dois caminhos (anciao_id e departamento_lideres)
    .select(
      "*, anciao:perfis!departamentos_anciao_id_fkey(id, nome), lideres:departamento_lideres(perfil_id, perfil:perfis(id, nome, email, whatsapp, papel, tratamento))",
    )
    .order("nome")
    .returns<Departamento[]>();
  return data ?? [];
}

export async function listarPerfis(supabase: SupabaseClient) {
  const { data } = await supabase.from("perfis").select("*").order("nome").returns<Perfil[]>();
  return data ?? [];
}

/**
 * Programações com pelo menos um dia entre `de` e `ate` (inclusive), com o
 * departamento. Inclui eventos de vários dias que começaram antes de `de`.
 */
export async function listarProgramacoes(supabase: SupabaseClient, de: string, ate: string) {
  const { data } = await supabase
    .from("programacoes")
    .select("*, departamento:departamentos(*)")
    .lte("data", ate)
    .or(`data.gte.${de},data_fim.gte.${de}`)
    .order("data")
    .order("hora_inicio", { nullsFirst: true })
    .returns<Programacao[]>();
  return data ?? [];
}
