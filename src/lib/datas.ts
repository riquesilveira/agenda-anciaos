import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FUSO = "America/Sao_Paulo";

/** Data de hoje (yyyy-MM-dd) no fuso de Brasília, independente do fuso do servidor. */
export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function somarDias(dataISO: string, dias: number): string {
  return format(addDays(parseISO(dataISO), dias), "yyyy-MM-dd");
}

export function diasAte(dataISO: string, hoje: string): number {
  return differenceInCalendarDays(parseISO(dataISO), parseISO(hoje));
}

const DIAS_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "14/12 (sáb)" */
export function dataCurta(dataISO: string): string {
  const d = parseISO(dataISO);
  return `${format(d, "dd/MM")} (${DIAS_ABREV[d.getDay()]})`;
}

/** "sábado, 14 de dezembro" */
export function dataLonga(dataISO: string): string {
  return format(parseISO(dataISO), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "dezembro de 2026" */
export function nomeDoMes(mesISO: string): string {
  return format(parseISO(`${mesISO}-01`), "MMMM 'de' yyyy", { locale: ptBR });
}

/** "19:30:00" -> "19h30", "19:00" -> "19h" */
export function horaCurta(hora: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.split(":");
  return m && m !== "00" ? `${Number(h)}h${m}` : `${Number(h)}h`;
}

/** Último dia da programação (data_fim ou a própria data). */
export function fimDe(p: { data: string; data_fim: string | null }): string {
  return p.data_fim ?? p.data;
}

/** As duas programações têm pelo menos um dia em comum? */
export function periodosSeCruzam(
  a: { data: string; data_fim: string | null },
  b: { data: string; data_fim: string | null },
): boolean {
  return a.data <= fimDe(b) && b.data <= fimDe(a);
}

/** "14/12 (sáb)" ou "16/01 (sáb) a 29/01 (sex)" */
export function periodoCurto(p: { data: string; data_fim: string | null }): string {
  return p.data_fim && p.data_fim !== p.data ? `${dataCurta(p.data)} a ${dataCurta(p.data_fim)}` : dataCurta(p.data);
}

/** Quantos dias a programação dura. */
export function duracaoDias(p: { data: string; data_fim: string | null }): number {
  return diasAte(fimDe(p), p.data) + 1;
}

/** Só a primeira letra maiúscula: "janeiro de 2027" -> "Janeiro de 2027". */
export function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
