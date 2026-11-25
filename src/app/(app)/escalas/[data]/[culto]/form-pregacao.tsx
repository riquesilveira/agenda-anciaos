"use client";

import { startTransition, useActionState } from "react";
import type { Pregacao } from "@/lib/tipos";
import { salvarPregacao, type EstadoPregacao } from "../../../acoes";

export function FormPregacao({
  p,
  dataTexto,
  ancionato,
  euId,
}: {
  p: Pregacao;
  dataTexto: string;
  ancionato: { id: string; rotulo: string }[];
  euId: string;
}) {
  const [estado, acao, salvando] = useActionState<EstadoPregacao, FormData>(salvarPregacao, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="cartao space-y-4"
    >
      <input type="hidden" name="id" value={p.id} />
      {p.culto === "especial" && (
        <div>
          <label className="rotulo" htmlFor="titulo">Nome do culto</label>
          <input className="campo" id="titulo" name="titulo" required maxLength={80} defaultValue={p.titulo ?? ""} placeholder="Ex: Semana de Oração" />
        </div>
      )}
      <div>
        <label className="rotulo" htmlFor="pregador_nome">Nome do pregador</label>
        <input className="campo" id="pregador_nome" name="pregador_nome" defaultValue={p.pregador_nome ?? ""} placeholder="Ex: Pr. João Silva" />
      </div>
      <div>
        <span className="rotulo">Data</span>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{dataTexto}</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="observacoes">Observação</label>
        <textarea className="campo" id="observacoes" name="observacoes" rows={3} defaultValue={p.observacoes ?? ""} />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500">Passar para outro ancião</summary>
        <div className="mt-2">
          <select className="campo" name="anciao_id" defaultValue={euId} aria-label="Ancião responsável">
            {ancionato.map((a) => (
              <option key={a.id} value={a.id}>{a.id === euId ? `${a.rotulo} (você)` : a.rotulo}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Depois de passar, só ele poderá alterar este culto.</p>
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        {!salvando && estado.ok && <span className="text-sm text-emerald-700">✅ Salvo</span>}
        {!salvando && estado.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
      </div>
    </form>
  );
}
