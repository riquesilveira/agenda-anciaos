"use client";

import { startTransition, useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { convidarLider, type EstadoConvite } from "../acoes";
import { CaixaConvite } from "./caixa-convite";

export function ConvidarLider({
  departamentoId,
  departamento,
  sugestao,
}: {
  departamentoId: string;
  departamento: string;
  /** Nome/WhatsApp do líder já anotados no departamento, para pré-preencher. */
  sugestao?: { nome: string | null; whatsapp: string | null };
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoConvite, FormData>(convidarLider, {});

  if (estado.link) return <CaixaConvite convite={estado} />;

  if (!aberto) {
    return (
      <button type="button" className="botao bg-emerald-600 hover:bg-emerald-700" onClick={() => setAberto(true)}>
        <UserPlus size={16} /> Convidar líder
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
      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <p className="text-sm font-medium">Convidar líder de {departamento}</p>
      <input type="hidden" name="departamento_id" value={departamentoId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="rotulo">Nome</label>
          <input className="campo" name="nome" required defaultValue={sugestao?.nome ?? ""} />
        </div>
        <div>
          <label className="rotulo">E-mail</label>
          <input className="campo" name="email" type="email" required />
        </div>
        <div>
          <label className="rotulo">WhatsApp</label>
          <input className="campo" name="whatsapp" inputMode="tel" placeholder="(44) 99999-9999" defaultValue={sugestao?.whatsapp ?? ""} />
        </div>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao bg-emerald-600 hover:bg-emerald-700" disabled={enviando}>
          {enviando ? "Gerando…" : "Gerar convite"}
        </button>
        <button type="button" className="botao-secundario" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
