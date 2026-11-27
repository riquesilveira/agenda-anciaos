"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BotaoGoogle } from "@/components/botao-google";
import { CampoSenha } from "@/components/campo-senha";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { completarEntradaGoogle, entrarPeloLink } from "./acoes";
import type { IgrejaParaEntrada } from "./dados";

export function FormEntrada({
  igrejas,
  igrejaInicial,
  google,
  contaGoogle,
}: {
  igrejas: IgrejaParaEntrada[];
  igrejaInicial?: string | null;
  /** Mostrar "Continuar com Google" (quando está ligado no Supabase). */
  google: boolean;
  /** Já voltou do Google: falta só igreja, nome e departamento. */
  contaGoogle?: { nome: string; email: string } | null;
}) {
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [igrejaId, setIgrejaId] = useState(
    igrejaInicial && igrejas.some((i) => i.id === igrejaInicial)
      ? igrejaInicial
      : igrejas.length === 1
        ? igrejas[0].id
        : "",
  );
  // Departamentos a mais (além do primeiro), cada um com um "X" para tirar.
  const [extras, setExtras] = useState<number[]>([]);
  const [papel, setPapel] = useState<"lider" | "anciao">("lider");
  const departamentos =
    igrejas.find((i) => i.id === igrejaId)?.departamentos ?? [];
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
          ? await completarEntradaGoogle(dados)
          : await entrarPeloLink(dados);
        if (!r.ok) {
          setEnviando(false);
          return setErro(r.erro ?? "Não foi possível entrar.");
        }
        if (contaGoogle)
          return window.location.assign(papel === "anciao" ? "/" : "/escalas");
        const { error } = await supabaseNavegador().auth.signInWithPassword({
          email: String(dados.get("email")).trim().toLowerCase(),
          password: String(dados.get("senha")),
        });
        if (error) {
          setEnviando(false);
          return setErro("Conta criada! Agora entre pela tela de login.");
        }
        window.location.assign(papel === "anciao" ? "/" : "/escalas");
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
            <BotaoGoogle proximo="/entrar" />
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
        <label className="rotulo" htmlFor="igreja_id">
          Sua igreja
        </label>
        <select
          id="igreja_id"
          name="igreja_id"
          required
          value={igrejaId}
          onChange={(e) => {
            setIgrejaId(e.target.value);
            setExtras([]);
          }}
          className="campo"
        >
          <option value="" disabled>
            Escolha a igreja
          </option>
          {igrejas.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="rotulo">Você é</legend>
        <input type="hidden" name="papel" value={papel} />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["lider", "Líder de departamento"],
              ["anciao", "Ancião"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setPapel(valor)}
              aria-pressed={papel === valor}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                papel === valor
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-4 ring-indigo-500/15"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {papel === "anciao" && (
          <p className="mt-1.5 text-xs text-slate-500">
            Se a igreja já tem ancião ou pastor no sistema, um deles aprova o
            seu acesso de ancião. Até lá, você entra com acesso de líder.
          </p>
        )}
      </fieldset>

      {papel === "lider" && (
        <div>
          <label className="rotulo" htmlFor="departamento_0">
            Qual departamento você lidera?
          </label>
          <div className="space-y-2">
            <select
              key={igrejaId}
              id="departamento_0"
              name="departamento_id"
              required
              disabled={!igrejaId}
              defaultValue=""
              className="campo"
            >
              <option value="" disabled>
                {igrejaId
                  ? "Escolha o departamento"
                  : "Escolha primeiro a igreja"}
              </option>
              {opcoes}
            </select>
            {extras.map((chave) => (
              <div
                key={`${igrejaId}-${chave}`}
                className="flex items-center gap-2"
              >
                <select
                  name="departamento_id"
                  defaultValue=""
                  className="campo"
                  aria-label="Outro departamento"
                >
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
          {igrejaId && extras.length < 3 && (
            <button
              type="button"
              onClick={() => setExtras((l) => [...l, Date.now()])}
              className="mt-1.5 text-sm font-medium text-indigo-700 hover:underline"
            >
              + Lidero outro departamento
            </button>
          )}
        </div>
      )}

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
