"use client";

import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export function FormSenha() {
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
      <div>
        <label className="rotulo" htmlFor="senha">Nova senha</label>
        <input className="campo" id="senha" name="senha" type="password" autoComplete="new-password" required />
      </div>
      <div>
        <label className="rotulo" htmlFor="confirmar">Repita a nova senha</label>
        <input className="campo" id="confirmar" name="confirmar" type="password" autoComplete="new-password" required />
      </div>
      {msg && <p className={`text-sm ${msg.tipo === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.texto}</p>}
      <button className="botao" disabled={enviando}>{enviando ? "Salvando…" : "Trocar senha"}</button>
    </form>
  );
}
