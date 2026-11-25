import type { Resumo } from "../resumo";

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function htmlDoResumo(resumo: Resumo, urlApp: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#0f172a;max-width:600px;margin:auto;padding:16px">
<div style="white-space:pre-wrap;line-height:1.5">${escapar(resumo.texto)}</div>
<p style="margin-top:24px"><a href="${escapar(urlApp)}/minhas" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir minhas programações</a></p>
<p style="color:#64748b;font-size:12px;margin-top:24px">7Líder</p>
</body></html>`;
}

/** Envia pelo Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function enviarEmail(para: string, assunto: string, html: string, texto: string) {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: [para], subject: assunto, html, text: texto }),
  });
  if (!resposta.ok) throw new Error(`Resend ${resposta.status}: ${await resposta.text()}`);
}
