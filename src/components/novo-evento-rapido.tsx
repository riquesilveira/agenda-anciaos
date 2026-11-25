"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, AlignLeft, ArrowRight, CalendarDays, Clock, Landmark, Users, X } from "lucide-react";
import { salvarProgramacao, type EstadoFormProgramacao } from "@/app/(app)/acoes";
import { dataLonga, horaCurta, maiuscula, periodoCurto } from "@/lib/datas";
import { ORIGENS, type Departamento, type Origem } from "@/lib/tipos";

const LARGURA = 336;

/**
 * Cadastro rápido (computador): clicar num dia do calendário abre este cartão
 * ao lado do dia. As células marcam o dia com data-novo-dia="yyyy-MM-dd".
 * Usa a mesma ação do formulário completo (conflito continua sendo só aviso).
 */
export function NovoEventoRapido({ departamentos, soLocal }: { departamentos: Departamento[]; soLocal: boolean }) {
  const [aberto, setAberto] = useState<{ data: string; x: number; y: number } | null>(null);
  const [diaTodo, setDiaTodo] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoFormProgramacao, FormData>(salvarProgramacao, {});
  const [chave, setChave] = useState(0); // recria o formulário a cada abertura
  const confirmar = useRef<HTMLInputElement>(null);
  const cartao = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const alvo = e.target as HTMLElement;
      if (cartao.current?.contains(alvo)) return;
      const celula = alvo.closest<HTMLElement>("[data-novo-dia]");
      // Clique em evento (link) segue para o evento; no celular o dia abre a lista.
      if (!celula || alvo.closest("a") || !window.matchMedia("(min-width: 640px)").matches) {
        if (aberto && !alvo.closest("[data-novo-dia]")) setAberto(null);
        return;
      }
      const r = celula.getBoundingClientRect();
      const direita = r.right + 8 + LARGURA < window.innerWidth;
      const x = direita ? r.right + 8 : Math.max(8, r.left - 8 - LARGURA);
      const y = Math.max(72, Math.min(r.top, window.innerHeight - 520));
      setAberto({ data: celula.dataset.novoDia!, x, y });
      setDiaTodo(false);
      setChave((k) => k + 1);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(null);
    }
    document.addEventListener("click", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("click", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (!aberto) return null;
  const campo =
    "flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100";

  return (
    <div
      ref={cartao}
      role="dialog"
      aria-label="Nova programação"
      style={{ left: aberto.x, top: aberto.y, width: LARGURA }}
      className="fixed z-40 rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Nova programação</h2>
        <button type="button" onClick={() => setAberto(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
          <X size={18} />
        </button>
      </div>
      <form
        key={chave}
        onSubmit={(e) => {
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          startTransition(() => acao(dados));
        }}
        onChange={() => confirmar.current && (confirmar.current.value = "")}
        className="space-y-2.5 p-4"
      >
        <input type="hidden" name="confirmar" ref={confirmar} defaultValue="" />
        <input
          name="titulo"
          required
          autoFocus
          placeholder="Nome da programação"
          className="w-full rounded-lg border border-indigo-500 px-3 py-2 text-sm ring-2 ring-indigo-100 outline-none"
        />
        <label className={campo}>
          <CalendarDays size={17} className="shrink-0 text-slate-500" />
          <span className="sr-only">Data</span>
          <input
            name="data"
            type="date"
            required
            defaultValue={aberto.data}
            className="min-w-0 flex-1 bg-transparent outline-none"
            title={maiuscula(dataLonga(aberto.data))}
          />
        </label>
        {!diaTodo && (
          <div className="flex items-center gap-2">
            <label className={`${campo} min-w-0 px-2.5`}>
              <Clock size={16} className="shrink-0 text-slate-500" />
              <span className="sr-only">Início</span>
              <input name="hora_inicio" type="time" className="w-full min-w-0 bg-transparent outline-none" />
            </label>
            <ArrowRight size={16} className="shrink-0 text-slate-400" />
            <label className={`${campo} min-w-0 px-2.5`}>
              <Clock size={16} className="shrink-0 text-slate-500" />
              <span className="sr-only">Término</span>
              <input name="hora_fim" type="time" className="w-full min-w-0 bg-transparent outline-none" />
            </label>
          </div>
        )}
        <label className="flex items-center gap-2 px-0.5 text-sm text-slate-700">
          <input type="checkbox" checked={diaTodo} onChange={(e) => setDiaTodo(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
          Dia todo
        </label>
        {soLocal ? (
          <input type="hidden" name="origem" value="local" />
        ) : (
          <label className={campo}>
            <Landmark size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Origem</span>
            <select name="origem" defaultValue="local" className="min-w-0 flex-1 bg-transparent outline-none">
              {(Object.keys(ORIGENS) as Origem[]).map((o) => (
                <option key={o} value={o}>
                  {o === "local" ? "Igreja local" : ORIGENS[o].nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={campo}>
          <Users size={16} className="shrink-0 text-slate-500" />
          <span className="sr-only">Departamento</span>
          <select
            name="departamento_id"
            required={soLocal}
            defaultValue={soLocal && departamentos.length === 1 ? departamentos[0].id : ""}
            className="min-w-0 flex-1 bg-transparent outline-none"
          >
            <option value="">{soLocal ? "Departamento" : "Igreja toda / sem departamento"}</option>
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </label>
        <label className={`${campo} items-start`}>
          <AlignLeft size={16} className="mt-0.5 shrink-0 text-slate-500" />
          <span className="sr-only">Descrição</span>
          <textarea name="descricao" rows={2} placeholder="Descrição" className="min-w-0 flex-1 resize-none bg-transparent outline-none" />
        </label>

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        {estado.conflitos && estado.conflitos.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <AlertTriangle size={14} /> Possível conflito
            </p>
            <ul className="mb-2 list-disc space-y-0.5 pl-4">
              {estado.conflitos.map((c) => (
                <li key={c.programacao.id + c.motivo}>
                  {c.mensagem} ({periodoCurto(c.programacao)}
                  {c.programacao.hora_inicio && ` ${horaCurta(c.programacao.hora_inicio)}`})
                </li>
              ))}
            </ul>
            <button
              type="submit"
              disabled={enviando}
              onClick={() => confirmar.current && (confirmar.current.value = "1")}
              className="botao bg-amber-600 px-3 py-1.5 text-xs hover:bg-amber-700"
            >
              Salvar mesmo assim
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link href={`/programacoes/nova?data=${aberto.data}`} className="text-xs font-medium text-slate-500 hover:text-indigo-700">
            Mais opções
          </Link>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAberto(null)} className="botao-secundario px-3.5 py-1.5">
              Cancelar
            </button>
            <button disabled={enviando} className="botao px-4 py-1.5">
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
