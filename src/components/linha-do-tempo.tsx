"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { FUSO, horaCurta } from "@/lib/datas";
import { ORIGENS, type Programacao } from "@/lib/tipos";

const ALTURA_HORA = 72; // px por hora

const minutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};
const rotuloHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:00`;

type Bloco = { p: Programacao; inicio: number; fim: number; coluna: number; colunas: number };

/** Distribui em colunas as programações que acontecem ao mesmo tempo. */
function distribuir(itens: { p: Programacao; inicio: number; fim: number }[]): Bloco[] {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio || b.fim - a.fim);
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
    const ocupadas = new Set(grupo.filter((b) => b.fim > it.inicio).map((b) => b.coluna));
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
 * Linha do tempo de um dia: horários à esquerda e cada programação como um
 * bloco do início ao fim (sem término = 1h). Sem horário ou de vários dias
 * ficam em "Dia todo". Se for hoje, uma linha marca a hora atual.
 */
export function LinhaDoTempo({ dia, programacoes, hoje }: { dia: string; programacoes: Programacao[]; hoje: string }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    if (dia !== hoje) return setAgora(null);
    const atualizar = () => {
      const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false })
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
    const fimInformado = p.hora_fim && (!p.data_fim || p.data_fim === p.data) ? minutos(p.hora_fim) : null;
    return { p, inicio, fim: Math.max(inicio + 30, fimInformado && fimInformado > inicio ? fimInformado : inicio + 60) };
  });
  const blocos = distribuir(itens);

  // Só a faixa útil do dia: 1h antes da primeira até 1h depois da última (no mínimo 5h).
  const marcas = [...itens.flatMap((i) => [i.inicio, i.fim]), ...(agora !== null ? [agora] : [])];
  const fimReal = Math.ceil(Math.max(...marcas) / 60) * 60;
  let primeira = Math.max(0, Math.floor(Math.min(...marcas) / 60) * 60 - 60);
  let ultima = Math.min(Math.max(23 * 60, fimReal), fimReal + 60);
  // Pelo menos 5h, crescendo para os dois lados (sem passar de 0h / 23h).
  while (ultima - primeira < 5 * 60) {
    if (primeira > 0) primeira -= 60;
    if (ultima - primeira < 5 * 60 && ultima < 23 * 60) ultima += 60;
    if (primeira === 0 && ultima >= 23 * 60) break;
  }
  const horas = Array.from({ length: (ultima - primeira) / 60 + 1 }, (_, i) => primeira + i * 60);
  const y = (min: number) => ((min - primeira) / 60) * ALTURA_HORA;

  return (
    <div className="space-y-3">
      {diaTodo.length > 0 && (
        <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Dia todo</p>
          {diaTodo.map((p) => (
            <Link
              key={p.id}
              href={`/programacoes/${p.id}`}
              className={`flex items-center justify-between gap-2 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium ${ORIGENS[p.origem].etiqueta}`}
            >
              <span className="truncate">{p.titulo}</span>
              {p.departamento?.sigla && <span className="shrink-0 text-xs opacity-70">{p.departamento.sigla}</span>}
            </Link>
          ))}
        </div>
      )}

      {comHora.length === 0 && agora === null ? (
        diaTodo.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhuma programação neste dia.
          </p>
        )
      ) : (
      <div className="rounded-2xl border border-slate-200 bg-white p-3 pt-4 shadow-sm">
        <div className="relative" style={{ height: y(ultima) + 8 }}>
          {/* horários e linhas */}
          {horas.map((h) => (
            <div key={h} className="absolute inset-x-0 flex items-center gap-2" style={{ top: y(h) - 8 }}>
              <span className="w-11 shrink-0 text-right text-[11px] text-slate-400 tabular-nums">{rotuloHora(h)}</span>
              <span className="h-px flex-1 bg-slate-100" />
            </div>
          ))}

          {/* programações */}
          <div className="absolute top-0 right-0 bottom-0 left-14">
            {blocos.map(({ p, inicio, fim, coluna, colunas }) => {
              const altura = Math.max(y(fim) - y(inicio) - 4, 34);
              const curto = altura < 56;
              return (
                <Link
                  key={p.id}
                  href={`/programacoes/${p.id}`}
                  style={{
                    top: y(inicio) + 2,
                    height: altura,
                    left: `calc(${(coluna / colunas) * 100}% + ${coluna ? 3 : 0}px)`,
                    width: `calc(${100 / colunas}% - ${colunas > 1 ? 3 : 0}px)`,
                  }}
                  className={`absolute overflow-hidden rounded-xl border-l-[3px] px-3 py-1.5 shadow-xs transition ${ORIGENS[p.origem].etiqueta}`}
                >
                  <p className={`font-semibold leading-tight ${curto ? "truncate text-xs" : "line-clamp-2 text-sm"}`}>{p.titulo}</p>
                  <p className="mt-0.5 truncate text-[11px] opacity-80">
                    {horaCurta(p.hora_inicio)}
                    {p.hora_fim && (!p.data_fim || p.data_fim === p.data) ? ` – ${horaCurta(p.hora_fim)}` : ""}
                    {p.departamento?.sigla ? ` · ${p.departamento.sigla}` : ""}
                  </p>
                  {!curto && p.local && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] opacity-70">
                      <MapPin size={11} className="shrink-0" /> {p.local}
                    </p>
                  )}
                </Link>
              );
            })}

            {/* agora */}
            {agora !== null && agora >= primeira && agora <= ultima && (
              <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: y(agora) }}>
                <span className="-ml-1.5 h-3 w-3 rounded-full bg-red-500" />
                <span className="h-0.5 flex-1 bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
