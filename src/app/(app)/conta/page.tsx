import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { salvarMeuPerfil } from "../acoes";
import { FormSenha } from "./form-senha";

export default async function MinhaConta() {
  const { perfil } = await exigirPerfil();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Minha conta</h1>
        <p className="text-sm text-slate-500">{perfil.email}</p>
      </div>

      <form action={salvarMeuPerfil} className="cartao space-y-4">
        <h2 className="font-semibold">Meus dados</h2>
        <div>
          <label className="rotulo" htmlFor="nome">Nome</label>
          <input className="campo" id="nome" name="nome" required defaultValue={perfil.nome} />
        </div>
        <div>
          <label className="rotulo" htmlFor="tratamento">Como quer ser chamado(a) nos resumos</label>
          <input
            className="campo"
            id="tratamento"
            name="tratamento"
            defaultValue={perfil.tratamento ?? ""}
            placeholder={perfil.papel === "pastor" ? "Pastor" : "Ancião"}
          />
          <p className="mt-1 text-xs text-slate-500">Hoje aparece como: {tratamento(perfil)}</p>
        </div>
        <div>
          <label className="rotulo" htmlFor="whatsapp">Seu WhatsApp</label>
          <input className="campo" id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={perfil.whatsapp ?? ""} />
        </div>
        <button className="botao">Salvar</button>
      </form>

      <FormSenha />
    </div>
  );
}
