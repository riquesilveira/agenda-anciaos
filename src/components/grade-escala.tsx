import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CabecalhoSemana, NumeroDia } from "@/components/moldura";
import { nomeDoCulto, type CultoDoMes } from "@/lib/pregacao";
import type { Pregacao } from "@/lib/tipos";

/**
 * Grade do mês da escala de pregação. Dia sem pregador fica limpo (só o
 * número); com pregador, mostra o nome e a inicial do ancião responsável.
 * Anciãos/pastor clicam em qualquer dia para cadastrar (NovoPregadorRapido,
 * pelo data-pregacao-dia); clicar no nome abre os detalhes.
 */
export function GradeEscala({
  mes,
  hoje,
  cultos,
  porChave,
  siglas,
  podeAdicionar = false,
}: {
  mes: string; // yyyy-MM
  hoje: string;
  cultos: CultoDoMes[];
  porChave: Map<string, Pregacao>;
  siglas: Map<string, { sigla: string; cor: string }>;
  podeAdicionar?: boolean;
}) {
  const inicio = parseISO(`${mes}-01`);
  const dias = eachDayOfInterval({ start: startOfWeek(startOfMonth(inicio)), end: endOfWeek(endOfMonth(inicio)) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );

  return (
    <div>
      <CabecalhoSemana />
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const foraDoMes = !d.startsWith(mes);
          // Pregações cadastradas neste dia (com pregador, ou culto especial com nome).
          const doDia = foraDoMes
            ? []
            : cultos
                .filter((c) => c.data === d)
                .map((c) => ({ c, e: porChave.get(`${c.data}|${c.culto}`) }))
                .filter(({ c, e }) => e?.pregador_nome || (c.culto === "especial" && e));
          const clicavel = podeAdicionar && !foraDoMes;
          return (
            <div
              key={d}
              data-pregacao-dia={clicavel ? d : undefined}
              className={`flex min-h-[4.5rem] flex-col gap-1 border-r border-b border-slate-200/80 p-1 sm:min-h-32 sm:p-2 [&:nth-child(7n)]:border-r-0 ${
                clicavel ? "cursor-pointer transition hover:bg-slate-50" : ""
              } ${d < hoje && doDia.length ? "opacity-60" : ""}`}
            >
              <span className="self-center sm:mb-1 sm:self-start">
                <NumeroDia dia={d} hoje={hoje} foraDoMes={foraDoMes} />
              </span>
              {doDia.map(({ c, e }) => {
                const quem = e ? siglas.get(e.anciao_id) : undefined;
                return (
                  <Link
                    key={c.culto}
                    href={`/escalas/${c.data}/${c.culto}`}
                    title={`${nomeDoCulto({ culto: c.culto, titulo: e?.titulo })}${e?.pregador_nome ? ` · ${e.pregador_nome}` : ""}`}
                    className="flex min-w-0 items-center gap-1.5 rounded-md border-l-2 border-l-indigo-500 bg-indigo-50 px-1 py-1 text-[10px] leading-tight font-semibold text-indigo-900 hover:bg-indigo-100 sm:px-2 sm:text-xs"
                  >
                    {quem && (
                      <span
                        title="Ancião responsável"
                        className={`hidden h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white sm:flex ${quem.cor}`}
                      >
                        {quem.sigla}
                      </span>
                    )}
                    <span className="line-clamp-2 min-w-0">
                      {c.culto === "especial" && (
                        <span className="block text-[9px] font-medium opacity-70 sm:text-[10px]">{nomeDoCulto({ culto: c.culto, titulo: e?.titulo })}</span>
                      )}
                      {e?.pregador_nome ?? <span className="font-normal text-indigo-400">sem pregador</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
