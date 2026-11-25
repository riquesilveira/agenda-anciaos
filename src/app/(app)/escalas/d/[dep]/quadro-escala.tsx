"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, GripVertical, MessageCircle, Plus, X } from "lucide-react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { horaCurta } from "@/lib/datas";
import { mensagemAvisoEscala } from "@/lib/escalas";
import { linkWhatsapp } from "@/lib/resumo";
import type { EscalaDia, EscalaDiaPessoa, MembroDepartamento, Perfil } from "@/lib/tipos";
import {
  adicionarMembro,
  adicionarPessoaDia,
  avisoPessoa,
  definirFuncaoPessoa,
  excluirDiaEscala,
  removerMembro,
  removerPessoaDia,
} from "../../../acoes";
import { FormDia } from "./form-dia";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

type Remetente = Pick<Perfil, "nome" | "papel" | "tratamento">;

/**
 * Quadro da escala: equipe de um lado, dias do outro.
 * Computador: arrastar o nome até o dia. Celular: tocar no nome e depois no dia.
 */
export function QuadroEscala({
  departamento,
  membros,
  diasIniciais,
  podeEditar,
  remetente,
  hoje,
  mesPadrao,
}: {
  departamento: { id: string; nome: string };
  membros: MembroDepartamento[];
  diasIniciais: EscalaDia[];
  podeEditar: boolean;
  remetente: Remetente;
  hoje: string;
  mesPadrao: string; // yyyy-MM, para a data sugerida do novo dia
}) {
  const router = useRouter();
  const [dias, setDias] = useState(diasIniciais);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [, iniciar] = useTransition();
  const membroPorId = new Map(membros.map((m) => [m.id, m]));

  // Quando o servidor manda dados novos (refresh), atualiza o quadro.
  useEffect(() => setDias(diasIniciais), [diasIniciais]);

  function escalar(diaId: string, membroId: string) {
    const membro = membroPorId.get(membroId);
    if (!membro) return;
    const temporario: EscalaDiaPessoa = {
      id: `tmp-${Date.now()}`,
      escala_dia_id: diaId,
      membro_id: membroId,
      funcao: null,
      avisado_em: null,
      ordem: 999,
      membro,
    };
    setDias((ds) => ds.map((d) => (d.id === diaId ? { ...d, pessoas: [...(d.pessoas ?? []), temporario] } : d)));
    setSelecionado(null);
    iniciar(async () => {
      const r = await adicionarPessoaDia(diaId, membroId);
      if (r.erro) {
        setErro(r.erro);
        setDias((ds) => ds.map((d) => (d.id === diaId ? { ...d, pessoas: (d.pessoas ?? []).filter((p) => p.id !== temporario.id) } : d)));
      } else {
        setDias((ds) =>
          ds.map((d) =>
            d.id === diaId ? { ...d, pessoas: (d.pessoas ?? []).map((p) => (p.id === temporario.id ? { ...p, id: r.id! } : p)) } : d,
          ),
        );
      }
    });
  }

  function tirar(diaId: string, pessoaId: string) {
    setDias((ds) => ds.map((d) => (d.id === diaId ? { ...d, pessoas: (d.pessoas ?? []).filter((p) => p.id !== pessoaId) } : d)));
    if (!pessoaId.startsWith("tmp-")) iniciar(() => removerPessoaDia(pessoaId));
  }

  function mudarPessoa(diaId: string, pessoaId: string, mudanca: Partial<EscalaDiaPessoa>) {
    setDias((ds) =>
      ds.map((d) => (d.id === diaId ? { ...d, pessoas: (d.pessoas ?? []).map((p) => (p.id === pessoaId ? { ...p, ...mudanca } : p)) } : d)),
    );
  }

  return (
    <div className="space-y-4">
      {erro && (
        <p className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
          <button onClick={() => setErro("")} aria-label="Fechar"><X size={16} /></button>
        </p>
      )}

      <div className={`grid gap-4 ${podeEditar ? "lg:grid-cols-[16rem_1fr]" : ""}`}>
        {/* ----- Equipe ----- */}
        {podeEditar && (
          <aside className="cartao h-fit space-y-3 lg:sticky lg:top-20">
            <div>
              <h2 className="font-semibold">Equipe de {departamento.nome}</h2>
              <p className="text-xs text-slate-500">
                <span className="hidden lg:inline">Arraste um nome até o dia.</span>
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
              <button className="botao-secundario w-full"><Plus size={16} /> Adicionar à equipe</button>
            </form>
          </aside>
        )}

        {/* ----- Dias ----- */}
        <div className="space-y-3">
          {podeEditar && <FormDia departamentoId={departamento.id} mesPadrao={mesPadrao} aoSalvar={() => router.refresh()} />}

          {dias.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Nenhum dia na escala deste mês.{podeEditar && " Use “Novo dia” para começar."}
            </p>
          )}

          {dias.map((d) => {
            const data = parseISO(d.data);
            const passou = d.data < hoje;
            const aceitando = podeEditar && (selecionado || alvo === d.id);
            return (
              <section
                key={d.id}
                onDragOver={(e) => {
                  if (!podeEditar) return;
                  e.preventDefault();
                  setAlvo(d.id);
                }}
                onDragLeave={() => setAlvo((a) => (a === d.id ? null : a))}
                onDrop={(e) => {
                  e.preventDefault();
                  setAlvo(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) escalar(d.id, id);
                }}
                onClick={() => selecionado && escalar(d.id, selecionado)}
                className={`rounded-xl border bg-white p-3 shadow-sm transition ${passou ? "opacity-60" : ""} ${
                  alvo === d.id
                    ? "border-indigo-500 ring-2 ring-indigo-300"
                    : aceitando
                      ? "cursor-pointer border-dashed border-indigo-400 hover:bg-indigo-50"
                      : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-indigo-50 py-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                      {format(data, "MMM", { locale: ptBR }).replace(".", "")}
                    </span>
                    <span className="text-2xl leading-none font-bold">{data.getDate()}</span>
                    <span className="text-[11px] text-slate-500">{DIAS[data.getDay()]}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{d.titulo || "Escala"}</p>
                        <p className="text-xs text-slate-500">
                          {d.horario ? horaCurta(d.horario) : "Horário a definir"}
                          {d.observacao && ` · ${d.observacao}`}
                        </p>
                      </div>
                      {podeEditar && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <FormDia departamentoId={departamento.id} mesPadrao={mesPadrao} dia={d} aoSalvar={() => router.refresh()} />
                          <form action={excluirDiaEscala}>
                            <input type="hidden" name="id" value={d.id} />
                            <BotaoConfirmar mensagem="Excluir este dia da escala?" rotulo="Excluir dia" className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <X size={16} />
                            </BotaoConfirmar>
                          </form>
                        </div>
                      )}
                    </div>

                    <ul className="mt-2 space-y-1.5">
                      {(d.pessoas ?? []).map((p) => {
                        const nome = p.membro?.nome ?? membroPorId.get(p.membro_id)?.nome ?? "—";
                        const zap = p.membro?.whatsapp ?? membroPorId.get(p.membro_id)?.whatsapp ?? null;
                        const msg = mensagemAvisoEscala({ nome, funcao: p.funcao, dia: d, departamento: departamento.nome, remetente, hoje });
                        return (
                          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-sm" onClick={(e) => e.stopPropagation()}>
                            <span className="font-medium">{nome}</span>
                            {podeEditar ? (
                              <input
                                defaultValue={p.funcao ?? ""}
                                placeholder="função"
                                aria-label={`Função de ${nome}`}
                                onBlur={(e) => {
                                  if ((e.target.value.trim() || null) !== p.funcao && !p.id.startsWith("tmp-")) {
                                    mudarPessoa(d.id, p.id, { funcao: e.target.value.trim() || null });
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
                                    if (!p.avisado_em && !p.id.startsWith("tmp-")) {
                                      mudarPessoa(d.id, p.id, { avisado_em: new Date().toISOString() });
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
                                    if (p.id.startsWith("tmp-")) return;
                                    const novo = !p.avisado_em;
                                    mudarPessoa(d.id, p.id, { avisado_em: novo ? new Date().toISOString() : null });
                                    iniciar(() => avisoPessoa(p.id, novo));
                                  }}
                                  className={`rounded-md p-1 ${p.avisado_em ? "text-emerald-600" : "text-slate-300 hover:text-slate-500"}`}
                                >
                                  <Check size={16} />
                                </button>
                                <button type="button" title={`Tirar ${nome} deste dia`} onClick={() => tirar(d.id, p.id)} className="rounded-md p-1 text-slate-400 hover:text-red-600">
                                  <X size={14} />
                                </button>
                              </span>
                            )}
                          </li>
                        );
                      })}
                      {(d.pessoas ?? []).length === 0 && (
                        <li className="rounded-lg border border-dashed border-slate-200 px-2 py-2 text-center text-xs text-slate-400">
                          {podeEditar ? "Arraste (ou toque) um nome da equipe aqui" : "Ninguém escalado ainda"}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
