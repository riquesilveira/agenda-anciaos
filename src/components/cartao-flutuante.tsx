"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Onde o cartão aparece: ao lado do dia (computador) ou subindo de baixo (celular). */
export type Posicao = { modo: "flutuante"; x: number; y: number; largura: number } | { modo: "folha" };

const LARGURA = 336;

export function posicaoPara(celula: HTMLElement, altura = 500): Posicao {
  if (window.innerWidth < 640) return { modo: "folha" };
  const r = celula.getBoundingClientRect();
  let x = r.right + 8 + LARGURA < window.innerWidth ? r.right + 8 : r.left - 8 - LARGURA;
  x = Math.max(8, Math.min(x, window.innerWidth - LARGURA - 8));
  const y = Math.max(72, Math.min(r.top, window.innerHeight - altura));
  return { modo: "flutuante", x, y, largura: LARGURA };
}

/**
 * Cartão do cadastro rápido (programação, pregador). Enquanto aberto, o dia
 * clicado fica destacado (data-selecionado, estilo em globals.css).
 */
export function CartaoFlutuante({
  posicao,
  celula,
  titulo,
  subtitulo,
  aoFechar,
  cartaoRef,
  children,
}: {
  posicao: Posicao;
  celula: HTMLElement | null;
  titulo: string;
  subtitulo?: React.ReactNode;
  aoFechar: () => void;
  cartaoRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!celula) return;
    celula.setAttribute("data-selecionado", "");
    return () => celula.removeAttribute("data-selecionado");
  }, [celula]);

  // Celular: trava a rolagem da página por trás da folha.
  useEffect(() => {
    if (posicao.modo !== "folha") return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-folha-aberta", ""); // esconde a barra de baixo (globals.css)
    return () => {
      document.body.style.overflow = antes;
      document.body.removeAttribute("data-folha-aberta");
    };
  }, [posicao.modo]);

  const cabecalho = (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <div>
        <h2 className="font-semibold text-slate-900">{titulo}</h2>
        {subtitulo && <div className="text-xs text-slate-500">{subtitulo}</div>}
      </div>
      <button type="button" onClick={aoFechar} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
        <X size={18} />
      </button>
    </div>
  );

  if (posicao.modo === "folha") {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-slate-900/30" aria-hidden onClick={aoFechar} />
        <div
          ref={cartaoRef}
          role="dialog"
          aria-label={titulo}
          className="fixed inset-x-0 bottom-0 z-[70] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
          {cabecalho}
          {children}
        </div>
      </>
    );
  }
  return (
    <div
      ref={cartaoRef}
      role="dialog"
      aria-label={titulo}
      style={{ left: posicao.x, top: posicao.y, width: posicao.largura }}
      className="fixed z-40 rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      {cabecalho}
      {children}
    </div>
  );
}
