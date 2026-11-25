"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlignLeft, Church, Mic, X } from "lucide-react";
import { definirPregador, type EstadoPregacao } from "@/app/(app)/acoes";
import { dataLonga, maiuscula } from "@/lib/datas";
import { CULTOS } from "@/lib/pregacao";
import type { CultoPregacao } from "@/lib/tipos";

const LARGURA = 336;

export interface PregacaoDoDia {
  data: string;
  culto: CultoPregacao;
  pregador_nome: string | null;
  observacoes: string | null;
  titulo: string | null;
  meu: boolean;
  responsavel: string | null;
}

/**
 * Cadastro rápido do pregador: clicar num dia da grade (data-pregacao-dia)
 * abre este cartão ao lado do dia. Culto fixo do dia já vem escolhido; nos
 * outros dias é um culto especial com nome.
 */
export function NovoPregadorRapido({ existentes }: { existentes: PregacaoDoDia[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState<{ data: string; x: number; y: number } | null>(null);
  const [culto, setCulto] = useState<CultoPregacao>("especial");
  const [chave, setChave] = useState(0);
  const [estado, acao, salvando] = useActionState<EstadoPregacao, FormData>(definirPregador, {});
  const cartao = useRef<HTMLDivElement>(null);

  const opcoesDoDia = (data: string): CultoPregacao[] => {
    const dow = new Date(`${data}T12:00:00`).getDay();
    const fixos = (Object.keys(CULTOS) as CultoPregacao[]).filter((c) => CULTOS[c].diaDaSemana === dow);
    return [...fixos, "especial"];
  };
  const existente = aberto ? existentes.find((e) => e.data === aberto.data && e.culto === culto) : undefined;

  useEffect(() => {
    if (estado.ok) {
      setAberto(null);
      router.refresh();
    }
  }, [estado, router]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const alvo = e.target as HTMLElement;
      if (cartao.current?.contains(alvo)) return;
      const celula = alvo.closest<HTMLElement>("[data-pregacao-dia]");
      if (!celula || alvo.closest("a")) {
        if (aberto && !celula) setAberto(null);
        return;
      }
      const r = celula.getBoundingClientRect();
      const largura = Math.min(LARGURA, window.innerWidth - 16);
      let x = r.right + 8 + largura < window.innerWidth ? r.right + 8 : r.left - 8 - largura;
      x = Math.max(8, Math.min(x, window.innerWidth - largura - 8));
      const y = Math.max(72, Math.min(r.top, window.innerHeight - 470));
      const data = celula.dataset.pregacaoDia!;
      const opcoes = opcoesDoDia(data);
      // Sugere o culto do dia que ainda não tem pregador (senão, o primeiro).
      const livre = opcoes.find((c) => !existentes.some((x) => x.data === data && x.culto === c && x.pregador_nome));
      setCulto(livre ?? opcoes[0]);
      setAberto({ data, x, y });
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
  }, [aberto, existentes]);

  if (!aberto) return null;
  const campo =
    "flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs transition hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15";
  const deOutro = existente && !existente.meu;

  return (
    <div
      ref={cartao}
      role="dialog"
      aria-label="Pregador"
      style={{ left: aberto.x, top: aberto.y, width: Math.min(LARGURA, typeof window !== "undefined" ? window.innerWidth - 16 : LARGURA) }}
      className="fixed z-40 rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-900">Pregador</h2>
          <p className="text-xs text-slate-500">{maiuscula(dataLonga(aberto.data))}</p>
        </div>
        <button type="button" onClick={() => setAberto(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
          <X size={18} />
        </button>
      </div>
      <form
        key={`${chave}-${culto}`}
        onSubmit={(e) => {
          e.preventDefault();
          const dados = new FormData(e.currentTarget);
          startTransition(() => acao(dados));
        }}
        className="space-y-2.5 p-4"
      >
        <input type="hidden" name="data" value={aberto.data} />
        <label className={campo}>
          <Church size={16} className="shrink-0 text-slate-500" />
          <span className="sr-only">Culto</span>
          <select
            name="culto"
            value={culto}
            onChange={(e) => setCulto(e.target.value as CultoPregacao)}
            className="min-w-0 flex-1 cursor-pointer bg-transparent pr-6 outline-none [background-position:right_0_center]"
          >
            {opcoesDoDia(aberto.data).map((c) => (
              <option key={c} value={c}>
                {CULTOS[c].nome}
              </option>
            ))}
          </select>
        </label>
        {culto === "especial" && (
          <input
            name="titulo"
            required
            maxLength={80}
            defaultValue={existente?.titulo ?? ""}
            placeholder="Nome do culto (ex: Semana de Oração)"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm shadow-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        )}
        {deOutro ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Este culto é de <b>{existente.responsavel ?? "outro ancião"}</b>
            {existente.pregador_nome ? (
              <>
                {" "}
                · pregador: <b>{existente.pregador_nome}</b>
              </>
            ) : null}
            . Só ele pode mudar.
          </p>
        ) : (
          <>
            <label className={`${campo} border-indigo-500 ring-4 ring-indigo-500/15`}>
              <Mic size={16} className="shrink-0 text-slate-500" />
              <span className="sr-only">Nome do pregador</span>
              <input
                name="pregador_nome"
                autoFocus={culto !== "especial"}
                defaultValue={existente?.pregador_nome ?? ""}
                placeholder="Nome do pregador"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
            <label className={`${campo} items-start`}>
              <AlignLeft size={16} className="mt-0.5 shrink-0 text-slate-500" />
              <span className="sr-only">Observação</span>
              <textarea
                name="observacoes"
                rows={2}
                defaultValue={existente?.observacoes ?? ""}
                placeholder="Observação"
                className="min-w-0 flex-1 resize-none bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
            {!existente && <p className="text-xs text-slate-500">Ao salvar, você fica como o ancião responsável por este culto.</p>}
          </>
        )}

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => setAberto(null)} className="botao-secundario px-3.5 py-1.5">
            {deOutro ? "Fechar" : "Cancelar"}
          </button>
          {!deOutro && (
            <button disabled={salvando} className="botao px-4 py-1.5">
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
