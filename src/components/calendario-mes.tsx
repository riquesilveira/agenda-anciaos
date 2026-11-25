import Link from "next/link";
import { Plus } from "lucide-react";
import { parseISO } from "date-fns";
import { dataLonga, horaCurta } from "@/lib/datas";
import { ORIGENS, type Programacao } from "@/lib/tipos";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Grade do mês. Componente só de apresentação (recebe tudo pronto), para
 * poder ser usado na página do calendário e em prévias.
 */
export function CalendarioMes({
  dias,
  porDia,
  mesAtual,
  hoje,
  diaSelecionado,
  linkDoDia,
}: {
  dias: string[]; // yyyy-MM-dd, semanas completas
  porDia: Map<string, Programacao[]>;
  mesAtual: string; // yyyy-MM
  hoje: string;
  diaSelecionado: string | null;
  linkDoDia: (dia: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className={`py-2 ${d === "sáb" ? "text-indigo-700" : ""}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const doDia = porDia.get(d) ?? [];
          const foraDoMes = !d.startsWith(mesAtual);
          const sabado = parseISO(d).getDay() === 6;
          const ehHoje = d === hoje;
          const selecionado = d === diaSelecionado;
          return (
            <div
              key={d}
              className={`group relative min-h-[3.75rem] border-r border-b border-slate-100 p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${
                foraDoMes ? "bg-slate-50/70" : sabado ? "bg-indigo-50/40" : ""
              } ${selecionado ? "z-10 ring-2 ring-indigo-500 ring-inset" : ""}`}
            >
              {/* celular: tocar no dia mostra a lista dele logo abaixo */}
              <Link href={linkDoDia(d)} className="absolute inset-0 sm:hidden" aria-label={`Ver ${dataLonga(d)}`} />

              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                    ehHoje
                      ? "bg-indigo-600 font-bold text-white"
                      : foraDoMes
                        ? "text-slate-400"
                        : "font-medium text-slate-700"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                <Link
                  href={`/programacoes/nova?data=${d}`}
                  className="hidden h-6 w-6 items-center justify-center rounded-md text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-indigo-100 hover:text-indigo-700 focus:opacity-100 sm:inline-flex"
                  title="Nova programação neste dia"
                  aria-label={`Nova programação em ${dataLonga(d)}`}
                >
                  <Plus size={14} />
                </Link>
              </div>

              {/* celular: pontinhos coloridos pela origem */}
              <div className="flex flex-wrap gap-1 px-0.5 sm:hidden">
                {doDia.slice(0, 6).map((p) => (
                  <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${ORIGENS[p.origem].ponto}`} />
                ))}
              </div>

              {/* telas maiores: eventos clicáveis */}
              <div className="hidden space-y-1 sm:block">
                {doDia.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/programacoes/${p.id}`}
                    className={`block truncate rounded-r border-l-[3px] bg-slate-50 px-1.5 py-0.5 text-[11px] leading-4 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 ${ORIGENS[p.origem].barra}`}
                    title={`${p.titulo}${p.fonte ? ` (${p.fonte})` : ""}. Clique para ver ou editar`}
                  >
                    {p.hora_inicio && <span className="font-semibold">{horaCurta(p.hora_inicio)} </span>}
                    {p.departamento?.sigla && <span className="font-bold text-slate-900">{p.departamento.sigla} </span>}
                    {p.titulo}
                  </Link>
                ))}
                {doDia.length > 3 && (
                  <Link href={linkDoDia(d)} className="block px-1.5 text-[11px] font-medium text-slate-500 hover:text-indigo-700">
                    +{doDia.length - 3} mais
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Legenda das cores (origem). */
export function LegendaOrigens() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      {(Object.keys(ORIGENS) as (keyof typeof ORIGENS)[]).map((o) => (
        <span key={o} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${ORIGENS[o].ponto}`} /> {ORIGENS[o].nome}
        </span>
      ))}
    </div>
  );
}
