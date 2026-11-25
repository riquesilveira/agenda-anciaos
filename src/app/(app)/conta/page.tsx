import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { LogOut } from "lucide-react";
import { sair } from "../acoes";
import { FormPerfil } from "./form-perfil";
import { FormSenha } from "./form-senha";

export default async function MinhaConta() {
  const { perfil } = await exigirPerfil();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Minha conta</h1>
        <p className="text-sm text-slate-500">{perfil.email}</p>
      </div>

      <FormPerfil perfil={perfil} comoAparece={tratamento(perfil)} />

      <AtivarNotificacoes modo="conta" />

      <FormSenha email={perfil.email} />

      <form action={sair} className="cartao flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Sair da conta</h2>
          <p className="text-sm text-slate-500">Desconecta você deste aparelho.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          <LogOut size={16} /> Sair
        </button>
      </form>
    </div>
  );
}
