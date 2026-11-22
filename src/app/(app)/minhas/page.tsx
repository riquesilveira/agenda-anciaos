import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { listarDepartamentos, listarPerfis, listarProgramacoes } from "@/lib/consultas";
import { hojeISO, horaCurta, nomeDoMes, periodoCurto, somarDias } from "@/lib/datas";
import {
  descreverPrazo,
  gerarResumo,
  JANELA_SEMANAL_DIAS,
  linkWhatsapp,
  mensagemParaLider,
  tratamento,
  type TipoResumo,
} from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { marcarAvisado } from "../acoes";

export default async function MinhasProgramacoes({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; mes?: string }>;
}) {
  const params = await searchParams;
  const tipo: TipoResumo = params.tipo === "mensal" ? "mensal" : "semanal";
  const { supabase, perfil } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);

  const [de, ate] =
    tipo === "mensal"
      ? [`${mes}-01`, format(addMonths(parseISO(`${mes}-01`), 1), "yyyy-MM-dd")]
      : [hoje, somarDias(hoje, JANELA_SEMANAL_DIAS)];

  const [departamentos, perfis, programacoes] = await Promise.all([
    listarDepartamentos(supabase),
    listarPerfis(supabase),
    listarProgramacoes(supabase, de, ate),
  ]);

  const resumo = gerarResumo({ tipo, destinatario: perfil, programacoes, departamentos, perfis, hoje, mes });
  const meusDeps = departamentos.filter((d) => d.anciao_id === perfil.id);
  const proximoMes = format(addMonths(parseISO(`${hoje.slice(0, 7)}-01`), 1), "yyyy-MM");

  const aba = (ativo: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm ${ativo ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-300"}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Minhas programações</h1>
        <p className="text-sm text-slate-500">
          {perfil.papel === "pastor"
            ? "Como pastor, você vê as programações de todos os departamentos."
            : meusDeps.length
              ? `Você acompanha: ${meusDeps.map((d) => d.nome).join(", ")}.`
              : "Você ainda não é responsável por nenhum departamento. Defina em Departamentos."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/minhas" className={aba(tipo === "semanal")}>Próximos {JANELA_SEMANAL_DIAS} dias</Link>
        <Link href={`/minhas?tipo=mensal&mes=${hoje.slice(0, 7)}`} className={aba(tipo === "mensal" && mes === hoje.slice(0, 7))}>
          <span className="capitalize">{nomeDoMes(hoje.slice(0, 7)).split(" ")[0]}</span>
        </Link>
        <Link href={`/minhas?tipo=mensal&mes=${proximoMes}`} className={aba(tipo === "mensal" && mes === proximoMes)}>
          <span className="capitalize">{nomeDoMes(proximoMes).split(" ")[0]}</span>
        </Link>
      </div>

      <section className="cartao space-y-4">
        <p className="font-medium">{resumo.introducao}</p>

        <ul className="space-y-3">
          {resumo.itens.map(({ programacao: p, departamento: d, diasRestantes, avisado, responsavel }) => (
            <li key={p.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/programacoes/${p.id}`} className="hover:underline">
                  <span className="font-medium">
                    {periodoCurto(p)}
                    {p.hora_inicio && ` ${horaCurta(p.hora_inicio)}`}: {p.titulo}
                  </span>
                  {d && <span className="text-slate-500"> ({d.nome})</span>}
                </Link>
                <span className="text-xs text-slate-500">
                  {descreverPrazo(diasRestantes)}
                </span>
              </div>

              {d && (
                <p className="mt-1 text-sm text-slate-600">
                  {responsavel
                    ? <>Você acompanha <b>{d.nome}</b>: lembre <b>{d.lider_nome ?? "o líder"}</b> sobre esta programação.</>
                    : <>Responsável: {(() => {
                        const a = perfis.find((x) => x.id === d.anciao_id);
                        return a ? tratamento(a) : "ninguém definido";
                      })()}.</>}
                </p>
              )}

              {d && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {avisado ? (
                    <span className="text-sm text-emerald-700">✅ Líder avisado</span>
                  ) : (
                    <span className="text-sm text-amber-700">⚠️ Ainda não avisado</span>
                  )}
                  {!avisado && (
                    <a
                      href={linkWhatsapp(d.lider_whatsapp, mensagemParaLider(p, d, perfil))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                  <form action={marcarAvisado}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="avisado" value={avisado ? "0" : "1"} />
                    <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100">
                      {avisado ? "Desfazer" : "Marcar avisado"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>

        {resumo.itens.length > 0 && (
          <a
            href={linkWhatsapp(null, resumo.texto)}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-secundario"
          >
            <MessageCircle size={16} /> Compartilhar este resumo no WhatsApp
          </a>
        )}
      </section>
    </div>
  );
}
