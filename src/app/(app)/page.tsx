import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import { dataLonga, fimDe, hojeISO, horaCurta, maiuscula, nomeDoMes } from "@/lib/datas";
import { exigirPerfil } from "@/lib/sessao";
import { ORIGENS, type Origem, type Programacao } from "@/lib/tipos";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dep?: string; origem?: string; dia?: string }>;
}) {
  const params = await searchParams;
  const { supabase } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);
  // Dia selecionado (toque no celular ou "+N" no computador): a lista mostra só ele.
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "") ? params.dia! : null;

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
    porDia.set(
      dia,
      programacoes
        .filter((p) => p.data <= dia && fimDe(p) >= dia)
        // sem horário (o dia todo / vários dias) primeiro, depois por horário
        .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? "")),
    );
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
          {dias.map((d) => {
            const doDia = porDia.get(d) ?? [];
            const foraDoMes = !isSameMonth(parseISO(d), inicioMes);
            const selecionado = d === dia;
            return (
              <div
                key={d}
                className={`group relative min-h-16 border-r border-b border-slate-100 p-1 sm:min-h-28 ${foraDoMes ? "bg-slate-50 text-slate-400" : ""} ${selecionado ? "ring-2 ring-indigo-500 ring-inset" : ""}`}
              >
                {/* celular: tocar no dia mostra os eventos dele na lista abaixo */}
                <Link
                  href={`${link({ dia: d })}#lista`}
                  className="absolute inset-0 sm:hidden"
                  aria-label={`Ver programações de ${dataLonga(d)}`}
                />
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-xs ${d === hoje ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white" : ""}`}>
                    {Number(d.slice(8))}
                  </span>
                  <Link
                    href={`/programacoes/nova?data=${d}`}
                    className="hidden h-5 w-5 items-center justify-center rounded text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-indigo-100 hover:text-indigo-700 focus:opacity-100 sm:inline-flex"
                    title="Nova programação neste dia"
                    aria-label={`Nova programação em ${dataLonga(d)}`}
                  >
                    <Plus size={14} />
                  </Link>
                </div>
                {/* celular: só pontinhos; telas maiores: títulos clicáveis */}
                <div className="flex flex-wrap gap-1 sm:hidden">
                  {doDia.map((p) => (
                    <span key={p.id} className={`h-2 w-2 rounded-full border ${ORIGENS[p.origem].classe}`} />
                  ))}
                </div>
                <div className="hidden space-y-1 sm:block">
                  {doDia.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`/programacoes/${p.id}`}
                      className={`block truncate rounded border px-1 text-[11px] hover:brightness-95 ${ORIGENS[p.origem].classe}`}
                      title={`${p.fonte ? `${p.titulo} (${p.fonte})` : p.titulo}. Clique para ver ou editar`}
                    >
                      {p.hora_inicio && <span className="font-semibold">{horaCurta(p.hora_inicio)} </span>}
                      {p.departamento?.sigla && <span className="font-bold">{p.departamento.sigla} </span>}
                      {p.titulo}
                    </Link>
                  ))}
                  {doDia.length > 3 && (
                    <Link href={`${link({ dia: d })}#lista`} className="block text-[11px] text-slate-500 hover:text-indigo-700">
                      +{doDia.length - 3} mais
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section id="lista" className="scroll-mt-4">
        {dia ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{maiuscula(dataLonga(dia))}</h2>
              <div className="flex gap-2">
                <Link href={link({})} className="botao-secundario">Ver o mês todo</Link>
                <Link href={`/programacoes/nova?data=${dia}`} className="botao">
                  <Plus size={16} /> Nova neste dia
                </Link>
              </div>
            </div>
            <ListaProgramacoes programacoes={porDia.get(dia) ?? programacoes.filter((p) => p.data <= dia && fimDe(p) >= dia)} hoje={hoje} />
          </>
        ) : (
          <>
            <h2 className="mb-3 font-semibold">Programações do mês</h2>
            <ListaProgramacoes
              programacoes={programacoes.filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`)}
              hoje={hoje}
            />
          </>
        )}
        <p className="mt-3 text-xs text-slate-500">Toque numa programação para ver detalhes ou editar.</p>
      </section>
    </div>
  );
}
