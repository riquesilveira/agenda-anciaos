"use client";

import { useRef, useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import { aplicarModelo, MARCADORES, MODELO_SUGERIDO } from "@/lib/escalas";
import { salvarMensagemEscala } from "../../../acoes";

/** Caixa para o líder escrever a mensagem padrão do aviso da escala. */
export function MensagemAviso({
  departamentoId,
  departamento,
  modelo,
  hoje,
  aoSalvar,
}: {
  departamentoId: string;
  departamento: string;
  modelo: string | null;
  hoje: string;
  aoSalvar: (texto: string | null) => void;
}) {
  const [texto, setTexto] = useState(modelo ?? MODELO_SUGERIDO);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const amanha = new Date(new Date(`${hoje}T12:00:00`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const exemplo = aplicarModelo(texto, {
    nome: "Pedro",
    funcao: null,
    departamento,
    hoje,
    dia: { data: amanha, horario: "09:00", titulo: "Culto Divino" },
  });

  function inserir(marcador: string) {
    const el = campo.current;
    if (!el) return setTexto((t) => t + marcador);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    const novo = texto.slice(0, a) + marcador + texto.slice(b);
    setTexto(novo);
    setEstado("");
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marcador.length, a + marcador.length);
    });
  }

  async function salvar(valor: string) {
    setEstado("salvando");
    setErro("");
    const r = await salvarMensagemEscala(departamentoId, valor);
    if (r.erro) {
      setEstado("");
      return setErro(r.erro);
    }
    setEstado("");
    aoSalvar(valor.trim() ? valor.trim() : null);
    setAberto(false); // salvou: fecha a caixa
  }

  return (
    <details
      className="group border-t border-slate-100 pt-3"
      open={aberto}
      onToggle={(e) => setAberto((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800">
        <MessageSquareText size={16} /> Mensagem do aviso
      </summary>
      <div className="space-y-2 pt-2">
        <p className="text-xs text-slate-500">
          É o texto que abre no WhatsApp quando você toca em <b>Avisar</b>. Toque num marcador para incluir.
        </p>
        <textarea
          ref={campo}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setEstado("");
          }}
          rows={5}
          maxLength={1000}
          className="campo resize-y text-sm"
          aria-label="Mensagem do aviso"
        />
        <ul className="space-y-1">
          {MARCADORES.map((m) => (
            <li key={m.chave} className="flex items-start gap-2 text-[11px] leading-snug text-slate-500">
              <button
                type="button"
                onClick={() => inserir(m.chave)}
                title="Incluir na mensagem"
                className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              >
                {m.chave}
              </button>
              <span className="pt-0.5">{m.descricao}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-xs text-emerald-900">
          <p className="mb-0.5 font-semibold">Exemplo:</p>
          <p className="whitespace-pre-wrap">{exemplo}</p>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => salvar(texto)} disabled={estado === "salvando"} className="botao flex-1 py-1.5">
            {estado === "salvo" ? (
              <>
                <Check size={15} /> Salva
              </>
            ) : estado === "salvando" ? (
              "Salvando…"
            ) : (
              "Salvar mensagem"
            )}
          </button>
          {modelo && (
            <button
              type="button"
              onClick={() => {
                setTexto(MODELO_SUGERIDO);
                salvar("");
              }}
              className="text-xs text-slate-500 hover:text-red-600"
            >
              Usar a padrão
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
