"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { linkWhatsapp } from "@/lib/resumo";
import type { EstadoConvite } from "../acoes";

/** Resultado do convite: botão para mandar o link pelo WhatsApp ou copiar. */
export function CaixaConvite({ convite }: { convite: EstadoConvite }) {
  const [copiado, setCopiado] = useState(false);
  if (!convite.link) return null;
  const mensagem =
    `Olá, ${convite.nome}! Você foi cadastrado(a) como líder de ${convite.departamento} no 7Líder. ` +
    `Abra este link para criar sua senha (vale por 24 horas):\n${convite.link}`;
  return (
    <div className="space-y-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="font-medium">✅ Convite pronto para {convite.nome}. Envie o link para a pessoa:</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={linkWhatsapp(convite.whatsapp ?? null, mensagem)}
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
      <p className="text-xs">O link funciona uma vez e vale por 24 horas. Se expirar, gere outro no cartão do departamento.</p>
    </div>
  );
}
