import Link from "next/link";
import { Mic } from "lucide-react";
import type { Departamento } from "@/lib/tipos";

/**
 * Abas da página Escalas: Pregação + departamentos que já têm equipe
 * (ou que a pessoa pode montar). Anciãos/pastor podem abrir qualquer um.
 */
export function AbasEscalas({
  ativa,
  departamentos,
  comEquipe,
  editaveis,
  podeAbrirOutros,
}: {
  ativa: string; // "pregacao" ou id do departamento
  departamentos: Departamento[];
  comEquipe: Set<string>;
  editaveis: Set<string>;
  /** Anciãos/pastor: menu para começar a escala de qualquer departamento. */
  podeAbrirOutros: boolean;
}) {
  const visiveis = departamentos.filter((d) => comEquipe.has(d.id) || editaveis.has(d.id) || d.id === ativa);
  const outros = departamentos.filter((d) => !visiveis.includes(d));
  const classe = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
      on ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"
    }`;
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Escalas">
      <Link href="/escalas" className={classe(ativa === "pregacao")} aria-current={ativa === "pregacao" ? "page" : undefined}>
        <Mic size={15} /> Pregação
      </Link>
      {visiveis.map((d) => (
        <Link key={d.id} href={`/escalas/d/${d.id}`} className={classe(ativa === d.id)} aria-current={ativa === d.id ? "page" : undefined}>
          {d.sigla && <span className="text-[11px] font-bold opacity-80">{d.sigla}</span>}
          {d.nome}
        </Link>
      ))}
      {podeAbrirOutros && outros.length > 0 && (
        <details className="relative shrink-0">
          <summary className="flex cursor-pointer list-none items-center rounded-lg px-3 py-2 text-sm whitespace-nowrap text-indigo-700 hover:bg-indigo-50">
            + Outro departamento
          </summary>
          <ul className="absolute right-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {outros.map((d) => (
              <li key={d.id}>
                <Link href={`/escalas/d/${d.id}`} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  {d.sigla && <b className="mr-1 text-xs">{d.sigla}</b>}
                  {d.nome}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
