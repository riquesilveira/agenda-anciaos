import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** Links antigos (/entrar/<código da igreja>): levam ao link único com a igreja já escolhida. */
export default async function LinkAntigo({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) redirect("/entrar");
  const { data } = await supabaseAdmin().from("igrejas").select("id").eq("codigo_entrada", codigo).maybeSingle();
  redirect(data ? `/entrar?igreja=${data.id}` : "/entrar");
}
