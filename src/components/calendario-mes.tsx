import Link from "next/link";
import { Plus } from "lucide-react";
import { dataLonga, horaCurta } from "@/lib/datas";
import { ORIGENS, type Programacao } from "@/lib/tipos";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
    <div>
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="px-1.5 py-2 text-center text-xs font-medium text-slate-500 sm:px-3 sm:text-left sm:text-sm">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const doDia = porDia.get(d) ?? [];
          const foraDoMes = !d.startsWith(mesAtual);
          const ehHoje = d === hoje;
          const selecionado = d === diaSelecionado;
          return (
            <div
              key={d}
              className={`group relative min-h-[4rem] border-r border-b border-slate-200/80 p-1 sm:min-h-32 sm:p-2 [&:nth-child(7n)]:border-r-0 ${
                selecionado ? "z-10 bg-indigo-50/60 ring-2 ring-indigo-500 ring-inset" : ""
              }`}
            >
              {/* celular: tocar no dia mostra a lista dele logo abaixo */}
              <Link href={linkDoDia(d)} className="absolute inset-0 sm:hidden" aria-label={`Ver ${dataLonga(d)}`} />

              <div className="mb-1 flex items-center justify-center sm:mb-2 sm:justify-between">
                <span
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm sm:h-9 sm:min-w-9 sm:text-base ${
                    ehHoje
                      ? "bg-indigo-600 font-semibold text-white"
                      : foraDoMes
                        ? "text-slate-300"
                        : "text-slate-800"
                  }`}
                >
                  {Number(d.slice(8))}
                </span>
                <Link
                  href={`/programacoes/nova?data=${d}`}
                  className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-indigo-100 hover:text-indigo-700 focus:opacity-100 sm:inline-flex"
                  title="Nova programação neste dia"
                  aria-label={`Nova programação em ${dataLonga(d)}`}
                >
                  <Plus size={16} />
                </Link>
              </div>

              {/* celular: pontinhos coloridos pela origem */}
              <div className="flex flex-wrap justify-center gap-1 sm:hidden">
                {doDia.slice(0, 4).map((p) => (
                  <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${ORIGENS[p.origem].ponto}`} />
                ))}
              </div>

              {/* telas maiores: etiquetas clicáveis */}
              <div className="hidden space-y-1 sm:block">
                {doDia.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/programacoes/${p.id}`}
                    className={`block truncate rounded-md border-l-2 px-2 py-1 text-xs leading-4 transition ${ORIGENS[p.origem].etiqueta} ${
                      foraDoMes ? "opacity-50" : ""
                    }`}
                    title={`${p.titulo}${p.fonte ? ` (${p.fonte})` : ""}. Clique para ver ou editar`}
                  >
                    {p.hora_inicio && <span className="font-semibold">{horaCurta(p.hora_inicio)} </span>}
                    {p.departamento?.sigla && <span className="font-semibold">{p.departamento.sigla} · </span>}
                    {p.titulo}
                  </Link>
                ))}
                {doDia.length > 3 && (
                  <Link href={linkDoDia(d)} className="block px-2 text-xs font-medium text-slate-500 hover:text-indigo-700">
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
