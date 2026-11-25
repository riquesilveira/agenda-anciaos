"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { detectarConflitos, type Conflito } from "@/lib/conflitos";
import { exigirPerfil } from "@/lib/sessao";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { notificarNovaProgramacao } from "@/lib/notificacoes";
import { enviarPush } from "@/lib/push";
import { departamentosParaCriar, ehLideranca } from "@/lib/permissoes";
import { limparSigla, sugerirSigla } from "@/lib/siglas";
import { CORES_PESSOA, cultoValido } from "@/lib/pregacao";
import { supabaseAdmin } from "@/lib/supabase/servidor";
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
  // Líder só cadastra programações locais (as da Associação/distrito são dos anciãos).
  const origem = (perfil.papel === "lider" ? "local" : texto(form, "origem")) as Origem;
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
  if (perfil.papel === "lider") {
    // O banco (RLS) também recusa; aqui é só para dar uma mensagem clara.
    const permitidos = departamentosParaCriar(perfil, await listarDepartamentos(supabase));
    if (!dados.departamento_id || !permitidos.some((d) => d.id === dados.departamento_id)) {
      return { erro: "Você só pode cadastrar programações dos departamentos que lidera." };
    }
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
    revalidatePath("/", "layout");
    redirect(`/?mes=${dados.data.slice(0, 7)}`);
  }

  const { data: criada, error } = await supabase
    .from("programacoes")
    .insert({ ...dados, igreja_id: perfil.igreja_id, criado_por: perfil.id, atualizado_por: perfil.id })
    .select("id")
    .single();
  if (error || !criada) return { erro: "Não foi possível salvar. Tente de novo." };

  // Aviso por e-mail depois da resposta: nunca atrasa (nem derruba) o cadastro.
  after(() => notificarNovaProgramacao(criada.id));
  revalidatePath("/", "layout");
  // Página do evento com o botão "Avisar no WhatsApp".
  redirect(`/programacoes/${criada.id}?criado=1`);
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

export interface EstadoDepartamento extends EstadoConvite {
  ok?: boolean;
}

function dadosDepartamento(form: FormData) {
  const nome = texto(form, "nome");
  return {
    nome,
    sigla: limparSigla(texto(form, "sigla") ?? "") || (nome ? sugerirSigla(nome) : "") || null,
    anciao_id: texto(form, "anciao_id"),
  };
}

function erroDepartamento(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    return /sigla/.test(error.message ?? "")
      ? "Já existe um departamento com essa sigla."
      : "Já existe um departamento com esse nome.";
  }
  return "Não foi possível salvar o departamento.";
}

/** Cria o departamento e, se vier o e-mail do líder, já gera o convite. */
export async function criarDepartamento(_anterior: EstadoDepartamento, form: FormData): Promise<EstadoDepartamento> {
  const { supabase, perfil } = await exigirPerfil();
  if (!ehLideranca(perfil)) return { erro: "Só anciãos e o pastor podem criar departamentos." };
  const dados = dadosDepartamento(form);
  if (!dados.nome) return { erro: "Informe o nome do departamento." };

  const liderNome = texto(form, "lider_nome");
  const liderEmail = texto(form, "lider_email");
  const liderWhatsapp = texto(form, "lider_whatsapp");

  const { data: dep, error } = await supabase
    .from("departamentos")
    .insert({ ...dados, igreja_id: perfil.igreja_id, lider_nome: liderNome, lider_whatsapp: liderWhatsapp })
    .select("id")
    .single();
  if (error || !dep) return { erro: error ? erroDepartamento(error) : "Não foi possível salvar o departamento." };

  revalidatePath("/", "layout");
  if (!liderEmail) return { ok: true };
  if (!liderNome) return { ok: true, erro: "Departamento criado. Para convidar o líder, informe também o nome." };
  const convite = await gerarConviteLider(perfil, supabase, dep.id, liderNome, liderEmail, liderWhatsapp);
  return { ok: true, ...convite };
}

export async function editarDepartamento(_anterior: EstadoDepartamento, form: FormData): Promise<EstadoDepartamento> {
  const { supabase, perfil } = await exigirPerfil();
  if (!ehLideranca(perfil)) return { erro: "Só anciãos e o pastor podem editar departamentos." };
  const id = texto(form, "id");
  const dados = dadosDepartamento(form);
  if (!id || !dados.nome) return { erro: "Informe o nome do departamento." };
  const { error } = await supabase
    .from("departamentos")
    .update({ ...dados, lider_nome: texto(form, "lider_nome"), lider_whatsapp: texto(form, "lider_whatsapp") })
    .eq("id", id);
  if (error) return { erro: erroDepartamento(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function excluirDepartamento(form: FormData) {
  const { supabase, perfil } = await exigirPerfil();
  if (!ehLideranca(perfil)) return;
  await supabase.from("departamentos").delete().eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
}

export async function sair() {
  const { supabase } = await exigirPerfil();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function salvarMeuPerfil(
  _anterior: { ok?: boolean; erro?: string },
  form: FormData,
): Promise<{ ok?: boolean; erro?: string }> {
  const { supabase, perfil } = await exigirPerfil();
  const nome = texto(form, "nome");
  if (!nome) return { erro: "Informe seu nome." };
  const cor = texto(form, "cor");
  // Só o próprio perfil (id da sessão); papel e igreja não são editáveis (grant por coluna).
  const { error } = await supabase
    .from("perfis")
    .update({
      nome,
      tratamento: texto(form, "tratamento"),
      whatsapp: texto(form, "whatsapp"),
      cor: cor && cor in CORES_PESSOA ? cor : null,
    })
    .eq("id", perfil.id);
  if (error) {
    console.error("Falha ao salvar perfil", perfil.id, error);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export interface EstadoConvite {
  erro?: string;
  link?: string;
  nome?: string;
  whatsapp?: string | null;
  departamento?: string;
}

/**
 * Anciãos/pastor convidam o líder de um departamento. Gera um link de uso
 * único (válido por 24h) para a pessoa criar a própria senha; o ancião envia
 * pelo WhatsApp. Não depende de e-mail.
 */
export async function convidarLider(_anterior: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  const { supabase, perfil } = await exigirPerfil();
  if (!ehLideranca(perfil)) return { erro: "Só anciãos e o pastor podem convidar líderes." };
  const departamentoId = texto(form, "departamento_id");
  const nome = texto(form, "nome");
  const email = texto(form, "email");
  if (!departamentoId || !nome || !email) return { erro: "Preencha nome e e-mail." };
  return gerarConviteLider(perfil, supabase, departamentoId, nome, email, texto(form, "whatsapp"));
}

/**
 * Cadastra (ou reaproveita) o usuário do líder, vincula ao departamento e
 * devolve um link de uso único (24h) para ele criar a senha. Quem chama já
 * conferiu que é ancião/pastor.
 */
async function gerarConviteLider(
  perfil: { igreja_id: string },
  supabase: Awaited<ReturnType<typeof exigirPerfil>>["supabase"],
  departamentoId: string,
  nome: string,
  emailInformado: string,
  whatsapp: string | null,
): Promise<EstadoConvite> {
  const email = emailInformado.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: "E-mail do líder inválido." };

  // O departamento precisa ser desta igreja (o cliente com sessão só enxerga os dela).
  const { data: dep } = await supabase.from("departamentos").select("id, nome").eq("id", departamentoId).single();
  if (!dep) return { erro: "Departamento não encontrado." };

  const admin = supabaseAdmin();
  const { data: existente } = await admin.from("perfis").select("id, igreja_id, papel").eq("email", email).maybeSingle();
  if (existente && existente.igreja_id !== perfil.igreja_id) {
    return { erro: "Este e-mail já está cadastrado em outra igreja." };
  }

  // Usuário novo: convite. Já existente: link para (re)definir a senha.
  let tipo: "invite" | "recovery" = existente ? "recovery" : "invite";
  let gerado = existente
    ? await admin.auth.admin.generateLink({ type: "recovery", email })
    : await admin.auth.admin.generateLink({ type: "invite", email, options: { data: { nome } } });
  if (gerado.error && tipo === "invite" && /registered|exists/i.test(gerado.error.message)) {
    tipo = "recovery";
    gerado = await admin.auth.admin.generateLink({ type: "recovery", email });
  }
  if (gerado.error || !gerado.data.user) {
    console.error("Falha ao gerar convite", gerado.error);
    return { erro: "Não foi possível gerar o convite. Tente de novo." };
  }
  const usuarioId = gerado.data.user.id;

  if (!existente) {
    const { error } = await admin.from("perfis").insert({
      id: usuarioId,
      igreja_id: perfil.igreja_id,
      nome,
      papel: "lider",
      email,
      whatsapp,
    });
    if (error) return { erro: "Não foi possível cadastrar o líder." };
  }
  await admin.from("departamento_lideres").upsert({ departamento_id: dep.id, perfil_id: usuarioId });
  // Mantém nome/WhatsApp do líder visíveis no departamento (usados nos lembretes).
  await admin.from("departamentos").update({ lider_nome: nome, lider_whatsapp: whatsapp }).eq("id", dep.id);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${base}/definir-senha?token_hash=${encodeURIComponent(gerado.data.properties.hashed_token)}&type=${tipo}`;
  revalidatePath("/departamentos");
  return { link, nome, whatsapp, departamento: dep.nome };
}

export async function removerLider(form: FormData) {
  const { supabase, perfil } = await exigirPerfil();
  if (!ehLideranca(perfil)) return;
  await supabase
    .from("departamento_lideres")
    .delete()
    .eq("departamento_id", String(form.get("departamento_id")))
    .eq("perfil_id", String(form.get("perfil_id")));
  revalidatePath("/", "layout");
}

/** Guarda o aparelho em que a pessoa ativou as notificações. */
export async function salvarInscricaoPush(inscricao: {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  aparelho?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const { supabase, perfil } = await exigirPerfil();
  const { endpoint, keys } = inscricao;
  if (!endpoint?.startsWith("https://") || !keys?.p256dh || !keys?.auth) {
    console.error("Inscrição push incompleta", perfil.id, inscricao.aparelho, Boolean(endpoint), Boolean(keys?.p256dh));
    return { ok: false, erro: "o aparelho não enviou as chaves da notificação" };
  }
  // Mesmo aparelho com outra pessoa logada: a inscrição passa a ser de quem está logado agora.
  await supabaseAdmin().from("push_inscricoes").delete().eq("endpoint", endpoint).neq("perfil_id", perfil.id);
  const { error } = await supabase.from("push_inscricoes").upsert(
    {
      perfil_id: perfil.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      aparelho: inscricao.aparelho?.slice(0, 120) ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("Falha ao salvar inscrição push", perfil.id, inscricao.aparelho, error);
    return { ok: false, erro: `o servidor recusou (${error.code ?? error.message})` };
  }
  return { ok: true };
}

export async function removerInscricaoPush(endpoint: string): Promise<void> {
  const { supabase } = await exigirPerfil();
  await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
}

/** Notificação de teste para os aparelhos da própria pessoa. */
export async function testarPush(): Promise<{ enviados: number }> {
  const { perfil } = await exigirPerfil();
  const enviados = await enviarPush([perfil.id], {
    titulo: "Notificações ativadas ✅",
    corpo: "É assim que você vai ser avisado quando alguém cadastrar uma programação.",
    url: "/novidades",
    tag: "teste",
  });
  return { enviados };
}

// ---------------------------------------------------------------------------
// Escala de pregação (só o ancião responsável edita; garantido no RLS)
// ---------------------------------------------------------------------------

export async function assumirCulto(form: FormData) {
  const { supabase, perfil } = await exigirPerfil();
  const data = String(form.get("data") ?? "");
  const culto = String(form.get("culto") ?? "");
  if (!ehLideranca(perfil) || !cultoValido(data, culto)) return;
  await supabase
    .from("escala_pregacao")
    .insert({ igreja_id: perfil.igreja_id, data, culto, anciao_id: perfil.id });
  revalidatePath("/escalas");
  redirect(`/escalas/${data}/${culto}`);
}

export interface EstadoPregacao {
  ok?: boolean;
  erro?: string;
}


export async function salvarPregacao(_anterior: EstadoPregacao, form: FormData): Promise<EstadoPregacao> {
  const { supabase, perfil } = await exigirPerfil();
  const id = texto(form, "id");
  const anciaoId = texto(form, "anciao_id") ?? perfil.id;
  if (!id) return { erro: "Dados inválidos." };
  const pregador = texto(form, "pregador_nome");

  const { data, error } = await supabase
    .from("escala_pregacao")
    .update({
      pregador_nome: pregador,
      observacoes: texto(form, "observacoes"),
      // Formulário simples: com pregador = definido; sem = a definir.
      status: pregador ? "confirmado" : "a_convidar",
      anciao_id: anciaoId,
    })
    .eq("id", id)
    .select("data, culto");
  if (error || !data?.length) {
    if (error) console.error("Falha ao salvar pregação", id, error);
    return { erro: "Só o ancião responsável por este culto pode alterar." };
  }
  revalidatePath("/escalas", "layout");
  // Depois de salvar, volta para a escala do mês.
  redirect(`/escalas?mes=${String(data[0].data).slice(0, 7)}`);
}

export async function liberarCulto(form: FormData) {
  const { supabase } = await exigirPerfil();
  const id = String(form.get("id"));
  const { data } = await supabase.from("escala_pregacao").delete().eq("id", id).select("data").maybeSingle();
  revalidatePath("/escalas", "layout");
  redirect(data ? `/escalas?mes=${String(data.data).slice(0, 7)}` : "/escalas");
}

// ---------------------------------------------------------------------------
// Escalas dos departamentos (equipe + dias). Permissão garantida no RLS:
// líder do departamento ou ancião/pastor.
// ---------------------------------------------------------------------------

export async function adicionarMembro(form: FormData) {
  const { supabase } = await exigirPerfil();
  const departamentoId = texto(form, "departamento_id");
  const nome = texto(form, "nome");
  if (!departamentoId || !nome) return;
  await supabase.from("departamento_membros").insert({ departamento_id: departamentoId, nome, whatsapp: texto(form, "whatsapp") });
  revalidatePath("/escalas", "layout");
}

export async function editarMembro(form: FormData) {
  const { supabase } = await exigirPerfil();
  const nome = texto(form, "nome");
  if (!nome) return;
  await supabase
    .from("departamento_membros")
    .update({ nome, whatsapp: texto(form, "whatsapp") })
    .eq("id", String(form.get("id")));
  revalidatePath("/escalas", "layout");
}

export async function removerMembro(form: FormData) {
  const { supabase } = await exigirPerfil();
  // Desativa em vez de apagar, para não sumir das escalas antigas.
  await supabase.from("departamento_membros").update({ ativo: false }).eq("id", String(form.get("id")));
  revalidatePath("/escalas", "layout");
}

export interface EstadoDiaEscala {
  ok?: boolean;
  erro?: string;
}

/** Cria ou atualiza os dados de um dia da escala (data, horário, título, observação). */
export async function salvarDiaEscala(_anterior: EstadoDiaEscala, form: FormData): Promise<EstadoDiaEscala> {
  const { supabase } = await exigirPerfil();
  const id = texto(form, "id");
  const departamentoId = texto(form, "departamento_id");
  const data = texto(form, "data");
  if (!departamentoId || !data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Informe a data." };
  const dados = {
    departamento_id: departamentoId,
    data,
    horario: texto(form, "horario"),
    titulo: texto(form, "titulo"),
    observacao: texto(form, "observacao"),
  };
  const salvo = id
    ? await supabase.from("escala_dias").update(dados).eq("id", id).select("id").single()
    : await supabase.from("escala_dias").insert(dados).select("id").single();
  if (salvo.error || !salvo.data) {
    console.error("Falha ao salvar dia da escala", salvo.error);
    return { erro: "Só o líder deste departamento (ou um ancião) pode alterar a escala." };
  }
  revalidatePath("/escalas", "layout");
  return { ok: true };
}

/** Arrastar (ou tocar) um nome num dia: coloca a pessoa na escala daquele dia. */
export async function adicionarPessoaDia(diaId: string, membroId: string): Promise<{ id?: string; erro?: string }> {
  const { supabase } = await exigirPerfil();
  const { count } = await supabase.from("escala_dia_pessoas").select("id", { count: "exact", head: true }).eq("escala_dia_id", diaId);
  const { data, error } = await supabase
    .from("escala_dia_pessoas")
    .insert({ escala_dia_id: diaId, membro_id: membroId, ordem: count ?? 0 })
    .select("id")
    .single();
  if (error || !data) {
    console.error("Falha ao escalar pessoa", error);
    return { erro: "Não foi possível escalar. Só o líder deste departamento (ou um ancião) pode alterar." };
  }
  revalidatePath("/escalas", "layout");
  return { id: data.id as string };
}

export async function removerPessoaDia(id: string): Promise<void> {
  const { supabase } = await exigirPerfil();
  await supabase.from("escala_dia_pessoas").delete().eq("id", id);
  revalidatePath("/escalas", "layout");
}

export async function definirFuncaoPessoa(id: string, funcao: string): Promise<void> {
  const { supabase } = await exigirPerfil();
  await supabase.from("escala_dia_pessoas").update({ funcao: funcao.trim() || null }).eq("id", id);
  revalidatePath("/escalas", "layout");
}

export async function avisoPessoa(id: string, avisado: boolean): Promise<void> {
  const { supabase } = await exigirPerfil();
  await supabase.from("escala_dia_pessoas").update({ avisado_em: avisado ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/escalas", "layout");
}

export async function excluirDiaEscala(form: FormData) {
  const { supabase } = await exigirPerfil();
  const { data } = await supabase
    .from("escala_dias")
    .delete()
    .eq("id", String(form.get("id")))
    .select("departamento_id, data")
    .maybeSingle();
  revalidatePath("/escalas", "layout");
  redirect(data ? `/escalas/d/${data.departamento_id}?mes=${String(data.data).slice(0, 7)}` : "/escalas");
}

/**
 * Soltar um nome num dia do calendário da escala: usa o dia da escala que já
 * existe nessa data (ou cria um) e coloca a pessoa nele.
 */
export async function escalarNaData(
  departamentoId: string,
  data: string,
  membroId: string,
): Promise<{ diaId?: string; pessoaId?: string; erro?: string }> {
  const { supabase } = await exigirPerfil();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida." };
  const negado = "Só o líder deste departamento (ou um ancião) pode alterar a escala.";

  const { data: existente } = await supabase
    .from("escala_dias")
    .select("id")
    .eq("departamento_id", departamentoId)
    .eq("data", data)
    .order("horario", { nullsFirst: true })
    .limit(1)
    .maybeSingle();
  let diaId = existente?.id as string | undefined;
  if (!diaId) {
    const novo = await supabase.from("escala_dias").insert({ departamento_id: departamentoId, data }).select("id").single();
    if (novo.error || !novo.data) {
      console.error("Falha ao criar dia da escala", novo.error);
      return { erro: negado };
    }
    diaId = novo.data.id as string;
  }
  const r = await adicionarPessoaDia(diaId, membroId);
  if (r.erro) return { erro: negado };
  return { diaId, pessoaId: r.id };
}

/** Culto ainda sem responsável: quem cadastra o pregador já assume o culto. */
export async function assumirComPregador(_anterior: EstadoPregacao, form: FormData): Promise<EstadoPregacao> {
  const { supabase, perfil } = await exigirPerfil();
  const data = String(form.get("data") ?? "");
  const culto = String(form.get("culto") ?? "");
  if (!ehLideranca(perfil)) return { erro: "Só anciãos e o pastor podem cadastrar a pregação." };
  if (!cultoValido(data, culto)) return { erro: "Culto inválido." };
  const pregador = texto(form, "pregador_nome");
  const { error } = await supabase.from("escala_pregacao").insert({
    igreja_id: perfil.igreja_id,
    data,
    culto,
    anciao_id: perfil.id,
    pregador_nome: pregador,
    observacoes: texto(form, "observacoes"),
    status: pregador ? "confirmado" : "a_convidar",
  });
  if (error) {
    console.error("Falha ao assumir culto", error);
    return { erro: error.code === "23505" ? "Outro ancião acabou de assumir este culto. Recarregue a página." : "Não foi possível salvar." };
  }
  revalidatePath("/escalas", "layout");
  redirect(`/escalas?mes=${data.slice(0, 7)}`);
}
