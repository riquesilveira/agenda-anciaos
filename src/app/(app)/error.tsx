"use client";

import { useEffect } from "react";
import { ehVersaoAntiga, recarregarUmaVez } from "@/components/versao-nova";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (ehVersaoAntiga(error)) recarregarUmaVez();
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-3 py-10 text-center">
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="text-sm text-slate-600">
        Pode ter sido uma atualização do sistema. Tente de novo; se continuar, feche e abra a Agenda.
      </p>
      <div className="flex justify-center gap-2">
        <button className="botao" onClick={() => reset()}>Tentar de novo</button>
        <button className="botao-secundario" onClick={() => window.location.reload()}>Recarregar a página</button>
      </div>
    </div>
  );
}
