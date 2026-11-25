"use client";

import { useState } from "react";
import { Check, Copy, Link2, MessageCircle, RefreshCw } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { linkWhatsapp } from "@/lib/resumo";
import { gerarNovoLinkEntrada } from "../acoes";

/** Link para os líderes entrarem sozinhos (compartilhar no grupo do WhatsApp). */
export function LinkEntrada({ link, igreja }: { link: string; igreja: string }) {
  const [copiado, setCopiado] = useState(false);
  const mensagem =
    `Líderes da ${/^igreja\b/i.test(igreja) ? igreja : `Igreja ${igreja}`}: para acessar a agenda da igreja e montar as escalas do seu departamento, ` +
    `crie seu acesso por este link: ${link}`;
  return (
    <section className="cartao space-y-3 border-indigo-200 bg-indigo-50/40">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
          <Link2 size={18} />
        </span>
        <div>
          <h2 className="font-semibold">Link de entrada para líderes</h2>
          <p className="text-sm text-slate-600">
            Mande no grupo dos líderes. Cada um cria o próprio acesso e escolhe o departamento; vocês recebem um aviso e podem
            remover quem não for líder.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={linkWhatsapp(null, mensagem)} target="_blank" rel="noopener noreferrer" className="botao bg-emerald-600 hover:bg-emerald-700">
          <MessageCircle size={16} /> Enviar no WhatsApp
        </a>
        <button
          type="button"
          className="botao-secundario"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              window.prompt("Copie o link:", link);
            }
          }}
        >
          {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Copiado!" : "Copiar link"}
        </button>
        <form action={gerarNovoLinkEntrada} className="ml-auto self-center">
          <BotaoConfirmar
            mensagem="Gerar um link novo? O link atual para de funcionar (quem já entrou continua com acesso)."
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"
          >
            <RefreshCw size={13} /> Gerar link novo
          </BotaoConfirmar>
        </form>
      </div>
    </section>
  );
}
