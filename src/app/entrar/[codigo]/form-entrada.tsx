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
  const [quantos, setQuantos] = useState(1); // quantos departamentos a pessoa lidera

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

      <div>
        <label className="rotulo" htmlFor="departamento_0">Qual departamento você lidera?</label>
        <div className="space-y-2">
          {Array.from({ length: quantos }, (_, i) => (
            <select key={i} id={`departamento_${i}`} name="departamento_id" required={i === 0} defaultValue="" className="campo">
              <option value="" disabled={i === 0}>
                {i === 0 ? "Escolha o departamento" : "Outro departamento (opcional)"}
              </option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          ))}
        </div>
        {quantos < 3 && (
          <button type="button" onClick={() => setQuantos((n) => n + 1)} className="mt-1.5 text-sm font-medium text-indigo-700 hover:underline">
            + Lidero outro departamento
          </button>
        )}
      </div>

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
