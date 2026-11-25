import { dataLonga, horaCurta, somarDias } from "./datas";
import type { EscalaDia } from "./tipos";

/** "hoje", "amanhã" ou "sábado, 5 de dezembro". */
export function quandoE(data: string, hoje: string): string {
  if (data === hoje) return "hoje";
  if (data === somarDias(hoje, 1)) return "amanhã";
  return dataLonga(data);
}

/**
 * Mensagem que o líder manda (do próprio WhatsApp) para quem está na escala.
 * Ex: "Olá, Pedro! Passando para lembrar que hoje é o seu dia na escala de
 * Música (Teclado): Culto Divino, às 9h. Conto com você! Ana – Música"
 */
export function mensagemAvisoEscala(opcoes: {
  nome: string;
  funcao: string | null;
  dia: Pick<EscalaDia, "data" | "horario" | "titulo">;
  departamento: string;
  hoje: string;
  /** Mensagem padrão escrita pelo líder (com marcadores). Vazio = texto do sistema. */
  modelo?: string | null;
}): string {
  const { nome, funcao, dia, departamento, hoje, modelo } = opcoes;
  if (modelo?.trim()) return aplicarModelo(modelo, { nome, funcao, dia, departamento, hoje });
  const detalhes = [dia.titulo, dia.horario ? `às ${horaCurta(dia.horario)}` : null].filter(Boolean).join(", ");
  return (
    `Olá, ${nome}! Passando para lembrar que ${quandoE(dia.data, hoje)} é o seu dia na escala de ${departamento}` +
    `${funcao ? ` (${funcao})` : ""}${detalhes ? `: ${detalhes}` : ""}. ` +
    `Conto com você!`
  );
}

/** Texto da escala do mês para compartilhar no grupo. */
export function textoEscalaMes(departamento: string, mesNome: string, dias: EscalaDia[]): string {
  const linhas = dias.map((d) => {
    const quem = (d.pessoas ?? [])
      .map((p) => `${p.membro?.nome ?? "?"}${p.funcao ? ` (${p.funcao})` : ""}`)
      .join(", ");
    const cab = `${dataLonga(d.data)}${d.horario ? `, ${horaCurta(d.horario)}` : ""}${d.titulo ? ` · ${d.titulo}` : ""}`;
    return `• ${cab}\n  ${quem || "a definir"}`;
  });
  return [`🗓️ *Escala de ${departamento}: ${mesNome}*`, "", ...linhas].join("\n");
}

export interface PendentesDoDepartamento {
  departamento: { id: string; nome: string; anciao_id: string | null };
  /** Perfis dos líderes (com login) do departamento. */
  lideres: string[];
  /** Nomes de quem está escalado e ainda não foi avisado. */
  pessoas: string[];
}

/**
 * Lembrete de véspera: para cada pessoa (líder do departamento ou, sem líder
 * com login, o ancião responsável), quantas pessoas ela precisa avisar amanhã.
 */
export function lembretesDeVespera(
  pendentes: PendentesDoDepartamento[],
  amanha: string,
): Map<string, { titulo: string; corpo: string; url: string; tag: string }> {
  const porPessoa = new Map<string, PendentesDoDepartamento[]>();
  for (const p of pendentes) {
    if (!p.pessoas.length) continue;
    const quem = responsaveisDoDepartamento(p.lideres, p.departamento.anciao_id);
    for (const id of quem) porPessoa.set(id, [...(porPessoa.get(id) ?? []), p]);
  }
  const saida = new Map<string, { titulo: string; corpo: string; url: string; tag: string }>();
  for (const [id, lista] of porPessoa) {
    const total = lista.reduce((n, p) => n + p.pessoas.length, 0);
    saida.set(id, {
      titulo: `Escala de amanhã: ${total} ${total === 1 ? "pessoa" : "pessoas"} para avisar`,
      corpo: lista.map((p) => `${p.departamento.nome}: ${p.pessoas.join(", ")}`).join("\n"),
      url: `/escalas/d/${lista[0].departamento.id}?mes=${amanha.slice(0, 7)}&dia=${amanha}`,
      tag: `vespera-${amanha}`,
    });
  }
  return saida;
}

/** Quem cuida da escala: os líderes com login ou, sem nenhum, o ancião responsável. */
export function responsaveisDoDepartamento(lideres: string[], anciaoId: string | null): string[] {
  return lideres.length ? lideres : anciaoId ? [anciaoId] : [];
}

/** Notificação automática para o associado na véspera do dia dele. */
export function lembreteAssociado(opcoes: {
  nome: string;
  dia: Pick<EscalaDia, "data" | "horario" | "titulo">;
  departamento: string;
  token: string;
  hoje: string;
}) {
  const { nome, dia, departamento, token, hoje } = opcoes;
  const detalhes = [dia.titulo, dia.horario ? `às ${horaCurta(dia.horario)}` : null].filter(Boolean).join(", ");
  const quando = quandoE(dia.data, hoje);
  return {
    titulo: `Escala de ${departamento}: ${quando}`,
    corpo: `Olá, ${nome}! ${maiusculaInicial(quando)} é o seu dia${detalhes ? `: ${detalhes}` : ""}. Toque para confirmar.`,
    url: `/m/${token}`,
    tag: `escala-${token}-${dia.data}`,
  };
}

/** Mensagem de WhatsApp com o link pessoal para o associado ativar os lembretes. */
export function mensagemLinkLembretes(nome: string, departamento: string, link: string): string {
  return (
    `Olá, ${nome}! Para receber no celular os lembretes da escala de ${departamento} ` +
    `(e confirmar os seus dias), abra este link e toque em "Ativar lembretes": ${link}`
  );
}

function maiusculaInicial(t: string) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Marcadores que o líder pode usar na mensagem padrão. */
export const MARCADORES = [
  { chave: "{nome}", descricao: "nome da pessoa" },
  { chave: "{quando}", descricao: "hoje / amanhã / a data" },
  { chave: "{data}", descricao: "data completa" },
  { chave: "{horario}", descricao: "horário" },
  { chave: "{programacao}", descricao: "título do dia" },
  { chave: "{funcao}", descricao: "função" },
  { chave: "{departamento}", descricao: "departamento" },
] as const;

export const MODELO_SUGERIDO =
  "Olá, {nome}! Passando para lembrar que {quando} é o seu dia na escala de {departamento}, às {horario}. Conto com você! 🙏";

/** Troca os marcadores pelos dados do dia; marcador sem valor some sem deixar sobra. */
export function aplicarModelo(
  modelo: string,
  v: { nome: string; funcao: string | null; dia: Pick<EscalaDia, "data" | "horario" | "titulo">; departamento: string; hoje: string },
): string {
  const valores: Record<string, string> = {
    nome: v.nome,
    quando: quandoE(v.dia.data, v.hoje),
    data: dataLonga(v.dia.data),
    horario: v.dia.horario ? horaCurta(v.dia.horario) : "",
    programacao: v.dia.titulo ?? "",
    funcao: v.funcao ?? "",
    departamento: v.departamento,
  };
  return modelo
    .replace(/\{(\w+)\}/g, (todo, chave: string) => (chave.toLowerCase() in valores ? valores[chave.toLowerCase()] : todo))
    .replace(/,?\s*às\s*(?=[,.!?)]|$)/g, "") // "às {horario}" sem horário
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}
