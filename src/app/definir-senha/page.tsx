"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Etapa = "verificando" | "senha" | "invalido";

function DefinirSenha() {
  const params = useSearchParams();
  const [etapa, setEtapa] = useState<Etapa>("verificando");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const jaVerificou = useRef(false);

  // O link é de uso único: validamos no navegador (o preview do WhatsApp não
  // executa JavaScript, então não "gasta" o link).
  useEffect(() => {
    if (jaVerificou.current) return;
    jaVerificou.current = true;
    const tokenHash = params.get("token_hash");
    const tipo = params.get("type") === "recovery" ? "recovery" : "invite";
    if (!tokenHash) return setEtapa("invalido");
    supabaseNavegador()
      .auth.verifyOtp({ token_hash: tokenHash, type: tipo })
      .then(({ data, error }) => {
        if (error || !data.user) return setEtapa("invalido");
        setEmail(data.user.email ?? "");
        setEtapa("senha");
      });
  }, [params]);

  async function salvar(form: HTMLFormElement) {
    const dados = new FormData(form);
    const senha = String(dados.get("senha"));
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== String(dados.get("confirmar"))) return setErro("As senhas não são iguais.");
    setSalvando(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro("Não foi possível salvar a senha. Tente outra.");
    }
    try {
      const Credencial = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string }) => Credential })
        .PasswordCredential;
      if (Credencial && navigator.credentials) await navigator.credentials.store(new Credencial({ id: email, password: senha }));
    } catch {}
    window.location.assign("/");
  }

  if (etapa === "verificando") return <p className="cartao text-sm text-slate-500">Verificando o convite…</p>;

  if (etapa === "invalido") {
    return (
      <div className="cartao max-w-sm space-y-2">
        <h1 className="text-lg font-semibold">Link expirado ou já usado</h1>
        <p className="text-sm text-slate-600">
          Peça a um ancião um novo convite. Ele gera outro link na tela Departamentos.
        </p>
        <a href="/login" className="text-sm text-indigo-700 hover:underline">Ir para o login</a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar(e.currentTarget);
      }}
      className="cartao w-full max-w-sm space-y-4 p-6"
    >
      <div>
        <h1 className="text-xl font-semibold">Bem-vindo(a) à IASD Agenda</h1>
        <p className="text-sm text-slate-500">Crie sua senha para entrar.</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input className="campo bg-slate-50" id="email" name="username" autoComplete="username" value={email} readOnly />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <CampoSenha id="senha" name="senha" autoComplete="new-password" />
      </div>
      <div>
        <label className="rotulo" htmlFor="confirmar">Repita a senha</label>
        <CampoSenha id="confirmar" name="confirmar" autoComplete="new-password" />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button className="botao w-full" disabled={salvando}>{salvando ? "Salvando…" : "Criar senha e entrar"}</button>
    </form>
  );
}

export default function PaginaDefinirSenha() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <DefinirSenha />
      </Suspense>
    </main>
  );
}
