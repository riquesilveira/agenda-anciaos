"use client";

import { useState } from "react";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { entrarPeloLink } from "./acoes";

export function FormEntrada({
  codigo,
  departamentos,
}: {
  codigo: string;
  departamentos: { id: string; nome: string; sigla: string | null }[];
}) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <form
      // onSubmit (e não action=) para o React não limpar os campos se der erro
      onSubmit={async (e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        setEnviando(true);
        setErro("");
        const r = await entrarPeloLink(codigo, dados);
        if (!r.ok) {
          setEnviando(false);
          return setErro(r.erro ?? "Não foi possível entrar.");
        }
        const { error } = await supabaseNavegador().auth.signInWithPassword({
          email: String(dados.get("email")).trim().toLowerCase(),
          password: String(dados.get("senha")),
        });
        if (error) {
          setEnviando(false);
          return setErro("Conta criada! Agora entre pela tela de login.");
        }
        window.location.assign("/escalas");
      }}
      className="cartao space-y-4"
    >
      <div>
        <label className="rotulo" htmlFor="nome">Seu nome</label>
        <input className="campo" id="nome" name="nome" required autoComplete="name" placeholder="Ex: Roberto Silva" />
      </div>

      <fieldset>
        <legend className="rotulo">Qual departamento você lidera?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {departamentos.map((d) => (
            <label
              key={d.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50"
            >
              <input type="checkbox" name="departamento_id" value={d.id} className="h-4 w-4 accent-indigo-600" />
              {d.nome}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Pode marcar mais de um.</p>
      </fieldset>

      <div>
        <label className="rotulo" htmlFor="whatsapp">WhatsApp <span className="font-normal text-slate-400">(opcional)</span></label>
        <input className="campo" id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" placeholder="(43) 99999-9999" />
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input className="campo" id="email" name="email" type="email" required autoComplete="email" autoCapitalize="none" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Crie uma senha</label>
        <CampoSenha id="senha" name="senha" autoComplete="new-password" />
        <p className="mt-1 text-xs text-slate-500">Pelo menos 6 caracteres.</p>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button className="botao w-full py-2.5" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
