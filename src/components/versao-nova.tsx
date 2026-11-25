"use client";

import { useEffect } from "react";

/**
 * Depois de uma atualização do sistema, uma página aberta antes dela chama
 * ações do servidor que não existem mais ("Server Action … not found").
 * Em vez de mostrar erro, recarrega a página uma vez para pegar a versão nova.
 */
export function ehVersaoAntiga(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro ?? "");
  return /Server Action .*(not found|was not found)|Failed to find Server Action|ChunkLoadError|Loading chunk .* failed/i.test(msg);
}

export function recarregarUmaVez(): boolean {
  try {
    const chave = "agenda-recarregou-versao";
    const ultima = Number(sessionStorage.getItem(chave) ?? 0);
    if (Date.now() - ultima < 30_000) return false; // evita ficar recarregando em loop
    sessionStorage.setItem(chave, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
}

export function VersaoNova() {
  useEffect(() => {
    const tratar = (motivo: unknown) => {
      if (ehVersaoAntiga(motivo)) recarregarUmaVez();
    };
    const aoRejeitar = (e: PromiseRejectionEvent) => tratar(e.reason);
    const aoErro = (e: ErrorEvent) => tratar(e.error ?? e.message);
    window.addEventListener("unhandledrejection", aoRejeitar);
    window.addEventListener("error", aoErro);
    return () => {
      window.removeEventListener("unhandledrejection", aoRejeitar);
      window.removeEventListener("error", aoErro);
    };
  }, []);
  return null;
}
