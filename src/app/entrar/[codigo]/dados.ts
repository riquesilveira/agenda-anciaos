import "server-only";
import { supabaseAdmin } from "@/lib/supabase/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Igreja pelo código do link de entrada (página pública: service role, filtrado pelo código). */
export async function igrejaPorCodigo(codigo: string) {
  if (!UUID.test(codigo)) return null;
  const db = supabaseAdmin();
  const { data: igreja } = await db.from("igrejas").select("id, nome").eq("codigo_entrada", codigo).maybeSingle();
  if (!igreja) return null;
  const { data: departamentos } = await db
    .from("departamentos")
    .select("id, nome, sigla")
    .eq("igreja_id", igreja.id)
    .order("nome");
  return { ...igreja, departamentos: (departamentos ?? []) as { id: string; nome: string; sigla: string | null }[] };
}
