import type { SupabaseClient } from "@supabase/supabase-js";
import type { Departamento, Perfil, Programacao } from "./tipos";

export async function listarDepartamentos(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("departamentos")
    .select("*, anciao:perfis(id, nome)")
    .order("nome")
    .returns<Departamento[]>();
  return data ?? [];
}

export async function listarPerfis(supabase: SupabaseClient) {
  const { data } = await supabase.from("perfis").select("*").order("nome").returns<Perfil[]>();
  return data ?? [];
}

/** Programações entre duas datas (inclusive), com o departamento. */
export async function listarProgramacoes(supabase: SupabaseClient, de: string, ate: string) {
  const { data } = await supabase
    .from("programacoes")
    .select("*, departamento:departamentos(*)")
    .gte("data", de)
    .lte("data", ate)
    .order("data")
    .order("hora_inicio", { nullsFirst: true })
    .returns<Programacao[]>();
  return data ?? [];
}
