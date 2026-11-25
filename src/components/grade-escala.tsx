import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CULTOS, type CultoDoMes } from "@/lib/pregacao";
import type { Pregacao } from "@/lib/tipos";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];


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
}: {
  mes: string; // yyyy-MM
  hoje: string;
  cultos: CultoDoMes[];
  porChave: Map<string, Pregacao>;
  siglas: Map<string, { sigla: string; cor: string }>;
}) {
  const inicio = parseISO(`${mes}-01`);
  const dias = eachDayOfInterval({ start: startOfWeek(startOfMonth(inicio)), end: endOfWeek(endOfMonth(inicio)) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
  const cultoDoDia = new Map(cultos.map((c) => [c.data, c]));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const foraDoMes = !d.startsWith(mes);
          const c = foraDoMes ? undefined : cultoDoDia.get(d);
          const e = c ? porChave.get(`${c.data}|${c.culto}`) : undefined;
          const quem = e ? siglas.get(e.anciao_id) : undefined;
          const passou = d < hoje;
          const numero = (
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                d === hoje ? "bg-slate-900 font-bold text-white" : foraDoMes ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {Number(d.slice(8))}
            </span>
          );
          const conteudo = c ? (
            <>
              {numero}
              {e?.pregador_nome ? (
                <span className="mt-1 line-clamp-2 w-full px-0.5 text-center text-[11px] leading-tight font-semibold text-slate-900 sm:text-[13px]">
                  {e.pregador_nome}
                </span>
              ) : (
                <span className="mt-1 text-center text-[10px] leading-tight text-slate-400 sm:text-xs">a definir</span>
              )}
              {/* ancião responsável: pequeno, no canto de baixo */}
              <span className="mt-auto pt-1">
                {quem ? (
                  <span
                    title="Ancião responsável"
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${quem.cor}`}
                  >
                    {quem.sigla}
                  </span>
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400">
                    ?
                  </span>
                )}
              </span>
            </>
          ) : (
            numero
          );
          const classe = `flex min-h-[5rem] flex-col items-center border-r border-b border-slate-100 py-1.5 sm:min-h-24 [&:nth-child(7n)]:border-r-0 ${
            foraDoMes ? "bg-slate-50/70" : ""
          } ${passou && c ? "opacity-50" : ""}`;
          return c ? (
            <Link
              key={d}
              href={`/escalas/${c.data}/${c.culto}`}
              className={`${classe} transition hover:bg-indigo-50`}
              title={`${CULTOS[c.culto].nome}${e?.pregador_nome ? ` · ${e.pregador_nome}` : ""}`}
            >
              {conteudo}
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
