import Link from "next/link";
import { Bell, Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarioMes } from "@/components/calendario-mes";
import { FiltroDepartamento } from "@/components/filtro-departamento";
import { ListaProgramacoes } from "@/components/lista-programacoes";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { dataLonga, fimDe, hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { exigirPerfil } from "@/lib/sessao";
import { ORIGENS, type Origem, type Programacao } from "@/lib/tipos";

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dep?: string; origem?: string; dia?: string }>;
}) {
  const params = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
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

  // "meus": departamentos que a pessoa acompanha (ancião responsável) ou lidera.
  const meusDeps = new Set(
    departamentos
      .filter((d) => d.anciao_id === perfil.id || d.lideres?.some((l) => l.perfil_id === perfil.id))
      .map((d) => d.id),
  );
  // Origens visíveis (caixinhas da lateral). Sem parâmetro = todas.
  const todasOrigens = Object.keys(ORIGENS) as Origem[];
  const marcadas = new Set(
    (params.origem ?? "").split(",").filter((o): o is Origem => todasOrigens.includes(o as Origem)),
  );
  const visiveis = marcadas.size ? marcadas : new Set(todasOrigens);
  const alternarOrigem = (o: Origem) => {
    const nova = new Set(visiveis);
    if (nova.has(o)) nova.delete(o);
    else nova.add(o);
    // Desmarcar a última volta a mostrar todas.
    return nova.size === 0 || nova.size === todasOrigens.length ? undefined : todasOrigens.filter((x) => nova.has(x)).join(",");
  };

  const programacoes = todas.filter(
    (p) =>
      (!params.dep ||
        (params.dep === "meus" ? Boolean(p.departamento_id && meusDeps.has(p.departamento_id)) : p.departamento_id === params.dep)) &&
      visiveis.has(p.origem),
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

  const mesDeHoje = hoje.slice(0, 7);
  const [nomeMes, ano] = maiuscula(nomeDoMes(mes)).split(" de ");
  const doMes = programacoes.filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`);

  const linkSemDep = (() => {
    const q = new URLSearchParams();
    Object.entries({ mes, origem: params.origem }).forEach(([k, v]) => v && q.set(k, v));
    const t = q.toString();
    return t ? `/?${t}&` : "/?";
  })();

  const caixasOrigem = (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 lg:flex-col lg:gap-1">
      {todasOrigens.map((o) => {
        const ativa = visiveis.has(o);
        return (
          <li key={o}>
            <Link
              href={link({ origem: alternarOrigem(o), dia: undefined })}
              aria-pressed={ativa}
              className="flex items-center gap-2.5 rounded-lg py-1 text-sm text-slate-700 lg:px-1 lg:py-1.5 lg:hover:bg-slate-50"
            >
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-2 ${
                  ativa ? `${ORIGENS[o].ponto} border-transparent text-white` : "border-slate-300 bg-white"
                }`}
              >
                {ativa && <Check size={12} strokeWidth={3.5} />}
              </span>
              {ORIGENS[o].nome === "Local" ? "Igreja local" : ORIGENS[o].nome}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-[16rem_1fr]">
        {/* ----- Lateral (computador). No celular os filtros ficam abaixo do mês. ----- */}
        <aside className="hidden space-y-5 border-r border-slate-200 p-5 lg:block">
          <Link href="/programacoes/nova" className="botao w-full py-2.5">
            <Plus size={18} /> Nova programação
          </Link>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Calendários</h2>
            {caixasOrigem}
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-900">Departamento</h2>
            <FiltroDepartamento departamentos={departamentos} valor={params.dep ?? ""} linkBase={linkSemDep} />
          </div>
          <Link
            href="/minhas"
            className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
          >
            <Bell size={16} /> Minhas programações
          </Link>
        </aside>

        {/* ----- Calendário ----- */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {nomeMes} <span className="font-normal text-slate-500">{ano}</span>
              </h1>
              <Link
                href={link({ mes: mesDeHoje, dia: undefined })}
                className={`rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium shadow-sm hover:bg-slate-50 ${
                  mes === mesDeHoje ? "text-slate-400" : "text-slate-700"
                }`}
              >
                Hoje
              </Link>
              <div className="flex items-center">
                <Link href={link({ mes: anterior, dia: undefined })} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Mês anterior">
                  <ChevronLeft size={20} />
                </Link>
                <Link href={link({ mes: proximo, dia: undefined })} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Próximo mês">
                  <ChevronRight size={20} />
                </Link>
              </div>
            </div>
            <Link href="/minhas" className="botao-secundario px-2.5 py-1.5 lg:hidden" aria-label="Minhas programações" title="Minhas programações">
              <Bell size={16} />
            </Link>
          </div>
          <div className="space-y-2.5 px-4 pb-3 lg:hidden">
            {caixasOrigem}
            <FiltroDepartamento departamentos={departamentos} valor={params.dep ?? ""} linkBase={linkSemDep} />
          </div>
          <div className="border-t border-slate-200">
            <CalendarioMes
              dias={dias}
              porDia={porDia}
              mesAtual={mes}
              hoje={hoje}
              diaSelecionado={dia}
              linkDoDia={(d) => `${link({ dia: d })}#lista`}
            />
          </div>
        </div>
      </div>

      <section id="lista" className="scroll-mt-4 space-y-3">        {dia ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{maiuscula(dataLonga(dia))}</h2>
              <Link href={link({})} className="botao-secundario">Mês todo</Link>
            </div>
            <ListaProgramacoes programacoes={porDia.get(dia) ?? programacoes.filter((p) => p.data <= dia && fimDe(p) >= dia)} hoje={hoje} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              Programações do mês <span className="text-sm font-normal text-slate-400">({doMes.length})</span>
            </h2>
            <ListaProgramacoes programacoes={doMes} hoje={hoje} />
          </>
        )}
      </section>
    </div>
  );
}
