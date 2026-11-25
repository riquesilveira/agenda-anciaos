import "server-only";
import { mensagemNovaProgramacao } from "./avisos";
import { enviarEmail } from "./email/enviar";
import { supabaseAdmin } from "./supabase/servidor";
import type { Perfil, Programacao } from "./tipos";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * E-mail para todos da igreja (menos quem criou) avisando da nova programação.
 * Roda depois da resposta (after()), nunca atrasa quem está salvando.
 * Sem RESEND_API_KEY configurada, não faz nada.
 */
export async function notificarNovaProgramacao(programacaoId: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const db = supabaseAdmin();
    const { data: p } = await db
      .from("programacoes")
      .select("*, departamento:departamentos(nome)")
      .eq("id", programacaoId)
      .single<Programacao & { departamento: { nome: string } | null }>();
    if (!p) return;

    const { data: pessoas } = await db
      .from("perfis")
      .select("id, nome, email, papel, tratamento")
      .eq("igreja_id", p.igreja_id)
      .returns<Pick<Perfil, "id" | "nome" | "email" | "papel" | "tratamento">[]>();
    const autor = pessoas?.find((x) => x.id === p.criado_por);
    const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/programacoes/${p.id}`;
    const texto = mensagemNovaProgramacao(p, autor, link).replace(/\*/g, "");
    const html = `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5">${escapar(texto)}</div>`;

    for (const pessoa of pessoas ?? []) {
      if (pessoa.id === p.criado_por) continue;
      try {
        await enviarEmail(pessoa.email, `Nova programação: ${p.titulo}`, html, texto);
      } catch (e) {
        console.error("Falha ao avisar", pessoa.email, e);
      }
    }
  } catch (e) {
    console.error("Falha ao notificar nova programação", programacaoId, e);
  }
}
