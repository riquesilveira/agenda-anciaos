import "server-only";
import { mensagemNovaProgramacao, pushNovaProgramacao } from "./avisos";
import { enviarEmail } from "./email/enviar";
import { enviarPush } from "./push";
import { supabaseAdmin } from "./supabase/servidor";
import type { Perfil, Programacao } from "./tipos";
import { URL_SITE } from "@/lib/url";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Avisa todos da igreja (menos quem criou) sobre a nova programação:
 * notificação no celular (se configurada) e e-mail (se RESEND_API_KEY existir).
 * Roda depois da resposta (after()), nunca atrasa quem está salvando.
 */
export async function notificarNovaProgramacao(programacaoId: string) {
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
    const destinatarios = (pessoas ?? []).filter((x) => x.id !== p.criado_por);

    await enviarPush(
      destinatarios.map((x) => x.id),
      pushNovaProgramacao(p, autor),
    );

    if (!process.env.RESEND_API_KEY) return;
    const link = `${URL_SITE}/programacoes/${p.id}`;
    const texto = mensagemNovaProgramacao(p, autor, link).replace(/\*/g, "");
    const html = `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;line-height:1.5">${escapar(texto)}</div>`;
    for (const pessoa of destinatarios) {
      try {
        await enviarEmail(pessoa.email, `Nova programação: ${p.titulo}`, html, texto);
      } catch (e) {
        console.error("Falha ao avisar por e-mail", pessoa.email, e);
      }
    }
  } catch (e) {
    console.error("Falha ao notificar nova programação", programacaoId, e);
  }
}
