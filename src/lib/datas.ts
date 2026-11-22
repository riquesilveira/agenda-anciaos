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

/** "14/12 (sáb)" */
export function dataCurta(dataISO: string): string {
  return format(parseISO(dataISO), "dd/MM (EEE)", { locale: ptBR });
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
