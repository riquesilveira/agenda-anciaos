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
    process.env.NEXT_PUBLIC_APP_URL || "https://agenda-anciaos.onrender.com",
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
  configurar();
  const db = supabaseAdmin();
  const { data: inscricoes } = await db
    .from("push_inscricoes")
    .select("id, endpoint, p256dh, auth")
    .in("perfil_id", perfilIds);

  let enviados = 0;
  const payload = JSON.stringify(notificacao);
  await Promise.all(
    (inscricoes ?? []).map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, {
          TTL: 24 * 3600,
          urgency: "normal",
        });
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from("push_inscricoes").delete().eq("id", i.id);
        } else {
          console.error("Falha no push", status, e);
        }
      }
    }),
  );
  return enviados;
}
