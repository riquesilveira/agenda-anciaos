import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { BotaoNova } from "@/components/botao-nova";
import { NavInferior, NavTopo } from "@/components/navegacao";
import { exigirPerfil } from "@/lib/sessao";
import { tratamento } from "@/lib/resumo";
import { sair } from "./acoes";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { supabase, perfil } = await exigirPerfil();
  // Contador de "Novidades": cadastradas por outros desde a última visita.
  const { count: novidades } = await supabase
    .from("programacoes")
    .select("id", { count: "exact", head: true })
    .gt("created_at", perfil.novidades_vistas_em)
    .neq("criado_por", perfil.id)
    .not("criado_por", "is", null);

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold text-indigo-700">Agenda dos Anciãos</Link>
          <NavTopo novidades={novidades ?? 0} />
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
      <AtivarNotificacoes modo="aviso" />

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <BotaoNova />

      {/* Navegação inferior no celular */}
      <NavInferior novidades={novidades ?? 0} />
    </div>
  );
}
