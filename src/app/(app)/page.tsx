import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ListaProgramacoes } from "@/components/lista-programacoes";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { fimDe, hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { exigirPerfil } from "@/lib/sessao";
import { ORIGENS, type Origem, type Programacao } from "@/lib/tipos";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dep?: string; origem?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);

  const inicioMes = parseISO(`${mes}-01`);
  const inicioGrade = startOfWeek(startOfMonth(inicioMes));
  const fimGrade = endOfWeek(endOfMonth(inicioMes));
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade }).map((d) => format(d, "yyyy-MM-dd"));

  const [departamentos, todas] = await Promise.all([
    listarDepartamentos(supabase),
    listarProgramacoes(supabase, dias[0], dias[dias.length - 1]),
  ]);

  const programacoes = todas.filter(
    (p) => (!params.dep || p.departamento_id === params.dep) && (!params.origem || p.origem === params.origem),
  );
  // Eventos de vários dias aparecem em cada dia do período.
  const porDia = new Map<string, Programacao[]>();
  for (const dia of dias) {
    porDia.set(dia, programacoes.filter((p) => p.data <= dia && fimDe(p) >= dia));
  }

  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const tudo = { mes, dep: params.dep, origem: params.origem, ...extra };
    Object.entries(tudo).forEach(([k, v]) => v && q.set(k, v));
    return `/?${q}`;
  };
  const anterior = format(addMonths(inicioMes, -1), "yyyy-MM");
  const proximo = format(addMonths(inicioMes, 1), "yyyy-MM");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={link({ mes: anterior })} className="botao-secundario px-2" aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </Link>
          <h1 className="min-w-44 text-center text-lg font-semibold">{maiuscula(nomeDoMes(mes))}</h1>
          <Link href={link({ mes: proximo })} className="botao-secundario px-2" aria-label="Próximo mês">
            <ChevronRight size={18} />
          </Link>
          {mes !== hoje.slice(0, 7) && (
            <Link href={link({ mes: hoje.slice(0, 7) })} className="text-sm text-indigo-600 hover:underline">
              Hoje
            </Link>
          )}
        </div>

        <form className="flex flex-wrap gap-2" action="/">
          <input type="hidden" name="mes" value={mes} />
          <select name="dep" defaultValue={params.dep ?? ""} className="campo w-auto">
            <option value="">Todos os departamentos</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
          <select name="origem" defaultValue={params.origem ?? ""} className="campo w-auto">
            <option value="">Todas as origens</option>
            {(Object.keys(ORIGENS) as Origem[]).map((o) => (
              <option key={o} value={o}>{ORIGENS[o].nome}</option>
            ))}
          </select>
          <button className="botao-secundario">Filtrar</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.keys(ORIGENS) as Origem[]).map((o) => (
          <span key={o} className={`rounded-full border px-2 py-0.5 ${ORIGENS[o].classe}`}>{ORIGENS[o].nome}</span>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const doDia = porDia.get(dia) ?? [];
            const foraDoMes = !isSameMonth(parseISO(dia), inicioMes);
            return (
              <Link
                key={dia}
                href={`/programacoes/nova?data=${dia}`}
                className={`min-h-16 border-r border-b border-slate-100 p-1 hover:bg-indigo-50 sm:min-h-28 ${foraDoMes ? "bg-slate-50 text-slate-400" : ""}`}
                title="Nova programação neste dia"
              >
                <div className={`mb-1 text-xs ${dia === hoje ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white" : ""}`}>
                  {Number(dia.slice(8))}
                </div>
                {/* celular: só pontinhos; telas maiores: títulos */}
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {doDia.map((p) => (
                    <span key={p.id} className={`h-2 w-2 rounded-full border ${ORIGENS[p.origem].classe}`} />
                  ))}
                </div>
                <div className="hidden space-y-1 sm:block">
                  {doDia.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className={`truncate rounded border px-1 text-[11px] ${ORIGENS[p.origem].classe}`}
                      title={p.fonte ? `${p.titulo} (${p.fonte})` : p.titulo}
                    >
                      {p.titulo}
                    </div>
                  ))}
                  {doDia.length > 3 && <div className="text-[11px] text-slate-500">+{doDia.length - 3}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Programações do mês</h2>
        <ListaProgramacoes
          programacoes={programacoes.filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`)}
          hoje={hoje}
        />
      </section>
    </div>
  );
}
