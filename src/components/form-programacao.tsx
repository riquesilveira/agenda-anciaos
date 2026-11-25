"use client";

import { startTransition, useActionState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { salvarProgramacao, type EstadoFormProgramacao } from "@/app/(app)/acoes";
import { horaCurta, periodoCurto } from "@/lib/datas";
import { ORIGENS, type Departamento, type Origem, type Programacao } from "@/lib/tipos";

export function FormProgramacao({
  programacao,
  departamentos,
  dataInicial,
  soLocal = false,
}: {
  programacao?: Programacao;
  /** Só os departamentos em que a pessoa pode cadastrar. */
  departamentos: Departamento[];
  dataInicial?: string;
  /** Líder: origem fixa "local" e departamento obrigatório. */
  soLocal?: boolean;
}) {
  const [estado, acao, enviando] = useActionState<EstadoFormProgramacao, FormData>(salvarProgramacao, {});
  const confirmar = useRef<HTMLInputElement>(null);
  const p = programacao;

  return (
    <form
      // onSubmit manual (em vez de action=) para o React não limpar os campos
      // quando a resposta é só um aviso de conflito.
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="cartao space-y-4"
      // Qualquer alteração depois do aviso exige nova verificação.
      onChange={() => confirmar.current && (confirmar.current.value = "")}
    >
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="confirmar" ref={confirmar} defaultValue="" />

      <div>
        <label className="rotulo" htmlFor="titulo">Título *</label>
        <input className="campo" id="titulo" name="titulo" required defaultValue={p?.titulo} placeholder="Ex: Culto Jovem" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="data">Data *</label>
          <input className="campo" id="data" name="data" type="date" required defaultValue={p?.data ?? dataInicial} />
        </div>
        <div>
          <label className="rotulo" htmlFor="data_fim">Até (se durar vários dias)</label>
          <input className="campo" id="data_fim" name="data_fim" type="date" defaultValue={p?.data_fim ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="hora_inicio">Início</label>
          <input className="campo" id="hora_inicio" name="hora_inicio" type="time" defaultValue={p?.hora_inicio?.slice(0, 5)} />
        </div>
        <div>
          <label className="rotulo" htmlFor="hora_fim">Término</label>
          <input className="campo" id="hora_fim" name="hora_fim" type="time" defaultValue={p?.hora_fim?.slice(0, 5)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {soLocal ? (
          <input type="hidden" name="origem" value="local" />
        ) : (
          <div>
            <label className="rotulo" htmlFor="origem">Origem *</label>
            <select className="campo" id="origem" name="origem" defaultValue={p?.origem ?? "local"}>
              {(Object.keys(ORIGENS) as Origem[]).map((o) => (
                <option key={o} value={o}>{ORIGENS[o].nome}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="rotulo" htmlFor="departamento_id">Departamento</label>
          <select
            className="campo"
            id="departamento_id"
            name="departamento_id"
            required={soLocal}
            defaultValue={p?.departamento_id ?? (soLocal && departamentos.length === 1 ? departamentos[0].id : "")}
          >
            {!soLocal && <option value="">Igreja toda / sem departamento</option>}
            {departamentos.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="rotulo" htmlFor="local">Local</label>
        <input className="campo" id="local" name="local" defaultValue={p?.local ?? ""} placeholder="Ex: Templo, Salão Social" />
      </div>

      <div>
        <label className="rotulo" htmlFor="descricao">Descrição</label>
        <textarea className="campo" id="descricao" name="descricao" rows={3} defaultValue={p?.descricao ?? ""} />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      {estado.conflitos && estado.conflitos.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="mb-2 flex items-center gap-2 font-medium">
            <AlertTriangle size={16} /> Atenção: possível conflito
          </p>
          <ul className="mb-3 list-disc space-y-1 pl-5">
            {estado.conflitos.map((c) => (
              <li key={c.programacao.id + c.motivo}>
                {c.mensagem}{" "}
                <span className="text-amber-700">
                  ({periodoCurto(c.programacao)}
                  {c.programacao.hora_inicio && ` ${horaCurta(c.programacao.hora_inicio)}`})
                </span>
              </li>
            ))}
          </ul>
          <button
            type="submit"
            className="botao bg-amber-600 hover:bg-amber-700"
            disabled={enviando}
            onClick={() => confirmar.current && (confirmar.current.value = "1")}
          >
            Salvar mesmo assim
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button className="botao" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
      </div>
    </form>
  );
}
