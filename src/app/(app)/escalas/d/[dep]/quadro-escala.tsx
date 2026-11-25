"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, GripVertical, MessageCircle, Plus, X } from "lucide-react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { dataLonga, horaCurta, maiuscula } from "@/lib/datas";
import { mensagemAvisoEscala } from "@/lib/escalas";
import { linkWhatsapp } from "@/lib/resumo";
import type { EscalaDia, EscalaDiaPessoa, MembroDepartamento, Perfil } from "@/lib/tipos";
import {
  adicionarMembro,
  avisoPessoa,
  definirFuncaoPessoa,
  escalarNaData,
  excluirDiaEscala,
  removerMembro,
  removerPessoaDia,
} from "../../../acoes";
import { FormDia } from "./form-dia";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Remetente = Pick<Perfil, "nome" | "papel" | "tratamento">;

/**
 * Escala de um departamento: equipe de um lado e o calendário do mês.
 * Computador: arrastar o nome até o dia. Celular: tocar no nome e depois no dia.
 * Tocar num dia abre, logo abaixo, quem está escalado (função, avisar, tirar).
 */
export function QuadroEscala({
  departamento,
  membros,
  diasIniciais,
  podeEditar,
  remetente,
  hoje,
  mes,
}: {
  departamento: { id: string; nome: string };
  membros: MembroDepartamento[];
  diasIniciais: EscalaDia[];
  podeEditar: boolean;
  remetente: Remetente;
  hoje: string;
  mes: string; // yyyy-MM
}) {
  const router = useRouter();
  const [dias, setDias] = useState(diasIniciais);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(() => {
    if (hoje.startsWith(mes)) return hoje;
    return diasIniciais[0]?.data ?? null;
  });
  const [erro, setErro] = useState("");
  const [, iniciar] = useTransition();
  const membroPorId = useMemo(() => new Map(membros.map((m) => [m.id, m])), [membros]);

  useEffect(() => setDias(diasIniciais), [diasIniciais]);

  const grade = useMemo(() => {
    const inicio = parseISO(`${mes}-01`);
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(inicio)), end: endOfWeek(endOfMonth(inicio)) }).map((d) =>
      format(d, "yyyy-MM-dd"),
    );
  }, [mes]);
  const porData = useMemo(() => {
    const mapa = new Map<string, EscalaDia[]>();
    for (const d of dias) mapa.set(d.data, [...(mapa.get(d.data) ?? []), d]);
    return mapa;
  }, [dias]);
  const pessoasDoDia = (data: string) => (porData.get(data) ?? []).flatMap((d) => d.pessoas ?? []);

  function escalar(data: string, membroId: string) {
    const membro = membroPorId.get(membroId);
    if (!membro) return;
    setSelecionado(null);
    setAberto(data);
    const tmpPessoa = `tmp-${Date.now()}`;
    const existente = porData.get(data)?.[0];
    const tmpDia = existente?.id ?? `tmp-dia-${data}`;
    const pessoa: EscalaDiaPessoa = { id: tmpPessoa, escala_dia_id: tmpDia, membro_id: membroId, funcao: null, avisado_em: null, ordem: 999, membro };
    setDias((ds) =>
      existente
        ? ds.map((d) => (d.id === existente.id ? { ...d, pessoas: [...(d.pessoas ?? []), pessoa] } : d))
        : [...ds, { id: tmpDia, departamento_id: departamento.id, data, horario: null, titulo: null, observacao: null, pessoas: [pessoa] }],
    );
    iniciar(async () => {
      const r = await escalarNaData(departamento.id, data, membroId);
      if (r.erro || !r.diaId || !r.pessoaId) {
        setErro(r.erro ?? "Não foi possível escalar.");
        setDias((ds) =>
          ds
            .map((d) => ({ ...d, pessoas: (d.pessoas ?? []).filter((p) => p.id !== tmpPessoa) }))
            .filter((d) => !(d.id === tmpDia && !existente)),
        );
        return;
      }
      setDias((ds) =>
        ds.map((d) =>
          d.id === tmpDia
            ? { ...d, id: r.diaId!, pessoas: (d.pessoas ?? []).map((p) => (p.id === tmpPessoa ? { ...p, id: r.pessoaId!, escala_dia_id: r.diaId! } : p)) }
            : d,
        ),
      );
    });
  }

  function mudarPessoa(pessoaId: string, mudanca: Partial<EscalaDiaPessoa>) {
    setDias((ds) => ds.map((d) => ({ ...d, pessoas: (d.pessoas ?? []).map((p) => (p.id === pessoaId ? { ...p, ...mudanca } : p)) })));
  }

  function tirar(pessoaId: string) {
    setDias((ds) => ds.map((d) => ({ ...d, pessoas: (d.pessoas ?? []).filter((p) => p.id !== pessoaId) })));
    if (!pessoaId.startsWith("tmp-")) iniciar(() => removerPessoaDia(pessoaId));
  }

  const diasAbertos = aberto ? porData.get(aberto) ?? [] : [];

  return (
    <div className="space-y-4">
      {erro && (
        <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
          <button onClick={() => setErro("")} aria-label="Fechar"><X size={16} /></button>
        </p>
      )}

      <div className={`grid gap-4 ${podeEditar ? "lg:grid-cols-[15rem_1fr]" : ""}`}>
        {/* ----- Equipe ----- */}
        {podeEditar && (
          <aside className="cartao h-fit space-y-3 lg:sticky lg:top-20">
            <div>
              <h2 className="font-semibold">Equipe de {departamento.nome}</h2>
              <p className="text-xs text-slate-500">
                <span className="hidden lg:inline">Arraste um nome até o dia do calendário.</span>
                <span className="lg:hidden">Toque num nome e depois no dia.</span>
              </p>
            </div>
            <ul className="flex flex-wrap gap-2 lg:flex-col">
              {membros.map((m) => (
                <li key={m.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", m.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => setSelecionado((s) => (s === m.id ? null : m.id))}
                    className={`flex flex-1 cursor-grab items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition active:cursor-grabbing ${
                      selecionado === m.id
                        ? "border-indigo-600 bg-indigo-600 text-white shadow"
                        : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400"
                    }`}
                  >
                    <GripVertical size={14} className="hidden opacity-50 lg:block" />
                    {m.nome}
                  </button>
                  <form action={removerMembro} className="hidden group-hover:block">
                    <input type="hidden" name="id" value={m.id} />
                    <BotaoConfirmar mensagem={`Tirar ${m.nome} da equipe? Ele continua nas escalas já feitas.`} rotulo={`Tirar ${m.nome}`} className="rounded p-1 text-slate-400 hover:text-red-600">
                      <X size={14} />
                    </BotaoConfirmar>
                  </form>
                </li>
              ))}
              {membros.length === 0 && <li className="text-sm text-slate-500">Cadastre a equipe abaixo.</li>}
            </ul>
            <form
              action={async (f) => {
                await adicionarMembro(f);
                router.refresh();
              }}
              className="space-y-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="departamento_id" value={departamento.id} />
              <input className="campo" name="nome" placeholder="Nome" required />
              <input className="campo" name="whatsapp" placeholder="WhatsApp (opcional)" inputMode="tel" />
              <button className="botao w-full bg-emerald-600 py-2.5 hover:bg-emerald-700"><Plus size={18} /> Adicionar à equipe</button>
            </form>
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          {/* ----- Calendário do mês ----- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grade.map((data) => {
                const doMes = data.startsWith(mes);
                const pessoas = pessoasDoDia(data);
                const ehAberto = aberto === data;
                const destacado = alvo === data;
                return (
                  <button
                    key={data}
                    type="button"
                    disabled={!doMes}
                    onDragOver={(e) => {
                      if (!podeEditar || !doMes) return;
                      e.preventDefault();
                      setAlvo(data);
                    }}
                    onDragLeave={() => setAlvo((a) => (a === data ? null : a))}
                    onDrop={(e) => {
                      e.preventDefault();
                      setAlvo(null);
                      const id = e.dataTransfer.getData("text/plain");
                      if (id && doMes) escalar(data, id);
                    }}
                    onClick={() => {
                      if (!doMes) return;
                      if (selecionado && podeEditar) escalar(data, selecionado);
                      else setAberto(data);
                    }}
                    className={`relative flex min-h-[4.25rem] flex-col items-stretch gap-0.5 border-r border-b border-slate-100 p-1 text-left transition sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${
                      !doMes ? "bg-slate-50/70" : "hover:bg-indigo-50/60"
                    } ${destacado ? "z-10 bg-indigo-50 ring-2 ring-indigo-500 ring-inset" : ""} ${
                      ehAberto && !destacado ? "z-10 ring-2 ring-indigo-300 ring-inset" : ""
                    } ${selecionado && podeEditar && doMes ? "cursor-copy" : ""}`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-[11px] ${
                        data === hoje ? "bg-indigo-600 font-bold text-white" : doMes ? "text-slate-600" : "text-slate-300"
                      }`}
                    >
                      {Number(data.slice(8))}
                    </span>
                    {pessoas.slice(0, 3).map((p) => (
                      <span
                        key={p.id}
                        className={`truncate rounded px-1 text-[10px] leading-4 sm:text-[11px] ${
                          p.avisado_em ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                        }`}
                        title={`${p.membro?.nome ?? ""}${p.funcao ? ` (${p.funcao})` : ""}`}
                      >
                        {(p.membro?.nome ?? membroPorId.get(p.membro_id)?.nome ?? "?").split(" ")[0]}
                      </span>
                    ))}
                    {pessoas.length > 3 && <span className="px-1 text-[10px] text-slate-500">+{pessoas.length - 3}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ----- Dia aberto ----- */}
          {aberto && (
            <section className="cartao space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{maiuscula(dataLonga(aberto))}</h2>
                  {diasAbertos.map((d) => (
                    <p key={d.id} className="text-xs text-slate-500">
                      {d.titulo || "Escala"}
                      {d.horario && ` · ${horaCurta(d.horario)}`}
                      {d.observacao && ` · ${d.observacao}`}
                    </p>
                  ))}
                </div>
                {podeEditar && diasAbertos[0] && !diasAbertos[0].id.startsWith("tmp-") && (
                  <div className="relative flex items-center gap-1">
                    <FormDia departamentoId={departamento.id} mesPadrao={mes} dia={diasAbertos[0]} aoSalvar={() => router.refresh()} />
                    <form action={excluirDiaEscala}>
                      <input type="hidden" name="id" value={diasAbertos[0].id} />
                      <BotaoConfirmar mensagem="Limpar a escala deste dia?" rotulo="Limpar o dia" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <X size={16} />
                      </BotaoConfirmar>
                    </form>
                  </div>
                )}
              </div>

              <ul className="space-y-1.5">
                {pessoasDoDia(aberto).map((p) => {
                  const dia = diasAbertos.find((d) => d.id === p.escala_dia_id) ?? diasAbertos[0];
                  const nome = p.membro?.nome ?? membroPorId.get(p.membro_id)?.nome ?? "—";
                  const zap = p.membro?.whatsapp ?? membroPorId.get(p.membro_id)?.whatsapp ?? null;
                  const msg = mensagemAvisoEscala({ nome, funcao: p.funcao, dia, departamento: departamento.nome, remetente, hoje });
                  const provisorio = p.id.startsWith("tmp-");
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-sm">
                      <span className="font-medium">{nome}</span>
                      {podeEditar ? (
                        <input
                          defaultValue={p.funcao ?? ""}
                          placeholder="função"
                          aria-label={`Função de ${nome}`}
                          disabled={provisorio}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== p.funcao && !provisorio) {
                              mudarPessoa(p.id, { funcao: v });
                              iniciar(() => definirFuncaoPessoa(p.id, e.target.value));
                            }
                          }}
                          className="w-28 rounded border border-transparent bg-transparent px-1 text-xs text-slate-600 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none"
                        />
                      ) : (
                        p.funcao && <span className="text-xs text-slate-500">({p.funcao})</span>
                      )}
                      {podeEditar && (
                        <span className="ml-auto flex items-center gap-1">
                          <a
                            href={linkWhatsapp(zap, msg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              if (!p.avisado_em && !provisorio) {
                                mudarPessoa(p.id, { avisado_em: new Date().toISOString() });
                                iniciar(() => avisoPessoa(p.id, true));
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <MessageCircle size={12} /> Avisar
                          </a>
                          <button
                            type="button"
                            title={p.avisado_em ? "Avisado (toque para desmarcar)" : "Marcar como avisado"}
                            onClick={() => {
                              if (provisorio) return;
                              const novo = !p.avisado_em;
                              mudarPessoa(p.id, { avisado_em: novo ? new Date().toISOString() : null });
                              iniciar(() => avisoPessoa(p.id, novo));
                            }}
                            className={`rounded-md p-1 ${p.avisado_em ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}
                          >
                            <Check size={16} />
                          </button>
                          <button type="button" title={`Tirar ${nome} deste dia`} onClick={() => tirar(p.id)} className="rounded-md p-1 text-slate-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
                {pessoasDoDia(aberto).length === 0 && (
                  <li className="rounded-lg border border-dashed border-slate-200 px-2 py-3 text-center text-xs text-slate-400">
                    {podeEditar ? "Arraste (ou toque) um nome da equipe para este dia." : "Ninguém escalado neste dia."}
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
