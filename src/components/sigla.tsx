import type { Departamento } from "@/lib/tipos";

/** Selo com a sigla do departamento (ASA, MM, DBV…). Sem sigla, mostra o nome. */
export function Sigla({ d, tamanho = "normal" }: { d: Pick<Departamento, "nome" | "sigla">; tamanho?: "normal" | "mini" }) {
  const classe =
    tamanho === "mini"
      ? "rounded bg-slate-700 px-1 text-[9px] leading-[14px] font-bold tracking-wide text-white"
      : "rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white";
  return (
    <span className={classe} title={d.nome}>
      {d.sigla ?? d.nome}
    </span>
  );
}
