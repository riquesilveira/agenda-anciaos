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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icones/icone-192.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold text-slate-900">Agenda</span>
              <span className="block text-[11px] text-slate-500">dos Anciãos</span>
            </span>
          </Link>
          <NavTopo novidades={novidades ?? 0} />
          <div className="flex items-center gap-3">
            <Link
              href="/conta"
              className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 text-sm text-slate-600 hover:bg-slate-100 md:pr-3"
              title="Minha conta"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {perfil.nome.trim().charAt(0).toUpperCase() || <UserRound size={16} />}
              </span>
              <span className="hidden md:inline">{tratamento(perfil)}</span>
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
