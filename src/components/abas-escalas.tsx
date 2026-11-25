import Link from "next/link";
import { Mic, Plus } from "lucide-react";
import { IconeDepartamento } from "@/components/icone-departamento";
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
  vertical = false,
}: {
  ativa: string; // "pregacao" ou id do departamento
  departamentos: Departamento[];
  comEquipe: Set<string>;
  editaveis: Set<string>;
  /** Anciãos/pastor: menu para começar a escala de qualquer departamento. */
  podeAbrirOutros: boolean;
  /** Lista na lateral (computador) em vez de abas na horizontal. */
  vertical?: boolean;
}) {
  const visiveis = departamentos.filter((d) => comEquipe.has(d.id) || editaveis.has(d.id) || d.id === ativa);
  const outros = departamentos.filter((d) => !visiveis.includes(d));
  const classe = (on: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
      on ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"
    }`;
  if (vertical) {
    const item = (on: boolean) =>
      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
        on ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-700 hover:bg-slate-50"
      }`;
    return (
      <nav className="space-y-0.5" aria-label="Escalas">
        <Link href="/escalas" className={item(ativa === "pregacao")} aria-current={ativa === "pregacao" ? "page" : undefined}>
          <Mic size={16} /> Pregação
        </Link>
        {visiveis.map((d) => (
          <Link key={d.id} href={`/escalas/d/${d.id}`} className={item(ativa === d.id)} aria-current={ativa === d.id ? "page" : undefined}>
            <IconeDepartamento nome={d.nome} sigla={d.sigla} />
            {d.nome}
          </Link>
        ))}
        {podeAbrirOutros && outros.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-indigo-700 hover:bg-indigo-50">
              <Plus size={16} /> Outro departamento
            </summary>
            <ul className="mt-0.5 max-h-64 space-y-0.5 overflow-y-auto border-l border-slate-200 pl-2">
              {outros.map((d) => (
                <li key={d.id}>
                  <Link href={`/escalas/d/${d.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                    <IconeDepartamento nome={d.nome} sigla={d.sigla} />
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

  return (
    <div className="flex items-stretch gap-2">
    <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Escalas">
      <Link href="/escalas" className={classe(ativa === "pregacao")} aria-current={ativa === "pregacao" ? "page" : undefined}>
        <Mic size={15} /> Pregação
      </Link>
      {visiveis.map((d) => (
        <Link key={d.id} href={`/escalas/d/${d.id}`} className={classe(ativa === d.id)} aria-current={ativa === d.id ? "page" : undefined}>
          <IconeDepartamento nome={d.nome} sigla={d.sigla} />
          {d.nome}
        </Link>
      ))}
    </nav>
      {/* Fora da área que rola: senão a lista aberta fica cortada/escondida */}
      {podeAbrirOutros && outros.length > 0 && (
        <details className="relative shrink-0">
          <summary className="flex h-full cursor-pointer list-none items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm whitespace-nowrap text-indigo-700 shadow-sm hover:bg-indigo-50">
            <Plus size={15} /> <span className="hidden sm:inline">Outro departamento</span><span className="sm:hidden">Outro</span>
          </summary>
          <ul className="absolute right-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {outros.map((d) => (
              <li key={d.id}>
                <Link href={`/escalas/d/${d.id}`} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  <span className="mr-2 inline-flex align-[-2px] text-slate-500"><IconeDepartamento nome={d.nome} sigla={d.sigla} /></span>
                  {d.nome}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
