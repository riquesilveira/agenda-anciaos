"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlignLeft, Church, Clock, MessageCircle, Mic } from "lucide-react";
import { CartaoFlutuante, posicaoPara, type Posicao } from "@/components/cartao-flutuante";
import { definirPregador, type EstadoPregacao } from "@/app/(app)/acoes";
import { dataLonga, maiuscula } from "@/lib/datas";
import { CULTOS, mensagemConvite, mensagemLembrete } from "@/lib/pregacao";
import { linkWhatsapp } from "@/lib/resumo";
import type { CultoPregacao } from "@/lib/tipos";

export interface PregacaoDoDia {
  data: string;
  culto: CultoPregacao;
  pregador_nome: string | null;
  observacoes: string | null;
  titulo: string | null;
  meu: boolean;
  responsavel: string | null;
  pregador_whatsapp: string | null;
  tema: string | null;
  horario: string | null;
}

/**
 * Cadastro rápido do pregador: clicar num dia da grade (data-pregacao-dia)
 * abre este cartão ao lado do dia. Culto fixo do dia já vem escolhido; nos
 * outros dias é um culto especial com nome.
 */
export function NovoPregadorRapido({
  existentes,
  igreja,
  remetente,
}: {
  existentes: PregacaoDoDia[];
  igreja: string;
  remetente: { nome: string; papel: "anciao" | "pastor" | "lider"; tratamento?: string | null };
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<{ data: string; celula: HTMLElement; posicao: Posicao } | null>(null);
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
      const data = celula.dataset.pregacaoDia!;
      const opcoes = opcoesDoDia(data);
      // Clicou no nome de um pregador: abre aquele culto. Senão, sugere o culto livre do dia.
      const clicado = alvo.closest<HTMLElement>("[data-pregacao-culto]")?.dataset.pregacaoCulto as CultoPregacao | undefined;
      const livre = opcoes.find((c) => !existentes.some((x) => x.data === data && x.culto === c && x.pregador_nome));
      setCulto(clicado ?? livre ?? opcoes[0]);
      setAberto({ data, celula, posicao: posicaoPara(celula, 470) });
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
    <CartaoFlutuante
      posicao={aberto.posicao}
      celula={aberto.celula}
      titulo={existente?.pregador_nome ? "Editar pregador" : "Pregador"}
      subtitulo={maiuscula(dataLonga(aberto.data))}
      aoFechar={() => setAberto(null)}
      cartaoRef={cartao}
    >
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
                autoFocus={culto !== "especial" && aberto.posicao.modo === "flutuante"}
                defaultValue={existente?.pregador_nome ?? ""}
                placeholder="Nome do pregador"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
            <label className={campo}>
              <Clock size={16} className="shrink-0 text-slate-500" />
              <span className="sr-only">Horário</span>
              <input
                name="horario"
                type="time"
                defaultValue={existente?.horario?.slice(0, 5) ?? ""}
                className="w-full min-w-0 bg-transparent outline-none"
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

        {existente?.meu && existente.pregador_nome && (
          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsapp(existente.pregador_whatsapp, mensagemConvite(existente, igreja, remetente))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <MessageCircle size={14} /> Enviar convite
            </a>
            <a
              href={linkWhatsapp(existente.pregador_whatsapp, mensagemLembrete(existente, igreja, remetente))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <MessageCircle size={14} /> Enviar lembrete
            </a>
          </div>
        )}

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
        <div className="flex items-center justify-end gap-2 pt-1">
          {existente && (
            <Link href={`/escalas/${aberto.data}/${culto}`} className="mr-auto text-xs font-medium text-slate-500 hover:text-indigo-700">
              Mais opções
            </Link>
          )}
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
    </CartaoFlutuante>
  );
}
