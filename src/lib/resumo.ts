import { dataLonga, diasAte, fimDe, horaCurta, nomeDoMes, periodoCurto, somarDias } from "./datas";
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

type Identificacao = Pick<Perfil, "nome" | "papel"> & { tratamento?: string | null };

export function tratamento(p: Identificacao): string {
  const padrao = p.papel === "pastor" ? "Pastor" : p.papel === "anciao" ? "Ancião" : "";
  return `${p.tratamento?.trim() || padrao} ${p.nome}`.trim();
}

/**
 * Quais programações entram no resumo de alguém:
 * - ancião: só as dos departamentos pelos quais é responsável;
 * - pastor: todas, menos as da Associação sem departamento (essas são o pano
 *   de fundo do calendário; com centenas por ano, afogariam o resumo);
 * - líder: as dos departamentos que lidera.
 */
export function programacoesDe(
  pessoa: Pick<Perfil, "id" | "papel">,
  programacoes: Programacao[],
  departamentos: Departamento[],
): Programacao[] {
  if (pessoa.papel === "pastor") {
    return programacoes.filter((p) => p.departamento_id || p.origem !== "associacao");
  }
  const meus = new Set(
    departamentos
      .filter((d) =>
        pessoa.papel === "lider" ? d.lideres?.some((l) => l.perfil_id === pessoa.id) : d.anciao_id === pessoa.id,
      )
      .map((d) => d.id),
  );
  return programacoes.filter((p) => p.departamento_id && meus.has(p.departamento_id));
}

export function descreverPrazo(diasRestantes: number): string {
  if (diasRestantes < 0) return "em andamento";
  if (diasRestantes === 0) return "é hoje";
  if (diasRestantes === 1) return "é amanhã";
  return `faltam ${diasRestantes} dias`;
}

export function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

function linhaItem(item: ItemResumo, nomesAnciaos: Map<string, string>, paraLider: boolean): string {
  const p = item.programacao;
  const d = item.departamento;
  const hora = p.hora_inicio ? ` ${horaCurta(p.hora_inicio)}` : "";
  const dep = d ? ` (${d.nome})` : "";
  const linhas = [`• ${periodoCurto(p)}${hora}: ${p.titulo}${dep}`];

  if (d && paraLider) {
    linhas.push(`  Você lidera ${d.nome}. (${descreverPrazo(item.diasRestantes)})`);
    return linhas.join("\n");
  }

  if (d) {
    const lider = d.lider_nome ? `${d.lider_nome} (líder de ${d.nome})` : `o líder de ${d.nome}`;
    if (item.responsavel) {
      linhas.push(`  Você acompanha ${d.nome}: lembre ${lider} sobre esta programação.`);
    } else {
      const anciao = d.anciao_id ? nomesAnciaos.get(d.anciao_id) : null;
      linhas.push(`  Responsável: ${anciao ?? "ninguém definido"}.`);
    }
  }

  const quando = descreverPrazo(item.diasRestantes);
  linhas.push(item.avisado ? `  ✅ Líder já avisado (${quando})` : `  ⚠️ Líder ainda não avisado (${quando})`);
  return linhas.join("\n");
}

export function gerarResumo(opcoes: {
  tipo: TipoResumo;
  destinatario: Perfil;
  programacoes: Programacao[];
  departamentos: Departamento[];
  perfis: (Pick<Perfil, "id" | "nome" | "papel"> & { tratamento?: string | null })[];
  hoje: string; // yyyy-MM-dd
  mes?: string; // yyyy-MM (mensal); padrão: mês de "hoje"
}): Resumo {
  const { tipo, destinatario, departamentos, hoje } = opcoes;
  const mes = opcoes.mes ?? hoje.slice(0, 7);
  const porId = new Map(departamentos.map((d) => [d.id, d]));
  const nomesAnciaos = new Map(opcoes.perfis.map((p) => [p.id, p.nome]));
  const limiteSemanal = somarDias(hoje, JANELA_SEMANAL_DIAS);
  const fimDoMes = ultimoDiaDoMes(mes);

  const itens: ItemResumo[] = programacoesDe(destinatario, opcoes.programacoes, departamentos)
    .filter((p) => fimDe(p) >= hoje)
    .filter((p) =>
      tipo === "mensal" ? p.data <= fimDoMes && fimDe(p) >= `${mes}-01` : p.data <= limiteSemanal,
    )
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
      : destinatario.papel === "lider"
        ? `Suas programações dos próximos ${JANELA_SEMANAL_DIAS} dias`
        : `Lembretes da semana: ${itens.filter((i) => !i.avisado).length} líder(es) para avisar`;

  const texto = [introducao, ...itens.map((i) => linhaItem(i, nomesAnciaos, destinatario.papel === "lider"))].join("\n\n");

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
/**
 * Número para o link do WhatsApp (só dígitos, com 55). Aceita qualquer jeito
 * de digitar: espaços, hífen, parênteses, ponto, +55, zero da operadora.
 * Começando com "+" é tratado como internacional (fica como está).
 */
export function normalizarWhatsapp(numero: string | null): string | null {
  const bruto = (numero ?? "").trim();
  let digitos = bruto.replace(/\D/g, "");
  if (!digitos) return null;
  if (bruto.startsWith("+")) return digitos;
  digitos = digitos.replace(/^0+/, ""); // 043…, 055…, 0xx…
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

/** DDD de um número brasileiro (ou null). */
export function dddDe(numero: string | null): string | null {
  const n = normalizarWhatsapp(numero);
  return n && n.startsWith("55") && (n.length === 12 || n.length === 13) ? n.slice(2, 4) : null;
}

/**
 * Prepara o WhatsApp digitado para salvar: completa o DDD quando faltar (com o
 * DDD padrão) e devolve no formato "(43) 99999-9999". Vazio = null.
 */
export function prepararWhatsapp(numero: string | null, dddPadrao: string | null): { valor: string | null; erro?: string } {
  const bruto = (numero ?? "").trim();
  if (!bruto) return { valor: null };
  let digitos = bruto.replace(/\D/g, "").replace(/^0+/, "");
  if (bruto.startsWith("+") && !bruto.startsWith("+55")) {
    return digitos.length >= 8 ? { valor: `+${digitos}` } : { erro: "Número incompleto." , valor: null };
  }
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) digitos = digitos.slice(2);
  if (digitos.length === 8 || digitos.length === 9) {
    if (!dddPadrao) return { valor: null, erro: "Coloque o DDD junto com o número (ex: 43 99999-9999)." };
    digitos = dddPadrao + digitos;
  }
  if (digitos.length === 11) return { valor: `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}` };
  if (digitos.length === 10) return { valor: `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}` };
  return { valor: null, erro: "Número de WhatsApp inválido. Use DDD + número, ex: (43) 99999-9999." };
}

/** Mensagem que o ancião envia ao líder do departamento. */
export function mensagemParaLider(
  p: Programacao,
  departamento: Departamento,
  remetente: Identificacao,
): string {
  const ola = departamento.lider_nome ? `Olá, ${departamento.lider_nome}!` : "Olá!";
  const hora = p.hora_inicio ? `, às ${horaCurta(p.hora_inicio)}` : "";
  const local = p.local ? `, em ${p.local}` : "";
  const quando =
    p.data_fim && p.data_fim !== p.data ? `de ${dataLonga(p.data)} a ${dataLonga(p.data_fim)}` : dataLonga(p.data);
  return (
    `${ola} Passando para lembrar da programação *${p.titulo}* (${departamento.nome}), ` +
    `${quando}${hora}${local}. Conte comigo para o que precisar. ${tratamento(remetente)}`
  );
}

export function linkWhatsapp(numero: string | null, texto: string): string {
  const n = normalizarWhatsapp(numero);
  const base = n ? `https://wa.me/${n}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}
