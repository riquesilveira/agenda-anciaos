import { notFound } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { FormProgramacao } from "@/components/form-programacao";
import { SeloOrigem } from "@/components/lista-programacoes";
import { listarDepartamentos, listarPerfis } from "@/lib/consultas";
import { dataLonga } from "@/lib/datas";
import { linkWhatsapp, mensagemParaLider, tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Programacao } from "@/lib/tipos";
import { excluirProgramacao, marcarAvisado } from "../../acoes";

export default async function DetalheProgramacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await exigirPerfil();

  const [{ data: p }, departamentos, perfis] = await Promise.all([
    supabase.from("programacoes").select("*, departamento:departamentos(*)").eq("id", id).maybeSingle<Programacao>(),
    listarDepartamentos(supabase),
    listarPerfis(supabase),
  ]);
  if (!p) notFound();

  const nome = (pid: string | null) => {
    const pessoa = perfis.find((x) => x.id === pid);
    return pessoa ? tratamento(pessoa) : "—";
  };
  const dep = p.departamento;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">{p.titulo}</h1>
        <SeloOrigem origem={p.origem} />
      </div>
      <p className="text-sm text-slate-500 capitalize">{dataLonga(p.data)}</p>

      {dep && (
        <section className="cartao space-y-3">
          <div className="text-sm">
            <div><span className="text-slate-500">Departamento:</span> {dep.nome}</div>
            <div><span className="text-slate-500">Ancião responsável:</span> {nome(dep.anciao_id)}</div>
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

      <FormProgramacao programacao={p} departamentos={departamentos} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Cadastrado por {nome(p.criado_por)} · última alteração por {nome(p.atualizado_por)}</span>
        <form action={excluirProgramacao}>
          <input type="hidden" name="id" value={p.id} />
          <BotaoConfirmar mensagem="Excluir esta programação?" className="flex items-center gap-1 text-red-600 hover:underline">
            <Trash2 size={14} /> Excluir programação
          </BotaoConfirmar>
        </form>
      </div>
    </div>
  );
}
