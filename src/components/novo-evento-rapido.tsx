"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  AlignLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Landmark,
  Users,
} from "lucide-react";
import { CartaoFlutuante, posicaoPara, type Posicao } from "@/components/cartao-flutuante";
import {
  salvarProgramacao,
  type EstadoFormProgramacao,
} from "@/app/(app)/acoes";
import { dataLonga, horaCurta, maiuscula, periodoCurto } from "@/lib/datas";
import { ORIGENS, type Departamento, type Origem } from "@/lib/tipos";

/**
 * Cadastro rápido: clicar num dia do calendário abre este cartão ao lado do
 * dia (no celular, sobe de baixo). As células marcam o dia com data-novo-dia="yyyy-MM-dd".
 * Usa a mesma ação do formulário completo (conflito continua sendo só aviso).
 */
export function NovoEventoRapido({
  departamentos,
  soLocal,
}: {
  departamentos: Departamento[];
  soLocal: boolean;
}) {
  const [aberto, setAberto] = useState<{
    data: string;
    celula: HTMLElement | null;
    posicao: Posicao;
    linkDia: string | null;
    qtd: number;
  } | null>(null);
  const [estado, acao, enviando] = useActionState<
    EstadoFormProgramacao,
    FormData
  >(salvarProgramacao, {});
  const [chave, setChave] = useState(0); // recria o formulário a cada abertura
  const confirmar = useRef<HTMLInputElement>(null);
  const cartao = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      const alvo = e.target as HTMLElement;
      if (cartao.current?.contains(alvo)) return;
      const celula = alvo.closest<HTMLElement>("[data-novo-dia]");
      // Clique em evento (link) segue para o evento. No celular, tocar no dia só
      // seleciona (o link do dia); o cadastro abre pelo "+".
      if (!celula || alvo.closest("a") || window.innerWidth < 640) {
        if (aberto && !celula) setAberto(null);
        return;
      }
      setAberto({
        data: celula.dataset.novoDia!,
        celula,
        posicao: posicaoPara(celula, 520),
        linkDia: celula.dataset.linkDia ?? null,
        qtd: Number(celula.dataset.qtd ?? 0),
      });
      setChave((k) => k + 1);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(null);
    }
    // Botão "+" (BotaoNova): abre o mesmo cadastro, na data pedida.
    function aoPedirNova(e: Event) {
      const data = (e as CustomEvent<{ data: string }>).detail.data;
      const celula = document.querySelector<HTMLElement>(`[data-novo-dia="${data}"]`);
      setAberto({
        data,
        celula,
        posicao: celula ? posicaoPara(celula, 520) : { modo: "folha" },
        linkDia: celula?.dataset.linkDia ?? null,
        qtd: Number(celula?.dataset.qtd ?? 0),
      });
      setChave((k) => k + 1);
    }
    document.addEventListener("click", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("nova-programacao", aoPedirNova);
    document.body.dataset.cadastroRapido = "1"; // o "+" usa este cadastro
    return () => {
      document.removeEventListener("click", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("nova-programacao", aoPedirNova);
      delete document.body.dataset.cadastroRapido;
    };
  }, [aberto]);

  if (!aberto) return null;
  const campo =
    "flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs transition hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15";

  return (
    <CartaoFlutuante
      posicao={aberto.posicao}
      celula={aberto.celula}
      titulo="Nova programação"
      subtitulo={
        aberto.qtd > 0 && aberto.linkDia ? (
          <Link href={aberto.linkDia} onClick={() => setAberto(null)} className="font-medium text-indigo-700 hover:underline">
            Ver {aberto.qtd === 1 ? "a programação" : `as ${aberto.qtd} programações`} deste dia
          </Link>
        ) : (
          maiuscula(dataLonga(aberto.data))
        )
      }
      aoFechar={() => setAberto(null)}
      cartaoRef={cartao}
    >
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
          autoFocus={aberto.posicao.modo === "flutuante"}
          placeholder="Nome da programação"
          className="w-full rounded-xl border border-indigo-500 px-3.5 py-2.5 text-sm shadow-xs ring-4 ring-indigo-500/15 outline-none placeholder:text-slate-400"
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
        <div className="flex items-center gap-2">
          <label className={`${campo} min-w-0 px-2.5`}>
            <Clock size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Início</span>
            <input
              name="hora_inicio"
              type="time"
              className="w-full min-w-0 bg-transparent outline-none"
            />
          </label>
          <ArrowRight size={16} className="shrink-0 text-slate-400" />
          <label className={`${campo} min-w-0 px-2.5`}>
            <Clock size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Término</span>
            <input
              name="hora_fim"
              type="time"
              className="w-full min-w-0 bg-transparent outline-none"
            />
          </label>
        </div>
        {soLocal ? (
          <input type="hidden" name="origem" value="local" />
        ) : (
          <label className={campo}>
            <Landmark size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Origem</span>
            <select
              name="origem"
              defaultValue="local"
              className="min-w-0 flex-1 cursor-pointer bg-transparent pr-6 outline-none [background-position:right_0_center]"
            >
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
            defaultValue={
              soLocal && departamentos.length === 1 ? departamentos[0].id : ""
            }
            className="min-w-0 flex-1 cursor-pointer bg-transparent pr-6 outline-none [background-position:right_0_center]"
          >
            <option value="">
              {soLocal ? "Departamento" : "Igreja toda / sem departamento"}
            </option>
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
          <textarea
            name="descricao"
            rows={2}
            placeholder="Descrição"
            className="min-w-0 flex-1 resize-none bg-transparent outline-none"
          />
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
                  {c.programacao.hora_inicio &&
                    ` ${horaCurta(c.programacao.hora_inicio)}`}
                  )
                </li>
              ))}
            </ul>
            <button
              type="submit"
              disabled={enviando}
              onClick={() =>
                confirmar.current && (confirmar.current.value = "1")
              }
              className="botao bg-amber-600 px-3 py-1.5 text-xs hover:bg-amber-700"
            >
              Salvar mesmo assim
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={`/programacoes/nova?data=${aberto.data}`}
            className="text-xs font-medium text-slate-500 hover:text-indigo-700"
          >
            Mais opções
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAberto(null)}
              className="botao-secundario px-3.5 py-1.5"
            >
              Cancelar
            </button>
            <button disabled={enviando} className="botao px-4 py-1.5">
              {enviando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </form>
    </CartaoFlutuante>
  );
}
