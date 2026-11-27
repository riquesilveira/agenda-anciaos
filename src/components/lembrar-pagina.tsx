"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const CHAVE = "7lider-ultima-pagina";
const VALIDADE = 30 * 60 * 1000; // 30 min
// Endereço com que o app abriu, lido quando o código carrega (antes de qualquer
// página ajustar a URL, como o calendário faz com ?mes=).
const ABERTURA = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

function appInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * No app instalado, abrir o WhatsApp (convite, lembrete, aviso) pode fazer o
 * celular fechar o 7Líder; ao voltar, ele reabriria no calendário. Aqui
 * guardamos a última página e, se o app reabrir logo depois, voltamos a ela.
 */
export function LembrarPagina() {
  const caminho = usePathname();
  const params = useSearchParams();

  // Ao abrir o app do zero: volta para onde a pessoa estava.
  useEffect(() => {
    try {
      if (!appInstalado() || sessionStorage.getItem(CHAVE)) return;
      sessionStorage.setItem(CHAVE, "1"); // só na primeira tela desta abertura
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as { url: string; em: number } | null;
      // Só quando o app abriu pelo ícone (calendário, sem nada no endereço).
      if (salvo && Date.now() - salvo.em < VALIDADE && ABERTURA === "/" && salvo.url !== "/" && !salvo.url.startsWith("/?")) {
        // Navegação completa: a página do calendário ajusta a URL ao abrir e
        // cancelaria uma troca de rota do Next.
        window.location.replace(salvo.url);
      }
    } catch {
      // sem armazenamento (modo privado): segue normal
    }
  }, []);

  // Guarda a página atual (inclusive ao sair para o WhatsApp).
  useEffect(() => {
    const guardar = () => {
      try {
        localStorage.setItem(CHAVE, JSON.stringify({ url: window.location.pathname + window.location.search, em: Date.now() }));
      } catch {}
    };
    guardar();
    document.addEventListener("visibilitychange", guardar);
    return () => document.removeEventListener("visibilitychange", guardar);
  }, [caminho, params]);

  return null;
}
