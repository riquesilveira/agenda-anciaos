"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORIGENS, type Origem } from "@/lib/tipos";

/** Filtros que aplicam na hora (sem botão "Filtrar"). */
export function FiltrosCalendario({ departamentos }: { departamentos: { id: string; nome: string; sigla: string | null }[] }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();

  function aplicar(chave: string, valor: string) {
    const q = new URLSearchParams(params.toString());
    if (valor) q.set(chave, valor);
    else q.delete(chave);
    q.delete("dia");
    router.push(`${caminho}?${q}`);
  }

  const classe =
    "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:flex-none";
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <select aria-label="Departamento" className={classe} value={params.get("dep") ?? ""} onChange={(e) => aplicar("dep", e.target.value)}>
        <option value="">Todos os departamentos</option>
        {departamentos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.sigla ? `${d.sigla} · ${d.nome}` : d.nome}
          </option>
        ))}
      </select>
      <select aria-label="Origem" className={classe} value={params.get("origem") ?? ""} onChange={(e) => aplicar("origem", e.target.value)}>
        <option value="">Todas as origens</option>
        {(Object.keys(ORIGENS) as Origem[]).map((o) => (
          <option key={o} value={o}>
            {ORIGENS[o].nome}
          </option>
        ))}
      </select>
    </div>
  );
}
