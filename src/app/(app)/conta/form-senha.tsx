"use client";

import { useState } from "react";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export function FormSenha({ email }: { email: string }) {
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function trocar(form: HTMLFormElement) {
    const dados = new FormData(form);
    const senha = String(dados.get("senha"));
    if (senha.length < 8) return setMsg({ tipo: "erro", texto: "A senha precisa ter pelo menos 8 caracteres." });
    if (senha !== String(dados.get("confirmar"))) return setMsg({ tipo: "erro", texto: "As senhas não são iguais." });
    setEnviando(true);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setMsg({ tipo: "erro", texto: "Não foi possível trocar a senha. Tente outra." });
    form.reset();
    setMsg({ tipo: "ok", texto: "Senha trocada." });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        trocar(e.currentTarget);
      }}
      className="cartao space-y-4"
    >
      <h2 className="font-semibold">Trocar senha</h2>
      {/* Diz ao gerenciador de senhas de qual conta é a senha nova */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
      <div>
        <label className="rotulo" htmlFor="senha">Nova senha</label>
        <CampoSenha id="senha" name="senha" autoComplete="new-password" />
      </div>
      <div>
        <label className="rotulo" htmlFor="confirmar">Repita a nova senha</label>
        <CampoSenha id="confirmar" name="confirmar" autoComplete="new-password" />
      </div>
      {msg && <p className={`text-sm ${msg.tipo === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.texto}</p>}
      <button className="botao" disabled={enviando}>{enviando ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}
