"use client";

/** Botão de submit que pede confirmação antes (ex: excluir). */
export function BotaoConfirmar({ mensagem, children, className }: { mensagem: string; children: React.ReactNode; className?: string }) {
  return (
    <button className={className} onClick={(e) => !confirm(mensagem) && e.preventDefault()}>
      {children}
    </button>
  );
}
