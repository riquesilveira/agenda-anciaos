import "server-only";
import { hojeISO } from "@/lib/datas";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { EscalaDia } from "@/lib/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Associado {
  id: string;
  nome: string;
  lembretes_ativos_em: string | null;
  departamento: { id: string; nome: string; anciao_id: string | null; igreja: { nome: string } | null };
}

/**
 * Associado pelo link pessoal. A página /m/<token> é pública: quem tem o link
 * é a própria pessoa. Usa service role, então tudo aqui filtra pelo token.
 */
export async function associadoPorToken(token: string): Promise<Associado | null> {
  if (!UUID.test(token)) return null;
  const { data } = await supabaseAdmin()
    .from("departamento_membros")
    .select("id, nome, lembretes_ativos_em, departamento:departamentos(id, nome, anciao_id, igreja:igrejas(nome))")
    .eq("token", token)
    .eq("ativo", true)
    .maybeSingle();
  return (data as unknown as Associado) ?? null;
}

export interface MeuDia {
  id: string; // escala_dia_pessoas.id
  funcao: string | null;
  resposta: "confirmado" | "recusado" | null;
  dia: Pick<EscalaDia, "data" | "horario" | "titulo" | "observacao">;
}

/** Próximos dias da escala do associado (de hoje em diante). */
export async function proximosDias(membroId: string): Promise<MeuDia[]> {
  const { data } = await supabaseAdmin()
    .from("escala_dia_pessoas")
    .select("id, funcao, resposta, dia:escala_dias!inner(data, horario, titulo, observacao)")
    .eq("membro_id", membroId)
    .gte("dia.data", hojeISO());
  const lista = (data ?? []) as unknown as MeuDia[];
  return lista
    .filter((d) => d.dia)
    .sort((a, b) => (a.dia.data + (a.dia.horario ?? "")).localeCompare(b.dia.data + (b.dia.horario ?? "")));
}
