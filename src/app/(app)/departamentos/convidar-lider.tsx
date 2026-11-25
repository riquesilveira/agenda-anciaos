"use client";

import { startTransition, useActionState, useState } from "react";
import { Copy, MessageCircle, UserPlus } from "lucide-react";
import { linkWhatsapp } from "@/lib/resumo";
import { convidarLider, type EstadoConvite } from "../acoes";

export function ConvidarLider({ departamentoId, departamento }: { departamentoId: string; departamento: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoConvite, FormData>(convidarLider, {});

  if (estado.link) {
    const mensagem =
      `Olá, ${estado.nome}! Você foi cadastrado(a) como líder de ${estado.departamento} na Agenda da igreja. ` +
      `Abra este link para criar sua senha (vale por 24 horas):\n${estado.link}`;
    return (
      <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
        <p className="font-medium">✅ Convite pronto para {estado.nome}. Envie o link para a pessoa:</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={linkWhatsapp(estado.whatsapp ?? null, mensagem)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao bg-emerald-600 hover:bg-emerald-700"
          >
            <MessageCircle size={16} /> Enviar pelo WhatsApp
          </a>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => navigator.clipboard.writeText(mensagem).then(() => setCopiado(true))}
          >
            <Copy size={16} /> {copiado ? "Copiado!" : "Copiar mensagem"}
          </button>
        </div>
        <p className="text-xs">O link funciona uma vez e vale por 24 horas. Se expirar, gere outro aqui.</p>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button type="button" className="botao-secundario" onClick={() => setAberto(true)}>
        <UserPlus size={16} /> Convidar líder de {departamento}
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
      className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
    >
      <input type="hidden" name="departamento_id" value={departamentoId} />
      <div>
        <label className="rotulo">Nome do líder</label>
        <input className="campo" name="nome" required />
      </div>
      <div>
        <label className="rotulo">E-mail</label>
        <input className="campo" name="email" type="email" required />
      </div>
      <div>
        <label className="rotulo">WhatsApp</label>
        <input className="campo" name="whatsapp" inputMode="tel" placeholder="(44) 99999-9999" />
      </div>
      <button className="botao" disabled={enviando}>{enviando ? "Gerando…" : "Gerar convite"}</button>
      {estado.erro && <p className="text-sm text-red-600 sm:col-span-4">{estado.erro}</p>}
    </form>
  );
}
