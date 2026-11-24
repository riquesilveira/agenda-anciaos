import Link from "next/link";
import { CalendarDays, Bell, Users, Plus, LogOut, UserRound } from "lucide-react";
import { exigirPerfil } from "@/lib/sessao";
import { tratamento } from "@/lib/resumo";
import { sair } from "./acoes";

const LINKS = [
  { href: "/", rotulo: "Calendário", icone: CalendarDays },
  { href: "/minhas", rotulo: "Minhas", icone: Bell },
  { href: "/departamentos", rotulo: "Departamentos", icone: Users },
];

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil();

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold text-indigo-700">Agenda dos Anciãos</Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map(({ href, rotulo, icone: Icone }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                <Icone size={16} /> {rotulo}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/conta" className="text-sm text-slate-500 hover:text-indigo-700" title="Minha conta">
              <span className="hidden md:inline">{tratamento(perfil)}</span>
              <UserRound size={18} className="md:hidden" aria-label="Minha conta" />
            </Link>
            <form action={sair}>
              <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Sair" aria-label="Sair">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <Link
        href="/programacoes/nova"
        className="fixed right-4 bottom-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 sm:bottom-6"
        aria-label="Nova programação"
        title="Nova programação"
      >
        <Plus size={26} />
      </Link>

      {/* Navegação inferior no celular */}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-slate-200 bg-white sm:hidden">
        {LINKS.map(({ href, rotulo, icone: Icone }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2 text-xs text-slate-600">
            <Icone size={20} /> {rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}
