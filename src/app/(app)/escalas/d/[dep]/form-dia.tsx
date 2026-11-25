"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { EscalaDia } from "@/lib/tipos";
import { salvarDiaEscala, type EstadoDiaEscala } from "../../../acoes";

/** "+ Novo dia" (ou o lápis de editar): data, horário, título e observação. */
export function FormDia({
  departamentoId,
  mesPadrao,
  dia,
  aoSalvar,
}: {
  departamentoId: string;
  mesPadrao: string;
  dia?: EscalaDia;
  aoSalvar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, salvando] = useActionState<EstadoDiaEscala, FormData>(salvarDiaEscala, {});

  useEffect(() => {
    if (estado.ok) {
      setAberto(false);
      aoSalvar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!aberto) {
    return dia ? (
      <button type="button" onClick={() => setAberto(true)} title="Editar dia" aria-label="Editar dia" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <Pencil size={15} />
      </button>
    ) : (
      <button type="button" onClick={() => setAberto(true)} className="botao">
        <Plus size={16} /> Novo dia
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className={`space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 ${dia ? "absolute top-9 right-0 z-30 w-[min(22rem,calc(100vw-2rem))] bg-white shadow-lg" : ""}`}
    >
      {dia && <input type="hidden" name="id" value={dia.id} />}
      <input type="hidden" name="departamento_id" value={departamentoId} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="rotulo">Data *</label>
          <input className="campo" type="date" name="data" required defaultValue={dia?.data ?? `${mesPadrao}-01`} />
        </div>
        <div>
          <label className="rotulo">Horário</label>
          <input className="campo" type="time" name="horario" defaultValue={dia?.horario?.slice(0, 5) ?? ""} />
        </div>
      </div>
      <div>
        <label className="rotulo">Título</label>
        <input className="campo" name="titulo" defaultValue={dia?.titulo ?? ""} placeholder="Ex: Culto Divino, Ensaio, Casamento" />
      </div>
      <div>
        <label className="rotulo">Observação</label>
        <input className="campo" name="observacao" defaultValue={dia?.observacao ?? ""} />
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : dia ? "Salvar" : "Criar dia"}</button>
        <button type="button" className="botao-secundario" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
