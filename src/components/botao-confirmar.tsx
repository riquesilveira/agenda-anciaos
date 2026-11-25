"use client";

/** Botão de submit que pede confirmação antes (ex: excluir). */
export function BotaoConfirmar({
  mensagem,
  children,
  className,
  rotulo,
}: {
  mensagem: string;
  children: React.ReactNode;
  className?: string;
  /** Texto para leitores de tela e dica ao passar o mouse (botões só com ícone). */
  rotulo?: string;
}) {
  return (
    <button
      className={className}
      aria-label={rotulo}
      title={rotulo}
      onClick={(e) => !confirm(mensagem) && e.preventDefault()}
    >
      {children}
    </button>
  );
}
