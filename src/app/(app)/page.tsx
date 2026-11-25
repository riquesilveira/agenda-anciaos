import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { CalendarioMes, LegendaOrigens } from "@/components/calendario-mes";
import { FiltrosCalendario } from "@/components/filtros-calendario";
import { ListaProgramacoes } from "@/components/lista-programacoes";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { dataLonga, fimDe, hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { exigirPerfil } from "@/lib/sessao";
import type { Programacao } from "@/lib/tipos";

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

  const mesDeHoje = hoje.slice(0, 7);
  const [nomeMes, ano] = maiuscula(nomeDoMes(mes)).split(" de ");
  const doMes = programacoes.filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {nomeMes} <span className="font-normal text-slate-400">{ano}</span>
        </h1>
        <div className="flex items-center gap-1.5">
          {mes !== mesDeHoje && (
            <Link href={link({ mes: mesDeHoje })} className="botao-secundario px-3 py-1.5">
              Hoje
            </Link>
          )}
          <Link href={link({ mes: anterior })} className="botao-secundario px-2 py-1.5" aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </Link>
          <Link href={link({ mes: proximo })} className="botao-secundario px-2 py-1.5" aria-label="Próximo mês">
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosCalendario departamentos={departamentos} />
        <LegendaOrigens />
      </div>

      <CalendarioMes
        dias={dias}
        porDia={porDia}
        mesAtual={mes}
        hoje={hoje}
        diaSelecionado={dia}
        linkDoDia={(d) => `${link({ dia: d })}#lista`}
      />

      <section id="lista" className="scroll-mt-4 space-y-3">
        {dia ? (
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
