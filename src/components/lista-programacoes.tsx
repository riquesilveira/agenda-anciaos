import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { Sigla } from "@/components/sigla";
import { dataLonga, fimDe, horaCurta, maiuscula } from "@/lib/datas";
import { ORIGENS, type Programacao } from "@/lib/tipos";

export function SeloOrigem({ origem, fonte }: { origem: Programacao["origem"]; fonte?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${ORIGENS[origem].classe}`}>
      {ORIGENS[origem].nome}
      {fonte && ` · ${fonte}`}
    </span>
  );
}

export function ListaProgramacoes({ programacoes, hoje }: { programacoes: Programacao[]; hoje: string }) {
  if (!programacoes.length) {
    return <p className="cartao text-sm text-slate-500">Nenhuma programação neste período.</p>;
  }

  return (
    <ul className="space-y-2">
      {programacoes.map((p) => (
        <li key={p.id}>
          <Link
            href={`/programacoes/${p.id}`}
            className={`cartao flex flex-col gap-1 hover:border-indigo-300 sm:flex-row sm:items-center sm:justify-between ${fimDe(p) < hoje ? "opacity-60" : ""}`}
          >
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                <span>{maiuscula(dataLonga(p.data))}</span>
                {p.data_fim && p.data_fim !== p.data && <> até {dataLonga(p.data_fim)}</>}
              </div>
              <div className="font-medium">{p.titulo}</div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                {p.hora_inicio && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {horaCurta(p.hora_inicio)}
                    {p.hora_fim && ` às ${horaCurta(p.hora_fim)}`}
                  </span>
                )}
                {p.local && <span className="flex items-center gap-1"><MapPin size={12} /> {p.local}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {p.departamento && (
                <span className="flex items-center gap-1 text-xs text-slate-600">
                  <Sigla d={p.departamento} />
                  {p.departamento.nome}
                </span>
              )}
              <SeloOrigem origem={p.origem} fonte={p.fonte} />
              {p.departamento &&
                (p.lider_avisado_em ? (
                  <span className="text-xs text-emerald-700">✅ líder avisado</span>
                ) : (
                  <span className="text-xs text-amber-700">⚠️ avisar líder</span>
                ))}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
