import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { AbasEscalas } from "@/components/abas-escalas";
import { departamentosComEquipe, listarDepartamentos, listarDiasEscala, listarMembros, listarProgramacoes } from "@/lib/consultas";
import { hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { textoEscalaMes } from "@/lib/escalas";
import { departamentosQueLidera, ehLideranca, podeEditarProgramacao } from "@/lib/permissoes";
import { linkWhatsapp, ultimoDiaDoMes } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { QuadroEscala } from "./quadro-escala";

export default async function EscalaDepartamento({
  params,
  searchParams,
}: {
  params: Promise<{ dep: string }>;
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const { dep } = await params;
  const { mes: mesParam, dia: diaParam } = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : hoje.slice(0, 7);

  const [departamentos, comEquipe] = await Promise.all([listarDepartamentos(supabase), departamentosComEquipe(supabase)]);
  const departamento = departamentos.find((d) => d.id === dep);
  if (!departamento) notFound();
  const [membros, dias, programacoesMes] = await Promise.all([
    listarMembros(supabase, dep),
    listarDiasEscala(supabase, dep, `${mes}-01`, ultimoDiaDoMes(mes)),
    listarProgramacoes(supabase, `${mes}-01`, ultimoDiaDoMes(mes)),
  ]);
  // Só as programações da igreja local, para o líder saber quando vai precisar de gente.
  const programacoesLocais = programacoesMes.filter((p) => p.origem === "local");

  const podeEditar = podeEditarProgramacao(perfil, { departamento_id: dep }, departamentos);
  const editaveis = new Set(departamentosQueLidera(perfil, departamentos).map((d) => d.id));
  const inicio = parseISO(`${mes}-01`);
  const [nomeMes, ano] = maiuscula(nomeDoMes(mes)).split(" de ");
  const link = (m: string) => `/escalas/d/${dep}?mes=${m}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Escala de {departamento.nome}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {nomeMes} <span className="font-normal text-slate-400">{ano}</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {mes !== hoje.slice(0, 7) && <Link href={link(hoje.slice(0, 7))} className="botao-secundario px-3 py-1.5">Hoje</Link>}
          <Link href={link(format(addMonths(inicio, -1), "yyyy-MM"))} className="botao-secundario px-2 py-1.5" aria-label="Mês anterior"><ChevronLeft size={18} /></Link>
          <Link href={link(format(addMonths(inicio, 1), "yyyy-MM"))} className="botao-secundario px-2 py-1.5" aria-label="Próximo mês"><ChevronRight size={18} /></Link>
        </div>
      </div>

      <AbasEscalas ativa={dep} departamentos={departamentos} comEquipe={comEquipe} editaveis={editaveis} podeAbrirOutros={ehLideranca(perfil)} />

      {dias.length > 0 && (
        <a
          href={linkWhatsapp(null, textoEscalaMes(departamento.nome, maiuscula(nomeDoMes(mes)), dias))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
        >
          <MessageCircle size={16} /> Compartilhar a escala do mês
        </a>
      )}

      <QuadroEscala
        departamento={{ id: departamento.id, nome: departamento.nome }}
        membros={membros}
        diasIniciais={dias}
        podeEditar={podeEditar}
        hoje={hoje}
        mes={mes}
        programacoes={programacoesLocais}
        urlBase={process.env.NEXT_PUBLIC_APP_URL || "https://iasdagenda-pvbl.onrender.com"}
        diaInicial={/^\d{4}-\d{2}-\d{2}$/.test(diaParam ?? "") ? diaParam : null}
      />
    </div>
  );
}
