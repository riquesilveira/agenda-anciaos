import type { Metadata, Viewport } from "next";
import "./globals.css";
import { VersaoNova } from "@/components/versao-nova";

export const metadata: Metadata = {
  title: "7Líder",
  description: "Programações da Associação, do distrito e da igreja num só calendário.",
  applicationName: "7Líder",
  appleWebApp: { capable: true, title: "7Líder", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icones/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// viewportFit "cover": no iPhone, permite respeitar a barrinha inferior (safe-area).
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <VersaoNova />
        {children}
      </body>
    </html>
  );
}
