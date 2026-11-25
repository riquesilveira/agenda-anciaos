"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { hojeISO } from "@/lib/datas";

// O "+" flutuante só faz sentido nas telas de agenda; em Departamentos ele
// confundia com o "Convidar líder".
const TELAS_COM_BOTAO = ["/", "/minhas", "/novidades"];

export function BotaoNova() {
  const caminho = usePathname();
  const params = useSearchParams();
  if (!TELAS_COM_BOTAO.includes(caminho)) return null;
  // Com um dia selecionado no calendário, a nova programação já vem com essa data.
  const dia = params.get("dia");
  const href = dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? `/programacoes/nova?data=${dia}` : "/programacoes/nova";
  return (
    <Link
      href={href}
      onClick={(e) => {
        // No calendário, abre o mesmo cadastro de quando se toca no dia.
        if (caminho === "/" && document.body.dataset.cadastroRapido) {
          e.preventDefault();
          e.stopPropagation();
          document.dispatchEvent(new CustomEvent("nova-programacao", { detail: { data: dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hojeISO() } }));
        }
      }}
      className={`fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 sm:bottom-6 ${caminho === "/" ? "lg:hidden" : ""}`}
      aria-label="Nova programação"
      title="Nova programação"
    >
      <Plus size={26} />
    </Link>
  );
}
