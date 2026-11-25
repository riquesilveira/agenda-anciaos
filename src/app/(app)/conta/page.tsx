import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
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
    </div>
  );
}
