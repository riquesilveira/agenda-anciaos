"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";

function FormLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [erro, setErro] = useState(
    params.get("erro") === "sem-perfil" ? "Seu usuário ainda não foi vinculado a uma igreja. Fale com o administrador." : "",
  );
  const [carregando, setCarregando] = useState(false);

  async function entrar(form: FormData) {
    setCarregando(true);
    setErro("");
    const { error } = await supabaseNavegador().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("senha")),
    });
    setCarregando(false);
    if (error) return setErro("E-mail ou senha incorretos.");
    router.replace("/");
    router.refresh();
  }

  return (
    <form action={entrar} className="cartao w-full max-w-sm space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">Agenda dos Anciãos</h1>
        <p className="text-sm text-slate-500">Entre com seu e-mail e senha.</p>
      </div>
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input className="campo" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">Senha</label>
        <input className="campo" id="senha" name="senha" type="password" autoComplete="current-password" required />
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button className="botao w-full" disabled={carregando}>{carregando ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <FormLogin />
      </Suspense>
    </main>
  );
}
