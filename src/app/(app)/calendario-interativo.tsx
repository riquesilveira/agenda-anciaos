"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, Plus } from "lucide-react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarioMes } from "@/components/calendario-mes";
import { FiltroDepartamento } from "@/components/filtro-departamento";
import { LinhaDoTempo } from "@/components/linha-do-tempo";
import { ListaProgramacoes } from "@/components/lista-programacoes";
import { CabecalhoMes, Moldura, TituloLateral } from "@/components/moldura";
import { dataLonga, fimDe, maiuscula } from "@/lib/datas";
import { ORIGENS, type Departamento, type Origem, type Programacao } from "@/lib/tipos";
import { programacoesDoPeriodo, removerProgramacao } from "./acoes";

const ROTULO_ORIGEM: Record<Origem, string> = { local: "Local", distrito: "Distrito", associacao: "ANP" };

/** Dias da grade de um mês (semanas completas). */
function diasDaGrade(mes: string) {
  const inicio = parseISO(`${mes}-01`);
  return eachDayOfInterval({ start: startOfWeek(startOfMonth(inicio)), end: endOfWeek(endOfMonth(inicio)) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
}
const mesVizinho = (mes: string, passo: number) => format(addMonths(parseISO(`${mes}-01`), passo), "yyyy-MM");

/**
 * Calendário que roda no aparelho: trocar origem, departamento, dia e mês é
 * instantâneo (sem ir ao servidor). Os meses vizinhos são buscados em segundo
 * plano; arrastar o calendário para o lado troca o mês. A URL acompanha
 * (dá para atualizar a página ou compartilhar o link).
 */
export function CalendarioInterativo({
  inicial,
  mesesCarregados,
  programacoesIniciais,
  departamentos,
  meusDeps,
  hoje,
  podeCriar,
  lideranca,
  igrejaId,
}: {
  inicial: { mes: string; dia: string | null; origem: Origem | null; dep: string };
  mesesCarregados: string[];
  programacoesIniciais: Programacao[];
  departamentos: Departamento[];
  meusDeps: string[];
  hoje: string;
  podeCriar: boolean;
  /** Anciãos/pastor: podem excluir qualquer programação da própria igreja. */
  lideranca: boolean;
  igrejaId: string;
}) {
  const [mes, setMes] = useState(inicial.mes);
  const [dia, setDia] = useState<string | null>(inicial.dia);
  const [origem, setOrigem] = useState<Origem | null>(inicial.origem);
  const [dep, setDep] = useState(inicial.dep);
  const [todas, setTodas] = useState(programacoesIniciais);
  const [direcao, setDirecao] = useState<"esq" | "dir" | null>(null);
  const [, iniciar] = useTransition();
  const carregados = useRef(new Set(mesesCarregados));
  const buscando = useRef(new Set<string>());

  // Busca (em segundo plano) os meses que ainda não estão no aparelho.
  const garantir = useCallback((meses: string[]) => {
    const faltam = meses.filter((m) => !carregados.current.has(m) && !buscando.current.has(m));
    if (!faltam.length) return;
    faltam.forEach((m) => buscando.current.add(m));
    const ordenados = [...faltam].sort();
    const de = diasDaGrade(ordenados[0])[0];
    const grade = diasDaGrade(ordenados[ordenados.length - 1]);
    iniciar(async () => {
      const novas = await programacoesDoPeriodo(de, grade[grade.length - 1]);
      faltam.forEach((m) => {
        carregados.current.add(m);
        buscando.current.delete(m);
      });
      setTodas((atuais) => {
        const porId = new Map(atuais.map((p) => [p.id, p]));
        novas.forEach((p) => porId.set(p.id, p));
        return [...porId.values()];
      });
    });
  }, []);

  useEffect(() => {
    garantir([mes, mesVizinho(mes, -1), mesVizinho(mes, 1)]);
  }, [mes, garantir]);

  // A URL acompanha (sem recarregar).
  useEffect(() => {
    const q = new URLSearchParams();
    q.set("mes", mes);
    if (dep) q.set("dep", dep);
    if (origem) q.set("origem", origem);
    if (dia) q.set("dia", dia);
    window.history.replaceState(null, "", `/?${q}`);
  }, [mes, dia, origem, dep]);

  function irParaMes(novo: string) {
    if (novo === mes) return;
    setDirecao(novo > mes ? "esq" : "dir");
    setMes(novo);
    setDia(null);
  }

  function escolherDia(d: string) {
    if (!d.startsWith(mes)) irParaMes(d.slice(0, 7));
    setDia(d);
    requestAnimationFrame(() => document.getElementById("lista")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  // Arrastar para o lado troca o mês (celular).
  const toque = useRef<{ x: number; y: number } | null>(null);
  const aoTocar = (e: React.TouchEvent) => (toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const aoSoltar = (e: React.TouchEvent) => {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio) return;
    const dx = e.changedTouches[0].clientX - inicio.x;
    const dy = e.changedTouches[0].clientY - inicio.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) irParaMes(mesVizinho(mes, dx < 0 ? 1 : -1));
  };

  const dias = useMemo(() => diasDaGrade(mes), [mes]);
  const meus = useMemo(() => new Set(meusDeps), [meusDeps]);
  const programacoes = useMemo(
    () =>
      todas.filter(
        (p) =>
          (!dep || (dep === "meus" ? Boolean(p.departamento_id && meus.has(p.departamento_id)) : p.departamento_id === dep)) &&
          (!origem || p.origem === origem),
      ),
    [todas, dep, origem, meus],
  );
  const porDia = useMemo(() => {
    const mapa = new Map<string, Programacao[]>();
    for (const d of dias) {
      mapa.set(
        d,
        programacoes
          .filter((p) => p.data <= d && fimDe(p) >= d)
          .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? "")),
      );
    }
    return mapa;
  }, [dias, programacoes]);
  const doMes = useMemo(
    () =>
      programacoes
        .filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`)
        .sort((a, b) => a.data.localeCompare(b.data) || (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? "")),
    [programacoes, mes],
  );
  const carregandoMes = !carregados.current.has(mes);

  const linkDoDia = (d: string) => `/?mes=${d.slice(0, 7)}&dia=${d}`;
  const abasOrigem = (
    <nav className="flex rounded-xl bg-slate-100 p-1" aria-label="Origem">
      {([null, "local", "distrito", "associacao"] as (Origem | null)[]).map((o) => {
        const ativa = origem === o;
        return (
          <button
            key={o ?? "todos"}
            type="button"
            onClick={() => {
              setOrigem(o);
              setDia(null);
            }}
            aria-pressed={ativa}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${
              ativa ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {o && <span className={`h-2 w-2 rounded-full ${ORIGENS[o].ponto}`} />}
            {o ? ROTULO_ORIGEM[o] : "Todos"}
          </button>
        );
      })}
    </nav>
  );
  const filtroDep = <FiltroDepartamento departamentos={departamentos} valor={dep} aoMudar={(v) => (setDep(v), setDia(null))} />;

  return (
    <>
      <Moldura
        lateral={
          <>
            {podeCriar && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.dispatchEvent(new CustomEvent("nova-programacao", { detail: { data: dia ?? (hoje.startsWith(mes) ? hoje : `${mes}-01`) } }));
                }}
                className="botao w-full py-2.5"
              >
                <Plus size={18} /> Nova programação
              </button>
            )}
            <div className="space-y-2">
              <TituloLateral>Departamento</TituloLateral>
              {filtroDep}
            </div>
            <Link
              href="/minhas"
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
            >
              <Bell size={16} /> Minhas programações
            </Link>
          </>
        }
      >
        <CabecalhoMes
          mes={mes}
          aoMudar={irParaMes}
          direita={
            <>
              <div className="hidden sm:block">{abasOrigem}</div>
              <Link href="/minhas" className="botao-secundario px-2.5 py-1.5 sm:hidden" aria-label="Minhas programações" title="Minhas programações">
                <Bell size={16} />
              </Link>
            </>
          }
        />
        <div className="space-y-2.5 px-4 pb-3 sm:hidden">{abasOrigem}</div>
        <div className="px-4 pb-3 lg:hidden">{filtroDep}</div>
        <div
          key={mes}
          onTouchStart={aoTocar}
          onTouchEnd={aoSoltar}
          className={`touch-pan-y transition-opacity ${carregandoMes ? "opacity-60" : ""} ${
            direcao === "esq" ? "animate-entrar-direita" : direcao === "dir" ? "animate-entrar-esquerda" : ""
          }`}
        >
          <CalendarioMes
            dias={dias}
            porDia={porDia}
            mesAtual={mes}
            hoje={hoje}
            diaSelecionado={dia}
            linkDoDia={linkDoDia}
            podeCriar={podeCriar}
            aoEscolherDia={escolherDia}
          />
        </div>
      </Moldura>

      <section id="lista" className="scroll-mt-4 space-y-3">
        {dia ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{maiuscula(dataLonga(dia))}</h2>
              <button type="button" onClick={() => setDia(null)} className="botao-secundario">
                Mês todo
              </button>
            </div>
            <LinhaDoTempo
              dia={dia}
              programacoes={porDia.get(dia) ?? []}
              hoje={hoje}
              podeRemover={(p) => lideranca && p.igreja_id === igrejaId}
              aoRemover={(p) => {
                setTodas((atuais) => atuais.filter((x) => x.id !== p.id));
                iniciar(async () => {
                  const r = await removerProgramacao(p.id);
                  if (r.erro) {
                    setTodas((atuais) => [...atuais, p]);
                    window.alert(r.erro);
                  }
                });
              }}
              aoNova={
                podeCriar
                  ? () => document.dispatchEvent(new CustomEvent("nova-programacao", { detail: { data: dia } }))
                  : undefined
              }
            />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              Programações do mês <span className="text-sm font-normal text-slate-400">({doMes.length})</span>
            </h2>
            <ListaProgramacoes programacoes={doMes} hoje={hoje} />
          </>
        )}
      </section>
    </>
  );
}
