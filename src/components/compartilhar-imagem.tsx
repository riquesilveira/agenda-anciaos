"use client";

import { useRef, useState } from "react";
import { ImageDown, Image as IconeImagem, MessageCircle, Share2 } from "lucide-react";
import { linkWhatsapp } from "@/lib/resumo";

export interface LinhaImagem {
  data: string; // yyyy-MM-dd
  titulo: string; // "Culto Divino · 9h" (vazio = sem linha de título)
  nomes: string[]; // vazio = "a definir"
}

const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

/**
 * Gera a imagem da escala do mês NO APARELHO de quem toca (não no servidor,
 * que é pequeno) e abre o "Compartilhar" do celular. No computador, baixa.
 */
export function CompartilharImagem({
  titulo,
  mes,
  igreja,
  linhas,
  arquivo,
  rotulo,
  texto,
}: {
  titulo: string;
  mes: string;
  igreja: string;
  linhas: LinhaImagem[];
  arquivo: string;
  rotulo: string;
  /** Mesma escala em texto formatado para o WhatsApp. */
  texto: string;
}) {
  const [menu, setMenu] = useState(false);
  const [estado, setEstado] = useState<"" | "gerando" | "baixada" | "erro">("");
  const quadro = useRef<HTMLDivElement>(null);

  async function compartilhar() {
    if (!quadro.current) return;
    setEstado("gerando");
    try {
      const { toBlob } = await import("html-to-image");
      await document.fonts?.ready;
      const blob = await toBlob(quadro.current, { pixelRatio: 1, cacheBust: true, backgroundColor: "#eef2ff" });
      if (!blob) throw new Error("vazio");
      const imagem = new File([blob], arquivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [imagem] })) {
        try {
          await navigator.share({ files: [imagem], title: `${titulo}: ${mes}` });
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
    } catch (e) {
      console.error("Falha ao gerar a imagem", e);
      setEstado("erro");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        aria-expanded={menu}
        disabled={estado === "gerando"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
      >
        {estado === "baixada" ? <ImageDown size={16} /> : <Share2 size={16} />}
        {estado === "gerando" ? "Gerando a imagem…" : rotulo}
      </button>
      {menu && (
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              compartilhar();
            }}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <IconeImagem size={16} className="text-indigo-600" /> Imagem
          </button>
          <a
            href={linkWhatsapp(null, texto)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(false)}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <MessageCircle size={16} className="text-emerald-600" /> Texto no WhatsApp
          </a>
        </div>
      )}
      {estado === "baixada" && <p className="text-xs text-slate-500">Imagem baixada. É só anexar no WhatsApp.</p>}
      {estado === "erro" && <p className="text-xs text-red-600">Não foi possível gerar a imagem. Tente de novo.</p>}

      {/* Quadro que vira imagem: fica fora da tela, só existe para ser fotografado. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[3000px]">
        <div ref={quadro} style={{ width: 1080, padding: 48, background: "#eef2ff", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
          <div
            style={{
              borderRadius: 36,
              padding: "40px 44px",
              background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #7c3aed 100%)",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icones/icone-192.png" width={52} height={52} style={{ borderRadius: 14 }} alt="" />
              <span style={{ fontSize: 28, fontWeight: 800 }}>7Líder</span>
              <span style={{ fontSize: 24, opacity: 0.85, marginLeft: "auto" }}>{igreja}</span>
            </div>
            <div style={{ fontSize: 60, fontWeight: 800, marginTop: 28, lineHeight: 1.1 }}>{titulo}</div>
            <div style={{ fontSize: 32, fontWeight: 600, opacity: 0.9, marginTop: 8 }}>{mes}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 28 }}>
            {linhas.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 28, fontSize: 30, color: "#64748b" }}>
                Nenhum dia na escala deste mês.
              </div>
            )}
            {linhas.map((l, i) => {
              const d = new Date(`${l.data}T12:00:00`);
              return (
                <div key={i} style={{ display: "flex", alignItems: "stretch", gap: 24, background: "white", borderRadius: 28, padding: 22, boxShadow: "0 2px 6px rgba(15,23,42,0.06)" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 112,
                      minHeight: 96,
                      flexShrink: 0,
                      borderRadius: 22,
                      background: "#eef2ff",
                      color: "#4338ca",
                    }}
                  >
                    <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{SEMANA[d.getDay()]}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 12 }}>
                    {l.titulo && <span style={{ fontSize: 26, fontWeight: 600, color: "#64748b" }}>{l.titulo}</span>}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {l.nomes.length ? (
                        l.nomes.map((n, j) => (
                          <span key={j} style={{ fontSize: 30, fontWeight: 800, color: "#1e1b4b", background: "#e0e7ff", borderRadius: 14, padding: "6px 16px" }}>
                            {n}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 30, fontWeight: 600, color: "#94a3b8" }}>a definir</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", paddingTop: 28, fontSize: 22, color: "#6366f1", fontWeight: 600 }}>7lider.com.br</div>
        </div>
      </div>
    </div>
  );
}
