import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** "← Voltar ao calendário" no topo das páginas internas. */
export function Voltar({ href, rotulo = "Voltar ao calendário" }: { href: string; rotulo?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-indigo-700 hover:underline">
      <ArrowLeft size={16} /> {rotulo}
    </Link>
  );
}
