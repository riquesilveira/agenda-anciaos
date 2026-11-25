"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { FUSO, horaCurta, maiuscula, periodoCurto } from "@/lib/datas";
import type { Origem, Programacao } from "@/lib/tipos";

const ALTURA_HORA = 76; // px por hora

/** Cores dos blocos (estilo das referências: fundo pastel + faixa no topo). */
const CORES: Record<
  Origem,
  {
    bloco: string;
    hora: string;
    titulo: string;
    selo: string;
    ponto: string;
    nome: string;
  }
> = {
  local: {
    bloco: "bg-sky-50 border-sky-400 hover:bg-sky-100/70",
    hora: "text-sky-600",
    titulo: "text-sky-900",
    selo: "bg-white/80 text-sky-700",
    ponto: "bg-sky-500",
    nome: "Igreja local",
  },
  distrito: {
    bloco: "bg-amber-50 border-amber-400 hover:bg-amber-100/70",
    hora: "text-amber-600",
    titulo: "text-amber-900",
    selo: "bg-white/80 text-amber-700",
    ponto: "bg-amber-500",
    nome: "Distrito",
  },
  associacao: {
    bloco: "bg-violet-50 border-violet-400 hover:bg-violet-100/70",
    hora: "text-violet-600",
    titulo: "text-violet-900",
    selo: "bg-white/80 text-violet-700",
    ponto: "bg-violet-500",
    nome: "ANP",
  },
};

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};
const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

type Bloco = {
  p: Programacao;
  inicio: number;
  fim: number;
  coluna: number;
  colunas: number;
};

/** Distribui em colunas as programações que acontecem ao mesmo tempo. */
function distribuir(
  itens: { p: Programacao; inicio: number; fim: number }[],
): Bloco[] {
  const ordenados = [...itens].sort(
    (a, b) => a.inicio - b.inicio || b.fim - a.fim,
  );
  const blocos: Bloco[] = [];
  let grupo: Bloco[] = [];
  let fimDoGrupo = -1;
  const fecharGrupo = () => {
    const total = Math.max(1, ...grupo.map((b) => b.coluna + 1));
    grupo.forEach((b) => (b.colunas = total));
    grupo = [];
  };
  for (const it of ordenados) {
    if (it.inicio >= fimDoGrupo) fecharGrupo();
    const ocupadas = new Set(
      grupo.filter((b) => b.fim > it.inicio).map((b) => b.coluna),
    );
    let coluna = 0;
    while (ocupadas.has(coluna)) coluna++;
    const bloco = { ...it, coluna, colunas: 1 };
    grupo.push(bloco);
    blocos.push(bloco);
    fimDoGrupo = Math.max(fimDoGrupo, it.fim);
  }
  fecharGrupo();
  return blocos;
}

/**
 * Dia selecionado: linha do tempo (horários à esquerda, cada programação como
 * um bloco do início ao fim; sem término = 1h) e, ao lado no computador, o
 * resumo do dia com as programações "Dia todo" (sem horário ou de vários dias).
 */
export function LinhaDoTempo({
  dia,
  programacoes,
  hoje,
  aoNova,
}: {
  dia: string;
  programacoes: Programacao[];
  hoje: string;
  /** Abre o cadastro rápido neste dia (quem pode criar). */
  aoNova?: () => void;
}) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    if (dia !== hoje) return setAgora(null);
    const atualizar = () => {
      const [h, m] = new Intl.DateTimeFormat("en-GB", {
        timeZone: FUSO,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .format(new Date())
        .split(":")
        .map(Number);
      setAgora(h * 60 + m);
    };
    atualizar();
    const t = setInterval(atualizar, 60_000);
    return () => clearInterval(t);
  }, [dia, hoje]);

  // Com horário e começando neste dia = bloco; o resto = "Dia todo".
  const comHora = programacoes.filter((p) => p.hora_inicio && p.data === dia);
  const diaTodo = programacoes.filter((p) => !comHora.includes(p));
  const itens = comHora.map((p) => {
    const inicio = minutos(p.hora_inicio!);
    const fimInformado =
      p.hora_fim && (!p.data_fim || p.data_fim === p.data)
        ? minutos(p.hora_fim)
        : null;
    return {
      p,
      inicio,
      fim: Math.max(
        inicio + 30,
        fimInformado && fimInformado > inicio ? fimInformado : inicio + 60,
      ),
    };
  });
  const blocos = distribuir(itens);
  const temGrade = itens.length > 0 || agora !== null;

  // Só a faixa útil do dia: 1h antes e depois (no mínimo 5h).
  const marcas = [
    ...itens.flatMap((i) => [i.inicio, i.fim]),
    ...(agora !== null ? [agora] : []),
  ];
  let primeira = 0;
  let ultima = 0;
  if (temGrade) {
    const fimReal = Math.ceil(Math.max(...marcas) / 60) * 60;
    primeira = Math.max(0, Math.floor(Math.min(...marcas) / 60) * 60 - 60);
    ultima = Math.min(Math.max(23 * 60, fimReal), fimReal + 60);
    while (ultima - primeira < 5 * 60) {
      if (primeira > 0) primeira -= 60;
      if (ultima - primeira < 5 * 60 && ultima < 23 * 60) ultima += 60;
      if (primeira === 0 && ultima >= 23 * 60) break;
    }
  }
  const horas = temGrade
    ? Array.from(
        { length: (ultima - primeira) / 60 + 1 },
        (_, i) => primeira + i * 60,
      )
    : [];
  const y = (min: number) => ((min - primeira) / 60) * ALTURA_HORA;

  const contagem = (Object.keys(CORES) as Origem[])
    .map((o) => ({ o, n: programacoes.filter((p) => p.origem === o).length }))
    .filter((c) => c.n);
  const d = new Date(`${dia}T12:00:00`);

  const resumo = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl ${dia === hoje ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700"}`}
        >
          <span className="text-2xl leading-none font-bold">{d.getDate()}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {maiuscula(d.toLocaleDateString("pt-BR", { weekday: "long" }))}
          </p>
          <p className="text-sm text-slate-500">
            {d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {contagem.length ? (
          contagem.map(({ o, n }) => (
            <span
              key={o}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              <span className={`h-2 w-2 rounded-full ${CORES[o].ponto}`} />
              {n} {CORES[o].nome}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">
            Nenhuma programação neste dia.
          </span>
        )}
      </div>
      {aoNova && (
        <button
          type="button"
          onClick={aoNova}
          className="botao mt-3 w-full py-2"
        >
          <Plus size={16} /> Nova programação neste dia
        </button>
      )}
    </div>
  );
  const cartoesDiaTodo = diaTodo.length > 0 && (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Dia todo
      </p>
      {diaTodo.map((p) => (
        <Link
          key={p.id}
          href={`/programacoes/${p.id}`}
          className={`block rounded-xl border-t-2 px-3 py-2.5 transition ${CORES[p.origem].bloco}`}
        >
          <p
            className={`text-sm leading-snug font-semibold ${CORES[p.origem].titulo}`}
          >
            {p.titulo}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {p.data_fim && p.data_fim !== p.data && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <CalendarDays size={11} /> {periodoCurto(p)}
              </span>
            )}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CORES[p.origem].selo}`}
            >
              {CORES[p.origem].nome}
            </span>
            {p.departamento && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CORES[p.origem].selo}`}
              >
                {p.departamento.nome}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
      {temGrade ? (
        <div className="order-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 lg:order-1">
          <div className="relative" style={{ height: y(ultima) + 12 }}>
            {/* horários e linhas (hora cheia forte, meia hora tracejada) */}
            {horas.map((h) => (
              <div key={h}>
                <div
                  className="absolute inset-x-0 flex items-center gap-3"
                  style={{ top: y(h) - 8 }}
                >
                  <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-400 tabular-nums sm:w-14 sm:text-[13px]">
                    {hhmm(h)}
                  </span>
                  <span className="h-px flex-1 bg-slate-200/80" />
                </div>
                {h < ultima && (
                  <div
                    className="absolute right-0 left-[3.75rem] border-t border-dashed border-slate-100 sm:left-[4.25rem]"
                    style={{ top: y(h + 30) }}
                  />
                )}
              </div>
            ))}

            {/* programações */}
            <div className="absolute top-0 right-0 bottom-0 left-[3.75rem] sm:left-[4.25rem]">
              {blocos.map(({ p, inicio, fim, coluna, colunas }) => {
                const altura = Math.max(y(fim) - y(inicio) - 4, 40);
                const tamanho =
                  altura < 52 ? "linha" : altura < 110 ? "medio" : "grande";
                const cor = CORES[p.origem];
                const fimMostrado =
                  p.hora_fim && (!p.data_fim || p.data_fim === p.data)
                    ? ` – ${horaCurta(p.hora_fim)}`
                    : "";
                return (
                  <Link
                    key={p.id}
                    href={`/programacoes/${p.id}`}
                    title={p.titulo}
                    style={{
                      top: y(inicio) + 2,
                      height: altura,
                      left: `calc(${(coluna / colunas) * 100}% + ${coluna ? 4 : 0}px)`,
                      width: `calc(${100 / colunas}% - ${colunas > 1 ? 4 : 0}px)`,
                    }}
                    className={`absolute flex flex-col overflow-hidden rounded-xl border-t-2 px-3 py-2 shadow-xs transition sm:px-4 ${cor.bloco}`}
                  >
                    {tamanho === "linha" ? (
                      <p className="truncate text-sm">
                        <span className={`font-medium ${cor.hora}`}>
                          {horaCurta(p.hora_inicio)}{" "}
                        </span>
                        <span className={`font-semibold ${cor.titulo}`}>
                          {p.titulo}
                        </span>
                      </p>
                    ) : (
                      <>
                        {tamanho === "medio" ? (
                          <p className="truncate text-[15px] leading-snug">
                            <span className={`text-xs font-medium ${cor.hora}`}>
                              {horaCurta(p.hora_inicio)}
                              {fimMostrado}
                            </span>{" "}
                            <span className={`font-semibold ${cor.titulo}`}>
                              {p.titulo}
                            </span>
                          </p>
                        ) : (
                          <>
                            <p className={`text-xs font-medium ${cor.hora}`}>
                              {horaCurta(p.hora_inicio)}
                              {fimMostrado}
                            </p>
                            <p
                              className={`mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold ${cor.titulo}`}
                            >
                              {p.titulo}
                            </p>
                          </>
                        )}
                        <div
                          className={`mt-auto flex items-center gap-x-3 gap-y-1 overflow-hidden pt-1 text-xs text-slate-600 ${
                            tamanho === "medio"
                              ? "flex-nowrap whitespace-nowrap"
                              : "flex-wrap"
                          }`}
                        >
                          {p.local && (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <MapPin size={12} className="shrink-0" />{" "}
                              <span className="truncate">{p.local}</span>
                            </span>
                          )}
                          {p.departamento && (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Users size={12} className="shrink-0" />{" "}
                              <span className="truncate">
                                {p.departamento.nome}
                              </span>
                            </span>
                          )}
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${cor.selo}`}
                          >
                            {cor.nome}
                          </span>
                        </div>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* agora: pílula com a hora na coluna dos horários + linha */}
            {agora !== null && agora >= primeira && agora <= ultima && (
              <div
                className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                style={{ top: y(agora) - 10 }}
              >
                <span className="w-12 shrink-0 text-right sm:w-14">
                  <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                    {hhmm(agora)}
                  </span>
                </span>
                <span className="ml-3 h-0.5 flex-1 bg-red-400" />
              </div>
            )}
          </div>
        </div>
      ) : null}
      {temGrade ? (
        <aside className="order-1 space-y-3 lg:order-2">
          {resumo}
          {cartoesDiaTodo}
        </aside>
      ) : (
        // Sem horários: resumo à esquerda e os eventos do dia ocupando o resto.
        <div className="grid items-start gap-4 lg:col-span-2 lg:grid-cols-[19rem_minmax(0,1fr)]">
          {resumo}
          {cartoesDiaTodo}
        </div>
      )}
    </div>
  );
}
