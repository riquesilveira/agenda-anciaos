"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { detectarConflitos, type Conflito } from "@/lib/conflitos";
import { exigirPerfil } from "@/lib/sessao";
import { listarProgramacoes } from "@/lib/consultas";
import type { Origem } from "@/lib/tipos";

export interface EstadoFormProgramacao {
  erro?: string;
  conflitos?: Conflito[];
}

const ORIGENS_VALIDAS: Origem[] = ["associacao", "distrito", "local"];

function texto(form: FormData, campo: string): string | null {
  const v = String(form.get(campo) ?? "").trim();
  return v || null;
}

export async function salvarProgramacao(
  _anterior: EstadoFormProgramacao,
  form: FormData,
): Promise<EstadoFormProgramacao> {
  const { supabase, perfil } = await exigirPerfil();

  const id = texto(form, "id");
  const origem = texto(form, "origem") as Origem;
  const dados = {
    titulo: texto(form, "titulo"),
    descricao: texto(form, "descricao"),
    data: texto(form, "data"),
    data_fim: texto(form, "data_fim"),
    hora_inicio: texto(form, "hora_inicio"),
    hora_fim: texto(form, "hora_fim"),
    local: texto(form, "local"),
    origem,
    departamento_id: texto(form, "departamento_id"),
  };

  if (!dados.titulo || !dados.data) return { erro: "Título e data são obrigatórios." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) return { erro: "Data inválida." };
  if (!ORIGENS_VALIDAS.includes(origem)) return { erro: "Origem inválida." };
  if (dados.data_fim === dados.data) dados.data_fim = null;
  if (dados.data_fim && (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data_fim) || dados.data_fim < dados.data)) {
    return { erro: "A data final precisa ser depois da data inicial." };
  }
  if (dados.hora_inicio && dados.hora_fim && dados.hora_fim < dados.hora_inicio) {
    return { erro: "O horário de término é antes do início." };
  }

  // Conflitos são só aviso: na primeira tentativa mostramos, e o usuário
  // pode confirmar com "Salvar mesmo assim".
  if (form.get("confirmar") !== "1") {
    const doPeriodo = await listarProgramacoes(supabase, dados.data, dados.data_fim ?? dados.data);
    const conflitos = detectarConflitos({ ...dados, id, data: dados.data }, doPeriodo);
    if (conflitos.length) return { conflitos };
  }

  if (id) {
    const { error } = await supabase
      .from("programacoes")
      .update({ ...dados, atualizado_por: perfil.id })
      .eq("id", id);
    if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  } else {
    const { error } = await supabase
      .from("programacoes")
      .insert({ ...dados, igreja_id: perfil.igreja_id, criado_por: perfil.id, atualizado_por: perfil.id });
    if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  }

  revalidatePath("/", "layout");
  redirect(`/?mes=${dados.data.slice(0, 7)}`);
}

export async function excluirProgramacao(form: FormData) {
  const { supabase } = await exigirPerfil();
  const id = String(form.get("id"));
  const { data } = await supabase.from("programacoes").delete().eq("id", id).select("data").single();
  revalidatePath("/", "layout");
  redirect(data ? `/?mes=${String(data.data).slice(0, 7)}` : "/");
}

export async function marcarAvisado(form: FormData) {
  const { supabase, perfil } = await exigirPerfil();
  const id = String(form.get("id"));
  const avisado = form.get("avisado") === "1";
  await supabase
    .from("programacoes")
    .update(
      avisado
        ? { lider_avisado_em: new Date().toISOString(), lider_avisado_por: perfil.id }
        : { lider_avisado_em: null, lider_avisado_por: null },
    )
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function salvarDepartamento(form: FormData) {
  const { supabase, perfil } = await exigirPerfil();
  const id = texto(form, "id");
  const dados = {
    nome: texto(form, "nome"),
    cor: texto(form, "cor") ?? "#64748b",
    anciao_id: texto(form, "anciao_id"),
    lider_nome: texto(form, "lider_nome"),
    lider_whatsapp: texto(form, "lider_whatsapp"),
  };
  if (!dados.nome) return;

  if (id) await supabase.from("departamentos").update(dados).eq("id", id);
  else await supabase.from("departamentos").insert({ ...dados, igreja_id: perfil.igreja_id });
  revalidatePath("/", "layout");
}

export async function excluirDepartamento(form: FormData) {
  const { supabase } = await exigirPerfil();
  await supabase.from("departamentos").delete().eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
}

export async function sair() {
  const { supabase } = await exigirPerfil();
  await supabase.auth.signOut();
  redirect("/login");
}
