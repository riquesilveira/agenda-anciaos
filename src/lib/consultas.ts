import type { SupabaseClient } from "@supabase/supabase-js";
import type { Departamento, EscalaDia, MembroDepartamento, Perfil, Pregacao, Programacao } from "./tipos";

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

export async function nomeDaIgreja(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.from("igrejas").select("nome").limit(1).maybeSingle();
  return data?.nome ?? "igreja";
}

/** Escala de pregação entre duas datas, com o ancião responsável. */
export async function listarEscala(supabase: SupabaseClient, de: string, ate: string) {
  const { data } = await supabase
    .from("escala_pregacao")
    .select("*, anciao:perfis(id, nome, papel, tratamento)")
    .gte("data", de)
    .lte("data", ate)
    .order("data")
    .returns<Pregacao[]>();
  return data ?? [];
}

export async function listarMembros(supabase: SupabaseClient, departamentoId: string) {
  const { data } = await supabase
    .from("departamento_membros")
    .select("*")
    .eq("departamento_id", departamentoId)
    .eq("ativo", true)
    .order("nome")
    .returns<MembroDepartamento[]>();
  return data ?? [];
}

/** Dias da escala de um departamento entre duas datas, com as pessoas. */
export async function listarDiasEscala(supabase: SupabaseClient, departamentoId: string, de: string, ate: string) {
  const { data } = await supabase
    .from("escala_dias")
    .select("*, pessoas:escala_dia_pessoas(*, membro:departamento_membros(*))")
    .eq("departamento_id", departamentoId)
    .gte("data", de)
    .lte("data", ate)
    .order("data")
    .order("horario", { nullsFirst: true })
    .returns<EscalaDia[]>();
  return (data ?? []).map((d) => ({ ...d, pessoas: [...(d.pessoas ?? [])].sort((a, b) => a.ordem - b.ordem) }));
}

/** Departamentos que já usam escala (têm equipe cadastrada). */
export async function departamentosComEquipe(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase.from("departamento_membros").select("departamento_id").eq("ativo", true);
  return new Set((data ?? []).map((x) => x.departamento_id as string));
}
