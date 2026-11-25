"use client";

import { useState } from "react";
import { ImageDown, Share2 } from "lucide-react";

/**
 * Gera a imagem da escala e abre o "Compartilhar" do celular (WhatsApp etc.).
 * Onde não dá para compartilhar arquivo (computador), baixa a imagem.
 */
export function CompartilharImagem({ url, arquivo, rotulo, titulo }: { url: string; arquivo: string; rotulo: string; titulo: string }) {
  const [estado, setEstado] = useState<"" | "gerando" | "baixada" | "erro">("");

  async function compartilhar() {
    setEstado("gerando");
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(String(resposta.status));
      const blob = await resposta.blob();
      const imagem = new File([blob], arquivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [imagem] })) {
        try {
          await navigator.share({ files: [imagem], title: titulo });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
        return setEstado("");
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = arquivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      setEstado("baixada");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={compartilhar}
        disabled={estado === "gerando"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
      >
        {estado === "baixada" ? <ImageDown size={16} /> : <Share2 size={16} />}
        {estado === "gerando" ? "Gerando a imagem…" : rotulo}
      </button>
      {estado === "baixada" && <p className="text-xs text-slate-500">Imagem baixada. É só anexar no WhatsApp.</p>}
      {estado === "erro" && <p className="text-xs text-red-600">Não foi possível gerar a imagem. Tente de novo.</p>}
    </div>
  );
}
