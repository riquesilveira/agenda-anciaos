"use client";

import { startTransition, useActionState } from "react";
import { assumirComPregador, type EstadoPregacao } from "../../../acoes";

/** Culto sem responsável: cadastrar o pregador já assume o culto. */
export function FormNovaPregacao({ data, culto, dataTexto }: { data: string; culto: string; dataTexto: string }) {
  const [estado, acao, salvando] = useActionState<EstadoPregacao, FormData>(assumirComPregador, {});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="cartao space-y-4"
    >
      <input type="hidden" name="data" value={data} />
      <input type="hidden" name="culto" value={culto} />
      <div>
        <label className="rotulo" htmlFor="pregador_nome">Nome do pregador</label>
        <input className="campo" id="pregador_nome" name="pregador_nome" autoFocus placeholder="Ex: Pr. João Silva" />
      </div>
      <div>
        <span className="rotulo">Data</span>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{dataTexto}</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="observacoes">Observação</label>
        <textarea className="campo" id="observacoes" name="observacoes" rows={3} />
      </div>
      <p className="text-xs text-slate-500">Ao salvar, você fica como o ancião responsável por este culto.</p>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}
