import type { MetadataRoute } from "next";

// Permite "Adicionar à tela inicial" com ícone próprio, abrindo em tela cheia.
// No iPhone, é isso que libera as notificações.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "7Líder",
    short_name: "7Líder",
    description: "Programações da Associação, do distrito e da igreja num só calendário.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
