import "server-only";
import webpush from "web-push";
import type { NotificacaoPush } from "./avisos";
import { supabaseAdmin } from "./supabase/servidor";

export function pushConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    // Identificação do remetente exigida pelos serviços de push (URL do site, sem e-mail pessoal).
    process.env.NEXT_PUBLIC_APP_URL || "https://iasdagenda-pvbl.onrender.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
}

/**
 * Envia a notificação para todos os aparelhos das pessoas indicadas.
 * Aparelhos que não existem mais (410/404) são removidos.
 * Devolve quantos aparelhos receberam.
 */
export async function enviarPush(perfilIds: string[], notificacao: NotificacaoPush): Promise<number> {
  if (!pushConfigurado() || perfilIds.length === 0) return 0;
  const { data: inscricoes } = await supabaseAdmin()
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .in("perfil_id", perfilIds);
  return enviarParaAparelhos("push_inscricoes", inscricoes ?? [], notificacao);
}

/** Mesma coisa para associados (sem login), pelos aparelhos que ativaram no link pessoal. */
export async function enviarPushMembro(membroId: string, notificacao: NotificacaoPush): Promise<number> {
  if (!pushConfigurado()) return 0;
  const db = supabaseAdmin();
  const { data: inscricoes } = await db
    .from("membro_push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .eq("membro_id", membroId);
  const enviados = await enviarParaAparelhos("membro_push_inscricoes", inscricoes ?? [], notificacao);
  if (enviados === 0) {
    // Nenhum aparelho válido sobrou: o líder volta a ver a pessoa como "sem lembrete automático".
    const { count } = await db.from("membro_push_inscricoes").select("id", { count: "exact", head: true }).eq("membro_id", membroId);
    if (!count) await db.from("departamento_membros").update({ lembretes_ativos_em: null }).eq("id", membroId);
  }
  return enviados;
}

type Aparelho = { id: string; endpoint: string; p256dh: string; auth: string };

async function enviarParaAparelhos(
  tabela: "push_inscricoes" | "membro_push_inscricoes",
  inscricoes: Aparelho[],
  notificacao: NotificacaoPush,
): Promise<number> {
  configurar();
  const db = supabaseAdmin();

  let enviados = 0;
  const payload = JSON.stringify(notificacao);
  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, {
          TTL: 24 * 3600,
          urgency: "normal",
        });
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from(tabela).delete().eq("id", i.id);
        } else {
          console.error("Falha no push", status, e);
        }
      }
    }),
  );
  return enviados;
}
