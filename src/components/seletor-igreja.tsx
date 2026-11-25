"use client";

import { useTransition } from "react";
import { trocarIgreja } from "@/app/(app)/acoes";

/** Para quem atende mais de uma igreja (ex: o pastor do distrito). */
export function SeletorIgreja({ igrejas }: { igrejas: { id: string; nome: string; atual: boolean }[] }) {
  const [trocando, iniciar] = useTransition();
  const atual = igrejas.find((i) => i.atual)?.id ?? "";
  return (
    <select
      aria-label="Igreja"
      value={atual}
      disabled={trocando}
      onChange={(e) => {
        const destino = e.target.value;
        iniciar(() => trocarIgreja(destino));
      }}
      className="max-w-[11rem] cursor-pointer truncate rounded-xl border border-slate-200 bg-white py-1.5 pr-8 pl-3 text-sm font-medium text-slate-700 shadow-xs hover:border-slate-300 disabled:opacity-60"
    >
      {igrejas.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nome}
        </option>
      ))}
    </select>
  );
}
