"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { BotaoGoogle } from "@/components/botao-google";
import { completarEntradaGoogle, entrarPeloLink } from "./acoes";

export function FormEntrada({
  codigo,
  departamentos,
  google,
  contaGoogle,
}: {
  codigo: string;
  departamentos: { id: string; nome: string; sigla: string | null }[];
  /** Mostrar "Continuar com Google" (quando está ligado no Supabase). */
  google: boolean;
  /** Já voltou do Google: falta só nome e departamento. */
  contaGoogle?: { nome: string; email: string } | null;
}) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // Departamentos a mais (além do primeiro), cada um com um "X" para tirar.
  const [extras, setExtras] = useState<number[]>([]);
  const opcoes = departamentos.map((d) => (
    <option key={d.id} value={d.id}>
      {d.nome}
    </option>
  ));

  return (
    <form
      // onSubmit (e não action=) para o React não limpar os campos se der erro
      onSubmit={async (e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        setEnviando(true);
        setErro("");
        const r = contaGoogle
          ? await completarEntradaGoogle(codigo, dados)
          : await entrarPeloLink(codigo, dados);
        if (!r.ok) {
          setEnviando(false);
          return setErro(r.erro ?? "Não foi possível entrar.");
        }
        if (contaGoogle) return window.location.assign("/escalas");
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
      {contaGoogle ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Entrando com o Google como <b>{contaGoogle.email}</b>. Falta só isto:
        </p>
      ) : (
        google && (
          <>
            <BotaoGoogle proximo={`/entrar/${codigo}`} />
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> ou preencha{" "}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )
      )}
      <div>
        <label className="rotulo" htmlFor="nome">
          Seu nome
        </label>
        <input
          className="campo"
          id="nome"
          name="nome"
          required
          autoComplete="name"
          placeholder="Ex: Roberto Silva"
          defaultValue={contaGoogle?.nome}
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="departamento_0">
          Qual departamento você lidera?
        </label>
        <div className="space-y-2">
          <select id="departamento_0" name="departamento_id" required defaultValue="" className="campo">
            <option value="" disabled>
              Escolha o departamento
            </option>
            {opcoes}
          </select>
          {extras.map((chave) => (
            <div key={chave} className="flex items-center gap-2">
              <select name="departamento_id" defaultValue="" className="campo" aria-label="Outro departamento">
                <option value="">Outro departamento</option>
                {opcoes}
              </select>
              <button
                type="button"
                onClick={() => setExtras((l) => l.filter((x) => x !== chave))}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remover este departamento"
                title="Remover"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
        {extras.length < 3 && (
          <button
            type="button"
            onClick={() => setExtras((l) => [...l, Date.now()])}
            className="mt-1.5 text-sm font-medium text-indigo-700 hover:underline"
          >
            + Lidero outro departamento
          </button>
        )}
      </div>

      <div>
        <label className="rotulo" htmlFor="whatsapp">
          WhatsApp{" "}
          <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <input
          className="campo"
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(43) 99999-9999"
        />
      </div>
      {!contaGoogle && (
        <>
          <div>
            <label className="rotulo" htmlFor="email">
              E-mail
            </label>
            <input
              className="campo"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="senha">
              Crie uma senha
            </label>
            <CampoSenha id="senha" name="senha" autoComplete="new-password" />
            <p className="mt-1 text-xs text-slate-500">
              Pelo menos 6 caracteres.
            </p>
          </div>
        </>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button className="botao w-full py-2.5" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
