"use server";

import { after } from "next/server";
import { enviarPush } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { igrejaPorCodigo } from "./dados";

export interface EstadoEntrada {
  ok?: boolean;
  erro?: string;
}

/**
 * Entrada pelo link da igreja: cria o usuário como líder dos departamentos
 * escolhidos e avisa os anciãos/pastor (que podem remover o acesso depois).
 * A igreja vem do código do link; os departamentos são conferidos contra ela.
 */
export async function entrarPeloLink(codigo: string, form: FormData): Promise<EstadoEntrada> {
  const igreja = await igrejaPorCodigo(codigo);
  if (!igreja) return { erro: "Este link não vale mais. Peça o link novo a quem te enviou." };

  const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const whatsapp = String(form.get("whatsapp") ?? "").trim().slice(0, 30) || null;
  const escolhidos = form.getAll("departamento_id").map(String);
  const departamentos = igreja.departamentos.filter((d) => escolhidos.includes(d.id));

  if (!nome) return { erro: "Informe seu nome." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };
  if (!departamentos.length) return { erro: "Escolha o departamento que você lidera." };

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

  const { error: erroPerfil } = await db.from("perfis").insert({
    id,
    igreja_id: igreja.id,
    nome,
    papel: "lider",
    email,
    whatsapp,
    entrou_pelo_link_em: new Date().toISOString(),
  });
  if (erroPerfil) {
    console.error("Entrada pelo link: falha ao criar perfil", erroPerfil);
    await db.auth.admin.deleteUser(id);
    return { erro: "Não foi possível criar sua conta. Tente de novo." };
  }
  await db.from("departamento_lideres").insert(departamentos.map((d) => ({ departamento_id: d.id, perfil_id: id })));

  // Avisa o ancionato (fire-and-forget): se não conhecerem a pessoa, removem o acesso.
  after(async () => {
    const { data: ancionato } = await db.from("perfis").select("id").eq("igreja_id", igreja.id).in("papel", ["anciao", "pastor"]);
    await enviarPush(
      (ancionato ?? []).map((p) => p.id),
      {
        titulo: `${nome} entrou como líder`,
        corpo: `${departamentos.map((d) => d.nome).join(", ")} · toque para conferir`,
        url: "/departamentos#entradas",
        tag: `entrada-${id}`,
      },
    );
  });
  return { ok: true };
}
