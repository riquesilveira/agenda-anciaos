"use server";

import { after } from "next/server";
import { enviarPush } from "@/lib/push";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/servidor";
import { igrejaParaEntrada, type IgrejaParaEntrada } from "./dados";

export interface EstadoEntrada {
  ok?: boolean;
  erro?: string;
}

/** Lê e confere igreja, nome, WhatsApp e departamentos do formulário. */
async function lerFormulario(form: FormData) {
  const igreja = await igrejaParaEntrada(String(form.get("igreja_id") ?? ""));
  const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
  const whatsapp = String(form.get("whatsapp") ?? "").trim().slice(0, 30) || null;
  // Líder de departamento ou ancião (ancião não precisa de departamento).
  const escolhidos = form.getAll("departamento_id").map(String);
  // "Ancionato" vem como um departamento especial na lista.
  const comoAnciao = escolhidos.includes("__ancionato");
  // Só departamentos da igreja escolhida (conferido no banco).
  const departamentos = igreja?.departamentos.filter((d) => escolhidos.includes(d.id)) ?? [];
  const erro = !igreja
    ? "Escolha a sua igreja."
    : !nome
      ? "Informe seu nome."
      : !comoAnciao && !departamentos.length
        ? "Escolha o departamento que você lidera."
        : null;
  return { igreja, nome, whatsapp, departamentos, comoAnciao, erro };
}

/**
 * Entrada pelo link do 7Líder: a pessoa escolhe a igreja e os departamentos
 * que lidera, cria e-mail/senha e entra como líder. O ancionato daquela
 * igreja é avisado e pode remover o acesso.
 */
export async function entrarPeloLink(form: FormData): Promise<EstadoEntrada> {
  const { igreja, nome, whatsapp, departamentos, comoAnciao, erro } = await lerFormulario(form);
  if (erro || !igreja) return { erro: erro ?? "Escolha a sua igreja." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };

  const db = supabaseAdmin();
  const criado = await db.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (criado.error || !criado.data.user) {
    if (/registered|exists/i.test(criado.error?.message ?? "")) {
      return { erro: "Este e-mail já tem conta. Use a tela de login (ou “Esqueci a senha”)." };
    }
    console.error("Entrada pelo link: falha ao criar usuário", criado.error);
    return { erro: "Não foi possível criar sua conta. Tente de novo." };
  }
  const id = criado.data.user.id;
  const r = await criarLider(igreja, id, { nome, email, whatsapp, departamentos, comoAnciao });
  if (r.erro) await db.auth.admin.deleteUser(id);
  return r;
}

/**
 * Quem entrou com o Google pelo link: já está logado, mas sem perfil.
 * Completa igreja, nome e departamento. A identidade vem da sessão.
 */
export async function completarEntradaGoogle(form: FormData): Promise<EstadoEntrada> {
  const {
    data: { user },
  } = await (await supabaseServidor()).auth.getUser();
  if (!user?.email) return { erro: "Sua sessão expirou. Toque em “Continuar com Google” de novo." };
  const { data: jaTem } = await supabaseAdmin().from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (jaTem) return { ok: true };
  const { igreja, nome, whatsapp, departamentos, comoAnciao, erro } = await lerFormulario(form);
  if (erro || !igreja) return { erro: erro ?? "Escolha a sua igreja." };
  return criarLider(igreja, user.id, { nome, email: user.email.toLowerCase(), whatsapp, departamentos, comoAnciao });
}

async function criarLider(
  igreja: IgrejaParaEntrada,
  id: string,
  d: { nome: string; email: string; whatsapp: string | null; departamentos: { id: string; nome: string }[]; comoAnciao: boolean },
): Promise<EstadoEntrada> {
  const db = supabaseAdmin();
  // Ancião: se a igreja ainda não tem ancião/pastor, entra como ancião (senão
  // ninguém poderia aprovar); se já tem, entra como líder e fica o pedido.
  const { data: ancionatoAtual } = await db.from("perfis").select("id").eq("igreja_id", igreja.id).in("papel", ["anciao", "pastor"]);
  const anciaoDireto = d.comoAnciao && !(ancionatoAtual ?? []).length;
  const { error } = await db.from("perfis").insert({
    id,
    igreja_id: igreja.id,
    nome: d.nome,
    papel: anciaoDireto ? "anciao" : "lider",
    email: d.email,
    whatsapp: d.whatsapp,
    entrou_pelo_link_em: new Date().toISOString(),
    pedido_anciao_em: d.comoAnciao && !anciaoDireto ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("Entrada pelo link: falha ao criar perfil", error);
    return { erro: "Não foi possível criar sua conta. Tente de novo." };
  }
  if (d.departamentos.length) {
    await db.from("departamento_lideres").insert(d.departamentos.map((x) => ({ departamento_id: x.id, perfil_id: id })));
  }

  // Avisa o ancionato da igreja (fire-and-forget): se não conhecerem a pessoa, removem o acesso.
  after(async () => {
    const { data: ancionato } = await db.from("perfis").select("id").eq("igreja_id", igreja.id).in("papel", ["anciao", "pastor"]).neq("id", id);
    await enviarPush(
      (ancionato ?? []).map((p) => p.id),
      {
        titulo: anciaoDireto
          ? `${d.nome} entrou como ancião`
          : d.comoAnciao
            ? `${d.nome} pediu acesso de ancião`
            : `${d.nome} entrou como líder`,
        corpo: d.comoAnciao
          ? anciaoDireto
            ? "Primeiro ancião da igreja · toque para conferir"
            : "Toque para aprovar ou remover"
          : `${d.departamentos.map((x) => x.nome).join(", ")} · toque para conferir`,
        url: "/departamentos#entradas",
        tag: `entrada-${id}`,
      },
    );
  });
  return { ok: true };
}
