import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { maiuscula, nomeDoMes } from "@/lib/datas";

/**
 * Moldura das telas de mês (Calendário, Escalas): um cartão com a lateral à
 * esquerda (só no computador) e o conteúdo à direita.
 */
export function Moldura({ lateral, children }: { lateral: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden space-y-5 border-r border-slate-200 p-5 lg:block">{lateral}</aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Título de uma seção da lateral. */
export function TituloLateral({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-900">{children}</h2>;
}

/** "Dezembro 2026  ‹ ›" + o que vier à direita. */
export function CabecalhoMes({
  mes,
  link,
  direita,
}: {
  mes: string; // yyyy-MM
  link: (mes: string) => string;
  direita?: React.ReactNode;
}) {
  const inicio = parseISO(`${mes}-01`);
  const [nomeMes, ano] = maiuscula(nomeDoMes(mes)).split(" de ");
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {nomeMes} <span className="font-normal text-slate-500">{ano}</span>
        </h1>
        <div className="flex items-center">
          <Link href={link(format(addMonths(inicio, -1), "yyyy-MM"))} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Mês anterior">
            <ChevronLeft size={20} />
          </Link>
          <Link href={link(format(addMonths(inicio, 1), "yyyy-MM"))} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Próximo mês">
            <ChevronRight size={20} />
          </Link>
        </div>
      </div>
      {direita}
    </div>
  );
}

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Linha com os dias da semana, no mesmo estilo do calendário. */
export function CabecalhoSemana() {
  return (
    <div className="grid grid-cols-7 border-y border-slate-200">
      {DIAS_SEMANA.map((d) => (
        <div key={d} className="px-1.5 py-2 text-center text-xs font-medium text-slate-500 sm:px-3 sm:text-left sm:text-sm">
          {d}
        </div>
      ))}
    </div>
  );
}

/** Número do dia (hoje em círculo). */
export function NumeroDia({ dia, hoje, foraDoMes }: { dia: string; hoje: string; foraDoMes: boolean }) {
  return (
    <span
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm sm:h-9 sm:min-w-9 sm:text-base ${
        dia === hoje ? "bg-indigo-600 font-semibold text-white" : foraDoMes ? "text-slate-300" : "text-slate-800"
      }`}
    >
      {Number(dia.slice(8))}
    </span>
  );
}
