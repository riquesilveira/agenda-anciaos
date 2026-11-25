"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BotaoGoogle } from "@/components/botao-google";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const ERROS: Record<string, string> = {
  "sem-perfil": "Seu usuário ainda não foi vinculado a uma igreja. Fale com o administrador.",
  "sem-acesso": "Esta conta Google ainda não tem acesso. Peça ao seu líder ou ancião o link de entrada da sua igreja.",
  google: "Não foi possível entrar com o Google. Tente de novo.",
};

export function FormLogin({ google }: { google: boolean }) {
  const params = useSearchParams();
  const [erro, setErro] = useState(ERROS[params.get("erro") ?? ""] ?? "");
  const [carregando, setCarregando] = useState(false);

  async function entrar(form: FormData) {
    setCarregando(true);
    setErro("");
    const email = String(form.get("email")).trim();
    const senha = String(form.get("senha"));
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email, password: senha });
    if (error) {
      setCarregando(false);
      return setErro("E-mail ou senha incorretos.");
    }
    // Pede ao navegador para salvar a senha (Chrome/Edge/Android). Onde não
    // existir, a navegação completa abaixo deixa o Safari/Firefox perceberem
    // o login e oferecerem "Salvar senha".
    try {
      const Credencial = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string }) => Credential })
        .PasswordCredential;
      if (Credencial && navigator.credentials) await navigator.credentials.store(new Credencial({ id: email, password: senha }));
    } catch {
      // usuário recusou ou navegador não suporta: segue o login normalmente
    }
    window.location.assign("/");
  }

  return (
    <form
      // onSubmit (e não action=) para o React não limpar o e-mail após senha errada
      onSubmit={(e) => {
        e.preventDefault();
        entrar(new FormData(e.currentTarget));
      }}
      className="cartao w-full max-w-sm space-y-4 p-6"
    >
      <div className="flex flex-col items-center gap-2 pb-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icones/icone-192.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl shadow-sm" />
        <h1 className="text-xl font-bold"><span className="text-indigo-700">IASD</span> Agenda</h1>
        <p className="text-sm text-slate-500">Entre com seu e-mail e senha.</p>
      </div>
      {google && (
        <>
          <BotaoGoogle />
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input className="campo" id="email" name="email" type="email" autoComplete="username" inputMode="email" required />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <CampoSenha id="senha" name="senha" autoComplete="current-password" />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button className="botao w-full" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
