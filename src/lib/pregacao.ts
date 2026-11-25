import { eachDayOfInterval, endOfMonth, format, parseISO } from "date-fns";
import { dataLonga } from "./datas";
import { tratamento } from "./resumo";
import type { CultoPregacao, Perfil, Pregacao, StatusPregacao } from "./tipos";

export const CULTOS: Record<CultoPregacao, { nome: string; curto: string; diaDaSemana: number; ordem: number }> = {
  quarta: { nome: "Culto de quarta-feira", curto: "Quarta", diaDaSemana: 3, ordem: 1 },
  sabado_manha: { nome: "Culto Divino (sábado de manhã)", curto: "Sábado manhã", diaDaSemana: 6, ordem: 2 },
  domingo_noite: { nome: "Culto de domingo à noite", curto: "Domingo noite", diaDaSemana: 0, ordem: 0 },
};

export const STATUS: Record<StatusPregacao, { nome: string; classe: string }> = {
  a_convidar: { nome: "A convidar", classe: "bg-slate-100 text-slate-700" },
  convidado: { nome: "Convidado", classe: "bg-amber-100 text-amber-800" },
  confirmado: { nome: "Confirmado", classe: "bg-emerald-100 text-emerald-800" },
  recusou: { nome: "Recusou", classe: "bg-red-100 text-red-700" },
};

export interface CultoDoMes {
  data: string;
  culto: CultoPregacao;
}

/** Todos os cultos com pregação de um mês (yyyy-MM), em ordem de data. */
export function cultosDoMes(mes: string): CultoDoMes[] {
  const inicio = parseISO(`${mes}-01`);
  const saida: CultoDoMes[] = [];
  for (const dia of eachDayOfInterval({ start: inicio, end: endOfMonth(inicio) })) {
    const dow = dia.getDay();
    for (const [culto, info] of Object.entries(CULTOS) as [CultoPregacao, (typeof CULTOS)[CultoPregacao]][]) {
      if (info.diaDaSemana === dow) saida.push({ data: format(dia, "yyyy-MM-dd"), culto });
    }
  }
  return saida;
}

export function cultoValido(data: string, culto: string): culto is CultoPregacao {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !(culto in CULTOS)) return false;
  return parseISO(data).getDay() === CULTOS[culto as CultoPregacao].diaDaSemana;
}

type Remetente = Pick<Perfil, "nome" | "papel"> & { tratamento?: string | null };

/** Mensagem de convite para o pregador (WhatsApp). */
export function mensagemConvite(p: Pick<Pregacao, "data" | "culto" | "pregador_nome">, igreja: string, remetente: Remetente) {
  const ola = p.pregador_nome ? `Olá, ${p.pregador_nome}!` : "Olá!";
  return (
    `${ola} Gostaríamos de convidar você para pregar no *${CULTOS[p.culto].nome}* da ${igreja}, ` +
    `${dataLonga(p.data)}. Você pode? Fico no aguardo da sua confirmação. ${tratamento(remetente)}`
  );
}

/** Mensagem de lembrete para o pregador (WhatsApp). */
export function mensagemLembrete(
  p: Pick<Pregacao, "data" | "culto" | "pregador_nome" | "tema">,
  igreja: string,
  remetente: Remetente,
) {
  const ola = p.pregador_nome ? `Olá, ${p.pregador_nome}!` : "Olá!";
  const tema = p.tema ? ` Tema: "${p.tema}".` : "";
  return (
    `${ola} Passando para lembrar da sua pregação no *${CULTOS[p.culto].nome}* da ${igreja}, ` +
    `${dataLonga(p.data)}.${tema} Que Deus abençoe! ${tratamento(remetente)}`
  );
}

/** Cores fixas para os anciãos na grade da escala (na ordem alfabética dos nomes). */
export const CORES_ANCIAOS = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-500",
  "bg-sky-600",
  "bg-violet-600",
  "bg-teal-600",
  "bg-orange-600",
];

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

/**
 * Sigla curta de cada ancião para a grade: a inicial do nome (J, H, D…).
 * Se duas pessoas começam com a mesma letra, usa as duas primeiras (JO, JU),
 * e assim por diante até ficar único. Também devolve uma cor fixa para cada um.
 */
export function siglasAnciaos(pessoas: { id: string; nome: string }[]): Map<string, { sigla: string; cor: string }> {
  const ordenadas = [...pessoas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const limpos = ordenadas.map((p) => semAcento(p.nome) || "?");
  const saida = new Map<string, { sigla: string; cor: string }>();
  ordenadas.forEach((p, i) => {
    let tam = 1;
    const sigla = () => limpos[i].slice(0, tam);
    while (tam < limpos[i].length && limpos.some((outro, j) => j !== i && outro.slice(0, tam) === sigla())) tam++;
    saida.set(p.id, { sigla: sigla(), cor: CORES_ANCIAOS[i % CORES_ANCIAOS.length] });
  });
  return saida;
}
