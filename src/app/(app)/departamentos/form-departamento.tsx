"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { limparSigla, sugerirSigla } from "@/lib/siglas";
import type { Departamento } from "@/lib/tipos";
import { criarDepartamento, editarDepartamento, type EstadoDepartamento } from "../acoes";
import { CaixaConvite } from "./caixa-convite";

type Pessoa = { id: string; rotulo: string };

/** Campos comuns: nome + sigla (sugerida enquanto a pessoa não mexer nela) + responsável. */
function CamposBasicos({ d, ancionato }: { d?: Departamento; ancionato: Pessoa[] }) {
  const [nome, setNome] = useState(d?.nome ?? "");
  const [sigla, setSigla] = useState(d?.sigla ?? "");
  const siglaManual = useRef(Boolean(d?.sigla));
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr]">
      <div>
        <label className="rotulo">Nome do departamento *</label>
        <input
          className="campo"
          name="nome"
          required
          value={nome}
          placeholder="Ex: Ação Solidária Adventista"
          onChange={(e) => {
            setNome(e.target.value);
            if (!siglaManual.current) setSigla(sugerirSigla(e.target.value));
          }}
        />
      </div>
      <div>
        <label className="rotulo">Sigla *</label>
        <input
          className="campo font-bold tracking-wide uppercase"
          name="sigla"
          required
          maxLength={6}
          value={sigla}
          placeholder="ASA"
          onChange={(e) => {
            siglaManual.current = true;
            setSigla(limparSigla(e.target.value));
          }}
        />
      </div>
      <div>
        <label className="rotulo">Responsável (ancionato)</label>
        <select className="campo" name="anciao_id" defaultValue={d?.anciao_id ?? ""}>
          <option value="">—</option>
          {ancionato.map((p) => (
            <option key={p.id} value={p.id}>{p.rotulo}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function NovoDepartamento({ ancionato }: { ancionato: Pessoa[] }) {
  const [aberto, setAberto] = useState(false);
  const [versao, setVersao] = useState(0); // remonta o formulário depois de criar
  const [estado, acao, enviando] = useActionState<EstadoDepartamento, FormData>(criarDepartamento, {});

  useEffect(() => {
    if (estado.ok && !estado.link && !estado.erro) {
      setAberto(false);
      setVersao((v) => v + 1);
    }
  }, [estado]);

  if (estado.ok && estado.link) {
    return (
      <div className="space-y-2">
        <CaixaConvite convite={estado} />
        <button className="botao-secundario" onClick={() => window.location.reload()}>
          <Plus size={16} /> Criar outro departamento
        </button>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button className="botao" onClick={() => setAberto(true)}>
        <Plus size={16} /> Novo departamento
      </button>
    );
  }

  return (
    <form
      key={versao}
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="cartao space-y-4"
    >
      <h2 className="font-semibold">Novo departamento</h2>
      <CamposBasicos ancionato={ancionato} />

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Líder (opcional)</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="rotulo">Nome</label>
            <input className="campo" name="lider_nome" />
          </div>
          <div>
            <label className="rotulo">E-mail</label>
            <input className="campo" name="lider_email" type="email" />
          </div>
          <div>
            <label className="rotulo">WhatsApp</label>
            <input className="campo" name="lider_whatsapp" inputMode="tel" placeholder="(44) 99999-9999" />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Com o e-mail preenchido, o sistema já gera o convite para o líder criar a senha. Sem e-mail, dá para convidar depois.
        </p>
      </fieldset>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao" disabled={enviando}>{enviando ? "Salvando…" : "Criar departamento"}</button>
        <button type="button" className="botao-secundario" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}

export function EditarDepartamento({ d, ancionato }: { d: Departamento; ancionato: Pessoa[] }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, enviando] = useActionState<EstadoDepartamento, FormData>(editarDepartamento, {});

  useEffect(() => {
    if (estado.ok) setAberto(false);
  }, [estado]);

  if (!aberto) {
    return (
      <button className="botao-secundario" onClick={() => setAberto(true)}>
        Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => acao(dados));
      }}
      className="w-full space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <input type="hidden" name="id" value={d.id} />
      <CamposBasicos d={d} ancionato={ancionato} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo">Nome do líder (para os lembretes)</label>
          <input className="campo" name="lider_nome" defaultValue={d.lider_nome ?? ""} />
        </div>
        <div>
          <label className="rotulo">WhatsApp do líder</label>
          <input className="campo" name="lider_whatsapp" inputMode="tel" defaultValue={d.lider_whatsapp ?? ""} />
        </div>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <div className="flex gap-2">
        <button className="botao" disabled={enviando}>{enviando ? "Salvando…" : "Salvar"}</button>
        <button type="button" className="botao-secundario" onClick={() => setAberto(false)}>Cancelar</button>
      </div>
    </form>
  );
}
