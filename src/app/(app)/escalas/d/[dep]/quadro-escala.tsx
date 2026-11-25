"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, GripVertical, MessageCircle, Pencil, Plus, X } from "lucide-react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { dataLonga, fimDe, horaCurta, maiuscula } from "@/lib/datas";
import { mensagemAvisoEscala } from "@/lib/escalas";
import { linkWhatsapp } from "@/lib/resumo";
import type { EscalaDia, EscalaDiaPessoa, MembroDepartamento, Programacao } from "@/lib/tipos";
import {
  adicionarMembro,
  editarMembro,
  avisoPessoa,
  escalarNaData,
  excluirDiaEscala,
  removerMembro,
  removerPessoaDia,
} from "../../../acoes";
import { FormDia } from "./form-dia";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];


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
  hoje,
  mes,
  programacoes,
  diaInicial,
}: {
  departamento: { id: string; nome: string };
  membros: MembroDepartamento[];
  diasIniciais: EscalaDia[];
  podeEditar: boolean;
  hoje: string;
  mes: string; // yyyy-MM
  /** Programações locais da igreja no mês (só para consulta). */
  programacoes: Programacao[];
  /** Dia para abrir já selecionado (ex: vindo do lembrete de véspera). */
  diaInicial?: string | null;
}) {
  const router = useRouter();
  const [dias, setDias] = useState(diasIniciais);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(() => {
    if (diaInicial?.startsWith(mes)) return diaInicial;
    if (hoje.startsWith(mes)) return hoje;
    return diasIniciais[0]?.data ?? null;
  });
  const [erro, setErro] = useState("");
  const [editandoMembro, setEditandoMembro] = useState<string | null>(null);
  // "Avisar todos": fila de pessoas a avisar, uma de cada vez.
  const [fila, setFila] = useState<string[] | null>(null);
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
  const eventosDoDia = (data: string) =>
    programacoes
      .filter((p) => p.data <= data && fimDe(p) >= data)
      .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""));

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
  const pendentesDe = (data: string) => pessoasDoDia(data).filter((p) => !p.avisado_em && !p.id.startsWith("tmp-"));
  const amanha = format(new Date(parseISO(hoje).getTime() + 86_400_000), "yyyy-MM-dd");
  const atalhos = [
    { data: hoje, rotulo: "Hoje" },
    { data: amanha, rotulo: "Amanhã" },
  ].filter((a) => a.data.startsWith(mes) && pendentesDe(a.data).length > 0);

  function abrirDia(data: string) {
    setAberto(data);
    setFila(null);
    setTimeout(() => document.getElementById("painel-dia")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

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
              {membros.map((m) =>
                editandoMembro === m.id ? (
                <li key={m.id} className="w-full">
                  <form
                    action={async (f) => {
                      await editarMembro(f);
                      setEditandoMembro(null);
                      router.refresh();
                    }}
                    className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2"
                  >
                    <input type="hidden" name="id" value={m.id} />
                    <label className="block text-xs font-medium text-slate-600">
                      Nome
                      <input className="campo mt-0.5" name="nome" defaultValue={m.nome} required autoFocus />
                    </label>
                    <label className="block text-xs font-medium text-slate-600">
                      WhatsApp
                      <input className="campo mt-0.5" name="whatsapp" defaultValue={m.whatsapp ?? ""} inputMode="tel" placeholder="(opcional)" />
                    </label>
                    <div className="flex gap-2">
                      <button className="botao flex-1 py-1.5">Salvar</button>
                      <button type="button" onClick={() => setEditandoMembro(null)} className="botao-secundario flex-1 py-1.5">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </li>
                ) : (
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
                  <button
                    type="button"
                    onClick={() => setEditandoMembro(m.id)}
                    title={`Editar ${m.nome}`}
                    aria-label={`Editar ${m.nome}`}
                    className="rounded p-1 text-slate-400 hover:text-indigo-600 lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Pencil size={14} />
                  </button>
                  <form action={removerMembro} className="lg:opacity-0 lg:group-hover:opacity-100">
                    <input type="hidden" name="id" value={m.id} />
                    <BotaoConfirmar mensagem={`Tirar ${m.nome} da equipe? Ele continua nas escalas já feitas.`} rotulo={`Tirar ${m.nome}`} className="rounded p-1 text-slate-400 hover:text-red-600">
                      <X size={14} />
                    </BotaoConfirmar>
                  </form>
                </li>
                ),
              )}
              {membros.length === 0 && <li className="text-sm text-slate-500">Cadastre a equipe abaixo.</li>}
            </ul>
            <form
              action={async (f) => {
                await adicionarMembro(f);
                router.refresh();
              }}
              className="space-y-2 border-t border-slate-100 pt-3"
            >
              <h3 className="text-sm font-semibold text-slate-700">Adicionar associado</h3>
              <input type="hidden" name="departamento_id" value={departamento.id} />
              <input className="campo" name="nome" placeholder="Nome" required />
              <input className="campo" name="whatsapp" placeholder="WhatsApp (opcional)" inputMode="tel" />
              <button className="botao w-full bg-emerald-600 py-2.5 hover:bg-emerald-700"><Plus size={18} /> Adicionar à equipe</button>
            </form>
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          {podeEditar && atalhos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {atalhos.map((a) => (
                <button
                  key={a.data}
                  type="button"
                  onClick={() => abrirDia(a.data)}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  <MessageCircle size={15} />
                  {a.rotulo}: {pendentesDe(a.data).length} para avisar
                </button>
              ))}
            </div>
          )}

          {/* ----- Calendário do mês ----- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              {DIAS_SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grade.map((data) => {
                const doMes = data.startsWith(mes);
                const pessoas = pessoasDoDia(data);
                const eventos = doMes ? eventosDoDia(data) : [];
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
                      else {
                        setAberto(data);
                        setFila(null);
                      }
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
                    {eventos.slice(0, 1).map((e) => (
                      <span
                        key={e.id}
                        className="truncate rounded-r border-l-2 border-sky-500 bg-sky-50 px-1 text-[10px] leading-4 text-sky-900 sm:text-[11px]"
                        title={`Na igreja: ${e.titulo}`}
                      >
                        {e.hora_inicio && <b>{horaCurta(e.hora_inicio)} </b>}
                        {e.titulo}
                      </span>
                    ))}
                    {eventos.length > 1 && <span className="px-1 text-[10px] text-sky-700">+{eventos.length - 1} na igreja</span>}
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
            <section id="painel-dia" className="cartao scroll-mt-20 space-y-3">
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

              {podeEditar && !fila && pendentesDe(aberto).length > 0 && (
                <button
                  type="button"
                  onClick={() => setFila(pendentesDe(aberto).map((p) => p.id))}
                  className="botao w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
                >
                  <MessageCircle size={16} /> Avisar todos ({pendentesDe(aberto).length} pendentes)
                </button>
              )}

              {fila && fila.length > 0 && (() => {
                const p = pessoasDoDia(aberto).find((x) => x.id === fila[0]);
                if (!p) return null;
                const nome = p.membro?.nome ?? membroPorId.get(p.membro_id)?.nome ?? "—";
                const zap = p.membro?.whatsapp ?? membroPorId.get(p.membro_id)?.whatsapp ?? null;
                const dia = diasAbertos.find((d) => d.id === p.escala_dia_id) ?? diasAbertos[0];
                const msg = mensagemAvisoEscala({ nome, funcao: p.funcao, dia, departamento: departamento.nome, hoje });
                const avancar = () => setFila((f) => (f && f.length > 1 ? f.slice(1) : null));
                return (
                  <div className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3">
                    <p className="text-sm text-emerald-900">
                      Avisando <b>{nome}</b> · {fila.length === 1 ? "último da lista" : `faltam ${fila.length}`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={linkWhatsapp(zap, msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          mudarPessoa(p.id, { avisado_em: new Date().toISOString() });
                          iniciar(() => avisoPessoa(p.id, true));
                          setTimeout(avancar, 300);
                        }}
                        className="botao bg-emerald-600 hover:bg-emerald-700"
                      >
                        <MessageCircle size={16} /> Abrir WhatsApp de {nome}
                      </a>
                      <button type="button" onClick={avancar} className="botao-secundario">Pular</button>
                      <button type="button" onClick={() => setFila(null)} className="botao-secundario">Parar</button>
                    </div>
                    <p className="text-xs text-emerald-800">Envie no WhatsApp e volte aqui: a próxima pessoa já aparece.</p>
                  </div>
                );
              })()}

              {eventosDoDia(aberto).length > 0 && (
                <div className="space-y-1 rounded-lg border border-sky-100 bg-sky-50/60 p-2">
                  <p className="text-[11px] font-semibold tracking-wide text-sky-800 uppercase">Na igreja neste dia</p>
                  {eventosDoDia(aberto).map((e) => (
                    <Link key={e.id} href={`/programacoes/${e.id}`} className="block text-sm text-sky-900 hover:underline">
                      {e.hora_inicio && <b>{horaCurta(e.hora_inicio)} </b>}
                      {e.titulo}
                      {e.departamento?.sigla && <span className="ml-1 text-xs text-sky-700">({e.departamento.sigla})</span>}
                      {e.local && <span className="text-xs text-sky-700"> · {e.local}</span>}
                    </Link>
                  ))}
                </div>
              )}

              <ul className="space-y-1.5">
                {pessoasDoDia(aberto).map((p) => {
                  const dia = diasAbertos.find((d) => d.id === p.escala_dia_id) ?? diasAbertos[0];
                  const nome = p.membro?.nome ?? membroPorId.get(p.membro_id)?.nome ?? "—";
                  const zap = p.membro?.whatsapp ?? membroPorId.get(p.membro_id)?.whatsapp ?? null;
                  const msg = mensagemAvisoEscala({ nome, funcao: p.funcao, dia, departamento: departamento.nome, hoje });
                  const provisorio = p.id.startsWith("tmp-");
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-sm">
                      <span className="font-medium">{nome}</span>
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
