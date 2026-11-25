import { NextResponse } from "next/server";

// Manifesto próprio do link do associado: no iPhone, o atalho da Tela de
// Início abre direto nesta página (e não no login da Agenda).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new NextResponse(null, { status: 404 });
  return NextResponse.json(
    {
      name: "Minha escala",
      short_name: "Minha escala",
      start_url: `/m/${token}`,
      scope: "/",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#4f46e5",
      lang: "pt-BR",
      icons: [
        { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
