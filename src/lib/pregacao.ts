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
