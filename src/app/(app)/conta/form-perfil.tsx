"use client";

import { startTransition, useActionState } from "react";
import { CORES_PESSOA, type CorPessoa } from "@/lib/pregacao";
import type { Perfil } from "@/lib/tipos";
import { salvarMeuPerfil } from "../acoes";

export function FormPerfil({ perfil, comoAparece }: { perfil: Perfil; comoAparece: string }) {
  const [estado, acao, salvando] = useActionState(salvarMeuPerfil, {});
  const padrao = perfil.papel === "pastor" ? "Pastor" : perfil.papel === "anciao" ? "Ancião" : "Ex: Irmã, Diácono…";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="cartao space-y-4"
    >
      <h2 className="font-semibold">Meus dados</h2>
      <div>
        <label className="rotulo" htmlFor="nome">Nome</label>
        <input className="campo" id="nome" name="nome" required defaultValue={perfil.nome} />
      </div>
      <div>
        <label className="rotulo" htmlFor="tratamento">Como quer ser chamado(a) nos resumos</label>
        <input className="campo" id="tratamento" name="tratamento" defaultValue={perfil.tratamento ?? ""} placeholder={padrao} />
        <p className="mt-1 text-xs text-slate-500">Hoje aparece como: {comoAparece}</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="whatsapp">Seu WhatsApp</label>
        <input className="campo" id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={perfil.whatsapp ?? ""} />
      </div>
      <fieldset>
        <legend className="rotulo">Sua cor na escala</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CORES_PESSOA) as CorPessoa[]).map((c) => (
            <label key={c} className="cursor-pointer" title={CORES_PESSOA[c].nome}>
              <input type="radio" name="cor" value={c} defaultChecked={perfil.cor === c} className="peer sr-only" />
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 ${CORES_PESSOA[c].classe}`}
              >
                {perfil.nome.trim().charAt(0).toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        {!salvando && estado.ok && <span className="text-sm text-emerald-700">✅ Dados salvos</span>}
        {!salvando && estado.erro && <span className="text-sm text-red-600">{estado.erro}</span>}
      </div>
    </form>
  );
}
