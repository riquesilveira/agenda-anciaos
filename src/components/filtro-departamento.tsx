"use client";

import type { Departamento } from "@/lib/tipos";

/** Escolher o departamento já filtra (sem botão, sem recarregar a página). */
export function FiltroDepartamento({
  departamentos,
  valor,
  aoMudar,
}: {
  departamentos: Pick<Departamento, "id" | "nome" | "sigla">[];
  valor: string;
  aoMudar: (dep: string) => void;
}) {
  return (
    <select aria-label="Departamento" value={valor} onChange={(e) => aoMudar(e.target.value)} className="campo">
      <option value="">Todos os departamentos</option>
      <option value="meus">⭐ Meus departamentos</option>
      {departamentos.map((d) => (
        <option key={d.id} value={d.id}>
          {d.sigla ? `${d.sigla} · ${d.nome}` : d.nome}
        </option>
      ))}
    </select>
  );
}
