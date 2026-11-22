import { dataCurta, dataLonga, diasAte, horaCurta, nomeDoMes, somarDias } from "./datas";
import type { Departamento, Perfil, Programacao } from "./tipos";

/** Janela do resumo semanal: tudo que acontece nos próximos 30 dias. */
export const JANELA_SEMANAL_DIAS = 30;

export type TipoResumo = "mensal" | "semanal";

export interface ItemResumo {
  programacao: Programacao;
  departamento: Departamento | null;
  diasRestantes: number;
  avisado: boolean;
  /** true quando o destinatário é o ancião responsável pelo departamento. */
  responsavel: boolean;
}

export interface Resumo {
  tipo: TipoResumo;
  destinatario: Perfil;
  assunto: string;
  introducao: string;
  itens: ItemResumo[];
  pendentes: number;
  texto: string;
}

export function tratamento(p: Pick<Perfil, "nome" | "papel">): string {
  return `${p.papel === "pastor" ? "Pastor" : "Ancião"} ${p.nome}`;
}

/**
 * Quais programações entram no resumo de alguém:
 * - ancião: só as dos departamentos pelos quais é responsável;
 * - pastor: todas.
 */
export function programacoesDe(
  pessoa: Pick<Perfil, "id" | "papel">,
  programacoes: Programacao[],
  departamentos: Departamento[],
): Programacao[] {
  if (pessoa.papel === "pastor") return programacoes;
  const meus = new Set(departamentos.filter((d) => d.anciao_id === pessoa.id).map((d) => d.id));
  return programacoes.filter((p) => p.departamento_id && meus.has(p.departamento_id));
}

function linhaItem(item: ItemResumo, nomesAnciaos: Map<string, string>): string {
  const p = item.programacao;
  const d = item.departamento;
  const hora = p.hora_inicio ? ` ${horaCurta(p.hora_inicio)}` : "";
  const dep = d ? ` (${d.nome})` : "";
  const linhas = [`• ${dataCurta(p.data)}${hora}: ${p.titulo}${dep}`];

  if (d) {
    const lider = d.lider_nome ? `${d.lider_nome} (líder de ${d.nome})` : `o líder de ${d.nome}`;
    if (item.responsavel) {
      linhas.push(`  Você é o ancião responsável por ${d.nome}: lembre ${lider} sobre esta programação.`);
    } else {
      const anciao = d.anciao_id ? nomesAnciaos.get(d.anciao_id) : null;
      linhas.push(`  Ancião responsável: ${anciao ?? "ninguém definido"}.`);
    }
  }

  const quando = item.diasRestantes === 0 ? "é hoje" : item.diasRestantes === 1 ? "é amanhã" : `faltam ${item.diasRestantes} dias`;
  linhas.push(item.avisado ? `  ✅ Líder já avisado (${quando})` : `  ⚠️ Líder ainda não avisado (${quando})`);
  return linhas.join("\n");
}

export function gerarResumo(opcoes: {
  tipo: TipoResumo;
  destinatario: Perfil;
  programacoes: Programacao[];
  departamentos: Departamento[];
  perfis: Pick<Perfil, "id" | "nome" | "papel">[];
  hoje: string; // yyyy-MM-dd
  mes?: string; // yyyy-MM (mensal); padrão: mês de "hoje"
}): Resumo {
  const { tipo, destinatario, departamentos, hoje } = opcoes;
  const mes = opcoes.mes ?? hoje.slice(0, 7);
  const porId = new Map(departamentos.map((d) => [d.id, d]));
  const nomesAnciaos = new Map(opcoes.perfis.map((p) => [p.id, tratamento(p)]));
  const limiteSemanal = somarDias(hoje, JANELA_SEMANAL_DIAS);

  const itens: ItemResumo[] = programacoesDe(destinatario, opcoes.programacoes, departamentos)
    .filter((p) => p.data >= hoje)
    .filter((p) => (tipo === "mensal" ? p.data.startsWith(mes) : p.data <= limiteSemanal))
    .sort((a, b) => (a.data + (a.hora_inicio ?? "")).localeCompare(b.data + (b.hora_inicio ?? "")))
    .map((p) => {
      const departamento = p.departamento_id ? porId.get(p.departamento_id) ?? null : null;
      return {
        programacao: p,
        departamento,
        diasRestantes: diasAte(p.data, hoje),
        avisado: Boolean(p.lider_avisado_em),
        responsavel: departamento?.anciao_id === destinatario.id,
      };
    });

  const nome = tratamento(destinatario);
  const periodo = tipo === "mensal" ? `em ${nomeDoMes(mes)}` : `nos próximos ${JANELA_SEMANAL_DIAS} dias`;
  const introducao = itens.length
    ? `${nome}, ${periodo} temos as seguintes programações:`
    : `${nome}, ${periodo} não há programações nos seus departamentos.`;
  const assunto =
    tipo === "mensal"
      ? `Programações de ${nomeDoMes(mes)}`
      : `Lembretes da semana: ${itens.filter((i) => !i.avisado).length} líder(es) para avisar`;

  const texto = [introducao, ...itens.map((i) => linhaItem(i, nomesAnciaos))].join("\n\n");

  return {
    tipo,
    destinatario,
    assunto,
    introducao,
    itens,
    pendentes: itens.filter((i) => !i.avisado).length,
    texto,
  };
}

/** Só dígitos; números brasileiros sem DDI ganham 55. */
export function normalizarWhatsapp(numero: string | null): string | null {
  const digitos = (numero ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

/** Mensagem que o ancião envia ao líder do departamento. */
export function mensagemParaLider(
  p: Programacao,
  departamento: Departamento,
  remetente: Pick<Perfil, "nome" | "papel">,
): string {
  const ola = departamento.lider_nome ? `Olá, ${departamento.lider_nome}!` : "Olá!";
  const hora = p.hora_inicio ? `, às ${horaCurta(p.hora_inicio)}` : "";
  const local = p.local ? `, em ${p.local}` : "";
  return (
    `${ola} Passando para lembrar da programação *${p.titulo}* (${departamento.nome}), ` +
    `${dataLonga(p.data)}${hora}${local}. Conte comigo para o que precisar. ${tratamento(remetente)}`
  );
}

export function linkWhatsapp(numero: string | null, texto: string): string {
  const n = normalizarWhatsapp(numero);
  const base = n ? `https://wa.me/${n}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}
