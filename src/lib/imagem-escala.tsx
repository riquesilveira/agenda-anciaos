import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export interface LinhaImagem {
  data: string; // yyyy-MM-dd
  titulo: string; // "Culto Divino · 9h" ou "Sábado manhã"
  nomes: string[]; // pessoas (vazio = "a definir")
  rodape?: string; // ex: "Resp.: Henrique"
}

const SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const LARGURA = 1080;

let fontes: { name: string; data: Buffer; weight: 400 | 600 | 800; style: "normal" }[] | null = null;
async function carregarFontes() {
  if (fontes) return fontes;
  const pasta = path.join(process.cwd(), "public", "fontes");
  const [r, s, b] = await Promise.all(["inter-400.woff", "inter-600.woff", "inter-800.woff"].map((f) => readFile(path.join(pasta, f))));
  fontes = [
    { name: "Inter", data: r, weight: 400, style: "normal" },
    { name: "Inter", data: s, weight: 600, style: "normal" },
    { name: "Inter", data: b, weight: 800, style: "normal" },
  ];
  return fontes;
}

let logo: string | null = null;
async function carregarLogo() {
  if (logo) return logo;
  const png = await readFile(path.join(process.cwd(), "public", "icones", "icone-192.png"));
  logo = `data:image/png;base64,${png.toString("base64")}`;
  return logo;
}

/** Altura aproximada de uma linha (os nomes quebram em mais linhas quando são muitos). */
function alturaDaLinha(l: LinhaImagem) {
  const caracteres = l.nomes.join("    ").length || 10;
  const linhasDeNomes = Math.max(1, Math.ceil(caracteres / 38));
  return Math.max(130, 44 + (l.titulo ? 40 : 0) + linhasDeNomes * 54 + (l.rodape ? 32 : 0));
}

/** Imagem da escala do mês para compartilhar no WhatsApp. */
export async function imagemDaEscala(opcoes: { titulo: string; mes: string; igreja: string; linhas: LinhaImagem[] }) {
  const { titulo, mes, igreja, linhas } = opcoes;
  const [fontesCarregadas, logoUrl] = await Promise.all([carregarFontes(), carregarLogo()]);
  const altura = 455 + linhas.reduce((t, l) => t + alturaDaLinha(l) + 20, 0) + (linhas.length ? 0 : 160);

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#eef2ff", padding: 48, fontFamily: "Inter" }}>
        {/* Cabeçalho */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 36,
            padding: "40px 44px",
            background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 55%, #7c3aed 100%)",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} width={52} height={52} style={{ borderRadius: 14 }} alt="" />
            <span style={{ fontSize: 28, fontWeight: 800 }}>7Líder</span>
            <span style={{ fontSize: 24, opacity: 0.8, marginLeft: "auto" }}>{igreja}</span>
          </div>
          <span style={{ fontSize: 60, fontWeight: 800, marginTop: 28, lineHeight: 1.1 }}>{titulo}</span>
          <span style={{ fontSize: 32, fontWeight: 600, opacity: 0.9, marginTop: 8 }}>{mes}</span>
        </div>

        {/* Dias */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 28 }}>
          {linhas.length === 0 && (
            <div style={{ display: "flex", justifyContent: "center", padding: 40, background: "white", borderRadius: 28, fontSize: 30, color: "#64748b" }}>
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
                  {l.rodape && <span style={{ fontSize: 22, color: "#94a3b8" }}>{l.rodape}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: 28, fontSize: 22, color: "#6366f1", fontWeight: 600 }}>
          7lider.com.br
        </div>
      </div>
    ),
    { width: LARGURA, height: altura, fonts: fontesCarregadas },
  );
}
