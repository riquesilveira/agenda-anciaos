import { notFound } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Voltar } from "@/components/voltar";
import { FormProgramacao } from "@/components/form-programacao";
import { SeloOrigem } from "@/components/lista-programacoes";
import { listarDepartamentos, listarPerfis } from "@/lib/consultas";
import { mensagemNovaProgramacao } from "@/lib/avisos";
import { dataLonga, horaCurta, maiuscula } from "@/lib/datas";
import { departamentosParaCriar, ehLideranca, podeEditarProgramacao } from "@/lib/permissoes";
import {
  linkWhatsapp,
  mensagemParaLider,
} from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Programacao } from "@/lib/tipos";
import { excluirProgramacao, marcarAvisado } from "../../acoes";
import { URL_SITE } from "@/lib/url";

export default async function DetalheProgramacao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criado?: string }>;
}) {
  const { id } = await params;
  const { criado } = await searchParams;
  const { supabase, perfil } = await exigirPerfil();

  const [{ data: p }, departamentos, perfis] = await Promise.all([
    supabase.from("programacoes").select("*, departamento:departamentos(*)").eq("id", id).maybeSingle<Programacao>(),
    listarDepartamentos(supabase),
    listarPerfis(supabase),
  ]);
  if (!p) notFound();

  const nome = (pid: string | null) => {
    const pessoa = perfis.find((x) => x.id === pid);
    return pessoa?.nome ?? "—";
  };
  const dep = p.departamento;
  // Programação do distrito cadastrada por outra igreja: só leitura aqui.
  const deOutraIgreja = p.igreja_id !== perfil.igreja_id;
  const podeEditar = !deOutraIgreja && podeEditarProgramacao(perfil, p, departamentos);
  const lideranca = ehLideranca(perfil);
  const autor = perfis.find((x) => x.id === p.criado_por);
  const aviso = mensagemNovaProgramacao(p, autor, `${URL_SITE}/programacoes/${p.id}`);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Voltar href={`/?mes=${p.data.slice(0, 7)}`} />

      {criado && (
        <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="mb-2 font-medium">✅ Programação criada! Avise os outros líderes:</p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={linkWhatsapp(null, aviso)}
              target="_blank"
              rel="noopener noreferrer"
              className="botao bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle size={16} /> Avisar no WhatsApp
            </a>
            <span className="text-xs text-emerald-800">
              Escolha o grupo dos líderes. Ela também já aparece em Novidades para todos.
            </span>
          </div>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">{p.titulo}</h1>
        <SeloOrigem origem={p.origem} fonte={p.fonte} />
      </div>
      {deOutraIgreja && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Programação do distrito cadastrada por outra igreja. Só ela pode alterar.
        </p>
      )}
      <p className="text-sm text-slate-500">
        <span>{maiuscula(dataLonga(p.data))}</span>
        {p.data_fim && p.data_fim !== p.data && <> até {dataLonga(p.data_fim)}</>}
      </p>

      {p.local || p.hora_inicio || p.descricao ? (
        <section className="cartao space-y-1 text-sm">
          {p.hora_inicio && (
            <div>
              <span className="text-slate-500">Horário:</span> {horaCurta(p.hora_inicio)}
              {p.hora_fim && ` às ${horaCurta(p.hora_fim)}`}
            </div>
          )}
          {p.local && <div><span className="text-slate-500">Local:</span> {p.local}</div>}
          {p.descricao && <div className="whitespace-pre-wrap text-slate-700">{p.descricao}</div>}
        </section>
      ) : null}

      {dep && !lideranca && (
        <section className="cartao text-sm">
          <div><span className="text-slate-500">Departamento:</span> {dep.nome}</div>
          <div><span className="text-slate-500">Responsável:</span> {nome(dep.anciao_id)}</div>
        </section>
      )}

      {dep && lideranca && (
        <section className="cartao space-y-3">
          <div className="text-sm">
            <div><span className="text-slate-500">Departamento:</span> {dep.nome}</div>
            <div><span className="text-slate-500">Responsável:</span> {nome(dep.anciao_id)}</div>
            <div><span className="text-slate-500">Líder:</span> {dep.lider_nome ?? "não cadastrado"}</div>
          </div>

          {p.lider_avisado_em ? (
            <p className="text-sm text-emerald-700">
              ✅ Líder avisado por {nome(p.lider_avisado_por)} em{" "}
              {new Date(p.lider_avisado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          ) : (
            <p className="text-sm text-amber-700">⚠️ Líder ainda não avisado</p>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsapp(dep.lider_whatsapp, mensagemParaLider(p, dep, perfil))}
              target="_blank"
              rel="noopener noreferrer"
              className="botao bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle size={16} /> Lembrar líder no WhatsApp
            </a>
            <form action={marcarAvisado}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="avisado" value={p.lider_avisado_em ? "0" : "1"} />
              <button className="botao-secundario">{p.lider_avisado_em ? "Desfazer \"avisado\"" : "Marcar como avisado"}</button>
            </form>
          </div>
        </section>
      )}

      {podeEditar ? (
        <section className="space-y-2">
          <h2 className="font-semibold">Editar programação</h2>
          <FormProgramacao
            programacao={p}
            departamentos={departamentosParaCriar(perfil, departamentos)}
            soLocal={perfil.papel === "lider"}
          />
        </section>
      ) : (
        <p className="text-xs text-slate-500">
          {deOutraIgreja
            ? "Para mudar algo, fale com a igreja que cadastrou."
            : "Só o líder deste departamento e os anciãos podem editar esta programação."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Cadastrado por {nome(p.criado_por)} · última alteração por {nome(p.atualizado_por)}</span>
        {podeEditar && (
        <form action={excluirProgramacao}>
          <input type="hidden" name="id" value={p.id} />
          <BotaoConfirmar mensagem="Excluir esta programação?" className="flex items-center gap-1 text-red-600 hover:underline">
            <Trash2 size={14} /> Excluir programação
          </BotaoConfirmar>
        </form>
        )}
      </div>
    </div>
  );
}
