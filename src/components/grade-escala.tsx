import Link from "next/link";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CULTOS, type CultoDoMes } from "@/lib/pregacao";
import type { Pregacao } from "@/lib/tipos";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const DEFINIDO = { texto: "✓", classe: "bg-emerald-500 text-white", titulo: "pregador definido" };

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
          const sinal = e?.pregador_nome ? DEFINIDO : null;
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
              <span className="mt-0.5 text-[9px] font-medium tracking-wide text-slate-400 uppercase sm:text-[10px]">
                {CULTOS[c.culto].curto.split(" ")[0].slice(0, 3)}
              </span>
              <span className="relative mt-0.5">
                {quem ? (
                  <span
                    className={`flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-sm font-bold text-white shadow-sm sm:h-9 sm:min-w-9 ${quem.cor}`}
                  >
                    {quem.sigla}
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-sm font-bold text-slate-400 sm:h-9 sm:w-9">
                    ?
                  </span>
                )}
                {sinal && (
                  <span
                    title={sinal.titulo}
                    className={`absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none font-bold ring-2 ring-white ${sinal.classe}`}
                  >
                    {sinal.texto}
                  </span>
                )}
              </span>
            </>
          ) : (
            numero
          );
          const classe = `flex min-h-[4.5rem] flex-col items-center border-r border-b border-slate-100 py-1.5 sm:min-h-24 [&:nth-child(7n)]:border-r-0 ${
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
