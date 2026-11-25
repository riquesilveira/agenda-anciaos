import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CabecalhoSemana, NumeroDia } from "@/components/moldura";
import { Plus } from "lucide-react";
import { nomeDoCulto, type CultoDoMes } from "@/lib/pregacao";
import type { Pregacao } from "@/lib/tipos";


/**
 * Grade do mês da escala: em cada dia de culto, a sigla (inicial) do ancião
 * responsável na cor dele; "?" quando ninguém assumiu.
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
  /** Anciãos/pastor: dia sem culto ganha "+" para cadastrar um culto especial. */
  podeAdicionar?: boolean;
}) {
  const inicio = parseISO(`${mes}-01`);
  const dias = eachDayOfInterval({ start: startOfWeek(startOfMonth(inicio)), end: endOfWeek(endOfMonth(inicio)) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
  const cultoDoDia = new Map(cultos.map((c) => [c.data, c]));

  return (
    <div>
      <CabecalhoSemana />
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const foraDoMes = !d.startsWith(mes);
          const c = foraDoMes ? undefined : cultoDoDia.get(d);
          const e = c ? porChave.get(`${c.data}|${c.culto}`) : undefined;
          const quem = e ? siglas.get(e.anciao_id) : undefined;
          const passou = d < hoje;
          const conteudo = (
            <>
              <span className="self-center sm:mb-1 sm:self-start">
                <NumeroDia dia={d} hoje={hoje} foraDoMes={foraDoMes} />
              </span>
              {c && (
                <span
                  className={`flex min-w-0 items-center gap-1.5 rounded-md border-l-2 px-1 py-1 text-[10px] leading-tight sm:px-2 sm:text-xs ${
                    e?.pregador_nome
                      ? "border-l-indigo-500 bg-indigo-50 font-semibold text-indigo-900"
                      : "border-l-slate-300 bg-slate-50 text-slate-400"
                  }`}
                >
                  {/* ancião responsável: bolinha pequena com a inicial */}
                  {quem ? (
                    <span
                      title="Ancião responsável"
                      className={`hidden h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white sm:flex ${quem.cor}`}
                    >
                      {quem.sigla}
                    </span>
                  ) : (
                    <span className="hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[9px] sm:flex">
                      ?
                    </span>
                  )}
                  <span className="line-clamp-2 min-w-0">
                    {c.culto === "especial" && <span className="block text-[9px] font-medium opacity-70 sm:text-[10px]">{nomeDoCulto({ culto: c.culto, titulo: e?.titulo })}</span>}
                    {e?.pregador_nome ?? "a definir"}
                  </span>
                </span>
              )}
            </>
          );
          const classe = `flex min-h-[4.5rem] flex-col gap-1 border-r border-b border-slate-200/80 p-1 sm:min-h-32 sm:p-2 [&:nth-child(7n)]:border-r-0 ${
            passou && c ? "opacity-50" : ""
          }`;
          return c ? (
            <Link
              key={d}
              href={`/escalas/${c.data}/${c.culto}`}
              className={`${classe} transition hover:bg-slate-50`}
              title={`${nomeDoCulto({ culto: c.culto, titulo: e?.titulo })}${e?.pregador_nome ? ` · ${e.pregador_nome}` : ""}`}
            >
              {conteudo}
            </Link>
          ) : podeAdicionar && !foraDoMes && !passou ? (
            // Dia sem culto fixo: dá para cadastrar um culto especial (semana de oração etc.).
            <Link
              key={d}
              href={`/escalas/${d}/especial`}
              className={`${classe} group transition hover:bg-slate-50`}
              title="Adicionar culto especial neste dia"
              aria-label={`Adicionar culto especial em ${d}`}
            >
              {conteudo}
              <span className="flex items-center gap-1 self-center rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 transition group-hover:opacity-100 sm:self-start sm:text-xs sm:text-indigo-600 sm:opacity-0">
                <Plus size={13} /> <span className="hidden sm:inline">Culto</span>
              </span>
            </Link>
          ) : (
            <div key={d} className={classe}>
              {conteudo}
            </div>
          );
        })}
      </div>
    </div>
  );
}
