import "server-only";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export interface IgrejaParaEntrada {
  id: string;
  nome: string;
  departamentos: { id: string; nome: string }[];
}

/** Igrejas e departamentos para a página pública de entrada (só nomes). */
export async function igrejasParaEntrada(): Promise<IgrejaParaEntrada[]> {
  const db = supabaseAdmin();
  const [{ data: igrejas }, { data: departamentos }] = await Promise.all([
    db.from("igrejas").select("id, nome").order("nome"),
    db.from("departamentos").select("id, nome, igreja_id").order("nome"),
  ]);
  return (igrejas ?? []).map((i) => ({
    ...i,
    departamentos: (departamentos ?? []).filter((d) => d.igreja_id === i.id).map(({ id, nome }) => ({ id, nome })),
  }));
}

/** Uma igreja (com departamentos) pelo id vindo do formulário, conferido no banco. */
export async function igrejaParaEntrada(id: string): Promise<IgrejaParaEntrada | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await igrejasParaEntrada()).find((i) => i.id === id) ?? null;
}
