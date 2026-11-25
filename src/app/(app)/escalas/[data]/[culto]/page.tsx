import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Voltar } from "@/components/voltar";
import { listarEscala, listarPerfis, nomeDaIgreja } from "@/lib/consultas";
import { dataLonga, hojeISO, maiuscula } from "@/lib/datas";
import { ehLideranca } from "@/lib/permissoes";
import { CULTOS, cultoValido, mensagemConvite, mensagemLembrete } from "@/lib/pregacao";
import {
  linkWhatsapp,
} from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { liberarCulto } from "../../../acoes";
import { FormNovaPregacao } from "./form-nova-pregacao";
import { FormPregacao } from "./form-pregacao";

export default async function CultoPregacao({ params }: { params: Promise<{ data: string; culto: string }> }) {
  const { data, culto } = await params;
  if (!cultoValido(data, culto)) notFound();
  const { supabase, perfil } = await exigirPerfil();
  const [escala, perfis, igreja] = await Promise.all([listarEscala(supabase, data, data), listarPerfis(supabase), nomeDaIgreja(supabase)]);
  const p = escala.find((e) => e.culto === culto);
  const meu = p?.anciao_id === perfil.id;
  const ancionato = perfis.filter((x) => ehLideranca(x)).map((x) => ({ id: x.id, rotulo: x.nome }));
  const hoje = hojeISO();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Voltar href={`/escalas?mes=${data.slice(0, 7)}`} rotulo="Voltar às escalas" />
      <div>
        <p className="text-sm font-medium text-indigo-700">{CULTOS[culto].nome}</p>
        <h1 className="text-xl font-bold">{maiuscula(dataLonga(data))}</h1>
      </div>

      {!p && (
        ehLideranca(perfil) && data >= hoje ? (
          <FormNovaPregacao data={data} culto={culto} dataTexto={`${maiuscula(dataLonga(data))} · ${CULTOS[culto].curto}`} />
        ) : (
          <section className="cartao text-sm text-slate-600">Nenhum pregador cadastrado para este culto.</section>
        )
      )}

      {p && !meu && (
        <section className="cartao space-y-1 text-sm">
          <p><span className="text-slate-500">Pregador:</span> <b>{p.pregador_nome ?? "a definir"}</b></p>
          {p.observacoes && <p className="whitespace-pre-wrap"><span className="text-slate-500">Observação:</span> {p.observacoes}</p>}
          <p><span className="text-slate-500">Responsável:</span> {p.anciao?.nome ?? "—"}</p>
          <p className="pt-2 text-xs text-slate-500">Só o ancião responsável pode alterar este culto.</p>
        </section>
      )}

      {p && meu && (
        <>
          <section className="flex flex-wrap gap-2">
            <a
              href={linkWhatsapp(p.pregador_whatsapp, mensagemConvite(p, igreja, perfil))}
              target="_blank"
              rel="noopener noreferrer"
              className="botao bg-emerald-600 hover:bg-emerald-700"
            >
              <MessageCircle size={16} /> Enviar convite
            </a>
            <a
              href={linkWhatsapp(p.pregador_whatsapp, mensagemLembrete(p, igreja, perfil))}
              target="_blank"
              rel="noopener noreferrer"
              className="botao-secundario"
            >
              <MessageCircle size={16} /> Enviar lembrete
            </a>
          </section>
          {!p.pregador_whatsapp && (
            <p className="text-xs text-slate-500">Sem o WhatsApp do pregador, o botão abre o WhatsApp para você escolher o contato.</p>
          )}
          <FormPregacao p={p} dataTexto={`${maiuscula(dataLonga(data))} · ${CULTOS[culto].curto}`} ancionato={ancionato} euId={perfil.id} />
          <form action={liberarCulto} className="text-right">
            <input type="hidden" name="id" value={p.id} />
            <BotaoConfirmar
              mensagem="Liberar este culto? Ele volta a ficar sem ancião responsável e os dados do pregador são apagados."
              className="text-xs text-red-600 hover:underline"
            >
              Liberar este culto
            </BotaoConfirmar>
          </form>
        </>
      )}
    </div>
  );
}
