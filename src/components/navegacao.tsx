"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Sparkles, Users } from "lucide-react";

const LINKS = [
  { href: "/", rotulo: "Calendário", curto: "Calendário", icone: CalendarDays },
  { href: "/escalas", rotulo: "Escalas", curto: "Escalas", icone: ClipboardList },
  { href: "/novidades", rotulo: "Novidades", curto: "Novidades", icone: Sparkles },
  { href: "/departamentos", rotulo: "Departamentos", curto: "Deptos", icone: Users },
];

/** Evento, nova programação e "Minhas" contam como "Calendário". */
function estaAtivo(caminho: string, href: string) {
  if (href === "/") return caminho === "/" || caminho.startsWith("/programacoes") || caminho.startsWith("/minhas");
  return caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ n, flutuante }: { n: number; flutuante?: boolean }) {
  if (!n) return null;
  return (
    <span
      className={`rounded-full bg-red-600 px-1.5 text-[10px] leading-4 font-semibold text-white ${
        flutuante ? "absolute -top-1 -right-2.5 ring-2 ring-white" : "ml-0.5"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Menu do topo (telas maiores). */
export function NavTopo({ novidades }: { novidades: number }) {
  const caminho = usePathname();
  return (
    <nav className="hidden gap-1 sm:flex">
      {LINKS.map(({ href, rotulo, icone: Icone }) => {
        const ativo = estaAtivo(caminho, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              ativo ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icone size={16} /> {rotulo}
            {href === "/novidades" && <Contador n={novidades} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barra inferior (celular). */
export function NavInferior({ novidades }: { novidades: number }) {
  const caminho = usePathname();
  return (
    <nav
      className="nav-inferior fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white/95 shadow-[0_-2px_10px_rgba(15,23,42,0.06)] backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LINKS.map(({ href, curto, icone: Icone }) => {
        const ativo = estaAtivo(caminho, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1 pt-2 pb-2.5 text-[11px] transition-colors ${
              ativo ? "font-semibold text-indigo-700" : "text-slate-500 active:text-slate-800"
            }`}
          >
            {/* tracinho em cima da aba ativa */}
            <span
              className={`absolute top-0 h-0.5 w-10 rounded-full transition-colors ${ativo ? "bg-indigo-600" : "bg-transparent"}`}
            />
            <span
              className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                ativo ? "bg-indigo-100" : ""
              }`}
            >
              <Icone size={22} strokeWidth={ativo ? 2.4 : 2} />
              {href === "/novidades" && <Contador n={novidades} flutuante />}
            </span>
            {curto}
          </Link>
        );
      })}
    </nav>
  );
}
