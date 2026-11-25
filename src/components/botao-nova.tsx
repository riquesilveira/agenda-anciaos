"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

// O "+" flutuante só faz sentido nas telas de agenda; em Departamentos ele
// confundia com o "Convidar líder".
const TELAS_COM_BOTAO = ["/", "/minhas", "/novidades"];

export function BotaoNova() {
  const caminho = usePathname();
  if (!TELAS_COM_BOTAO.includes(caminho)) return null;
  return (
    <Link
      href="/programacoes/nova"
      className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 sm:bottom-6"
      aria-label="Nova programação"
      title="Nova programação"
    >
      <Plus size={26} />
    </Link>
  );
}
