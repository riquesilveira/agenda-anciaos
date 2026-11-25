"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { dataLonga } from "@/lib/datas";
import { responsaveisDoDepartamento } from "@/lib/escalas";
import { enviarPush } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { associadoPorToken } from "./dados";

// Ações do link pessoal do associado (sem login). A identidade vem do token
// da URL, conferido aqui; nenhum id vindo do formulário é aceito sem conferir
// que pertence a esse associado.

export async function ativarLembretesAssociado(
  token: string,
  inscricao: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; aparelho?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const associado = await associadoPorToken(token);
  if (!associado) return { ok: false, erro: "Link inválido." };
  const { endpoint, keys, aparelho } = inscricao;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys?.auth) return { ok: false, erro: "Inscrição inválida." };
  const db = supabaseAdmin();
  const { error } = await db
    .from("membro_push_inscricoes")
    .upsert(
      { membro_id: associado.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, aparelho: aparelho?.slice(0, 40) ?? null },
      { onConflict: "membro_id,endpoint" },
    );
  if (error) {
    console.error("Falha ao salvar aparelho do associado", error);
    return { ok: false, erro: "Não foi possível salvar." };
  }
  if (!associado.lembretes_ativos_em) {
    await db.from("departamento_membros").update({ lembretes_ativos_em: new Date().toISOString() }).eq("id", associado.id);
  }
  revalidatePath("/escalas", "layout");
  return { ok: true };
}

export async function desativarLembretesAssociado(token: string, endpoint: string) {
  const associado = await associadoPorToken(token);
  if (!associado) return;
  const db = supabaseAdmin();
  await db.from("membro_push_inscricoes").delete().eq("membro_id", associado.id).eq("endpoint", endpoint);
  const { count } = await db.from("membro_push_inscricoes").select("id", { count: "exact", head: true }).eq("membro_id", associado.id);
  if (!count) await db.from("departamento_membros").update({ lembretes_ativos_em: null }).eq("id", associado.id);
  revalidatePath("/escalas", "layout");
}

export async function responderEscala(form: FormData) {
  const token = String(form.get("token") ?? "");
  const id = String(form.get("id") ?? "");
  const resposta = form.get("resposta");
  if (resposta !== "confirmado" && resposta !== "recusado") return;
  const associado = await associadoPorToken(token);
  if (!associado) return;
  const db = supabaseAdmin();
  const { data: linha } = await db
    .from("escala_dia_pessoas")
    .update({ resposta, respondido_em: new Date().toISOString() })
    .eq("id", id)
    .eq("membro_id", associado.id) // só o próprio dia da pessoa
    .select("dia:escala_dias(data)")
    .maybeSingle();
  if (!linha) return;
  revalidatePath(`/m/${token}`);
  revalidatePath("/escalas", "layout");

  // Quem não vai poder: avisa o líder (ou o ancião responsável) na hora. Fire-and-forget.
  const data = (linha as unknown as { dia: { data: string } | null }).dia?.data;
  if (resposta === "recusado" && data) {
    after(async () => {
      const dep = associado.departamento;
      const { data: lideres } = await db.from("departamento_lideres").select("perfil_id").eq("departamento_id", dep.id);
      const quem = responsaveisDoDepartamento((lideres ?? []).map((l) => l.perfil_id), dep.anciao_id);
      await enviarPush(quem, {
        titulo: `${associado.nome} não vai poder`,
        corpo: `Escala de ${dep.nome}: ${dataLonga(data)}`,
        url: `/escalas/d/${dep.id}?mes=${data.slice(0, 7)}&dia=${data}`,
        tag: `recusa-${id}`,
      });
    });
  }
}
