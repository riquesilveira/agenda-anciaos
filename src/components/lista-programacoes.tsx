import Link from "next/link";
import { CalendarRange, Clock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sigla } from "@/components/sigla";
import { dataCurta, diasAte, fimDe, horaCurta } from "@/lib/datas";
import { ORIGENS, type Programacao } from "@/lib/tipos";

export function SeloOrigem({ origem, fonte }: { origem: Programacao["origem"]; fonte?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ORIGENS[origem].classe}`}>
      {ORIGENS[origem].nome}
      {fonte && ` · ${fonte}`}
    </span>
  );
}

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Bloco de data à esquerda do cartão: mês, dia grande e dia da semana. */
function BlocoData({ p }: { p: Programacao }) {
  const d = parseISO(p.data);
  const cores = ORIGENS[p.origem];
  return (
    <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 ${cores.fundoData}`}>
      <span className={`text-[10px] font-bold tracking-wider uppercase ${cores.textoData}`}>
        {format(d, "MMM", { locale: ptBR }).replace(".", "")}
      </span>
      <span className="text-2xl leading-none font-bold text-slate-900">{d.getDate()}</span>
      <span className="text-[11px] text-slate-500">{DIAS[d.getDay()]}</span>
    </div>
  );
}

export function ListaProgramacoes({ programacoes, hoje }: { programacoes: Programacao[]; hoje: string }) {
  if (!programacoes.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Nenhuma programação neste período.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {programacoes.map((p) => {
        const passou = fimDe(p) < hoje;
        const variosDias = p.data_fim && p.data_fim !== p.data;
        // Lembrete do líder só faz sentido para o que está próximo (até 30 dias).
        const proxima = !passou && diasAte(p.data, hoje) <= 30;
        return (
          <li key={p.id}>
            <Link
              href={`/programacoes/${p.id}`}
              className={`group flex gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-indigo-300 hover:shadow ${
                passou ? "opacity-55" : ""
              }`}
            >
              <BlocoData p={p} />
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="leading-snug font-semibold text-slate-900 group-hover:text-indigo-700">{p.titulo}</p>
                  {p.departamento && <Sigla d={p.departamento} />}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  {variosDias && (
                    <span className="flex items-center gap-1">
                      <CalendarRange size={12} /> até {dataCurta(p.data_fim!)}
                    </span>
                  )}
                  {p.hora_inicio && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {horaCurta(p.hora_inicio)}
                      {p.hora_fim && ` – ${horaCurta(p.hora_fim)}`}
                    </span>
                  )}
                  {p.local && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {p.local}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <SeloOrigem origem={p.origem} fonte={p.fonte} />
                  {p.departamento && <span className="text-[11px] text-slate-500">{p.departamento.nome}</span>}
                  {p.departamento && p.lider_avisado_em && (
                    <span className="text-[11px] font-medium text-emerald-700">✓ líder avisado</span>
                  )}
                  {p.departamento && !p.lider_avisado_em && proxima && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      avisar líder
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
