"use client";

import { startTransition, useActionState } from "react";
import { STATUS } from "@/lib/pregacao";
import type { Pregacao, StatusPregacao } from "@/lib/tipos";
import { salvarPregacao, type EstadoPregacao } from "../../../acoes";

export function FormPregacao({ p, ancionato, euId }: { p: Pregacao; ancionato: { id: string; rotulo: string }[]; euId: string }) {
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
      <h2 className="font-semibold">Pregador</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="pregador_nome">Nome</label>
          <input className="campo" id="pregador_nome" name="pregador_nome" defaultValue={p.pregador_nome ?? ""} placeholder="Ex: Pr. João Silva" />
        </div>
        <div>
          <label className="rotulo" htmlFor="pregador_whatsapp">WhatsApp</label>
          <input className="campo" id="pregador_whatsapp" name="pregador_whatsapp" inputMode="tel" defaultValue={p.pregador_whatsapp ?? ""} placeholder="(43) 99999-9999" />
        </div>
        <div>
          <label className="rotulo" htmlFor="pregador_igreja">Igreja de origem</label>
          <input className="campo" id="pregador_igreja" name="pregador_igreja" defaultValue={p.pregador_igreja ?? ""} placeholder="Ex: IASD Central" />
        </div>
        <div>
          <label className="rotulo" htmlFor="status">Situação do convite</label>
          <select className="campo" id="status" name="status" defaultValue={p.status}>
            {(Object.keys(STATUS) as StatusPregacao[]).map((s) => (
              <option key={s} value={s}>{STATUS[s].nome}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="rotulo" htmlFor="tema">Tema / título do sermão</label>
        <input className="campo" id="tema" name="tema" defaultValue={p.tema ?? ""} />
      </div>
      <div>
        <label className="rotulo" htmlFor="observacoes">Observações</label>
        <textarea className="campo" id="observacoes" name="observacoes" rows={2} defaultValue={p.observacoes ?? ""} />
      </div>
      <div>
        <label className="rotulo" htmlFor="anciao_id">Ancião responsável</label>
        <select className="campo" id="anciao_id" name="anciao_id" defaultValue={euId}>
          {ancionato.map((a) => (
            <option key={a.id} value={a.id}>{a.id === euId ? `${a.rotulo} (você)` : a.rotulo}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">Se passar para outro ancião, só ele poderá alterar depois.</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        {!salvando && estado.ok && <span className="text-sm text-emerald-700">✅ Salvo</span>}
        {!salvando && estado.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
      </div>
    </form>
  );
}
