"use client";

import { useRouter } from "next/navigation";
import type { Departamento } from "@/lib/tipos";

/** Escolher o departamento já filtra (sem botão). */
export function FiltroDepartamento({
  departamentos,
  valor,
  linkBase,
}: {
  departamentos: Pick<Departamento, "id" | "nome" | "sigla">[];
  valor: string;
  /** URL atual sem o parâmetro dep (termina em "?" ou "&"). */
  linkBase: string;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="Departamento"
      value={valor}
      onChange={(e) => router.push(e.target.value ? `${linkBase}dep=${e.target.value}` : linkBase.replace(/[?&]$/, ""))}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
    >
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
