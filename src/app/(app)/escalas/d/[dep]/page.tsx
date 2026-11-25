import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AbasEscalas } from "@/components/abas-escalas";
import { CabecalhoMes, TituloLateral } from "@/components/moldura";
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
  const [membros, dias, programacoesMes, { data: mensagem }] = await Promise.all([
    listarMembros(supabase, dep),
    listarDiasEscala(supabase, dep, `${mes}-01`, ultimoDiaDoMes(mes)),
    listarProgramacoes(supabase, `${mes}-01`, ultimoDiaDoMes(mes)),
    supabase.from("escala_mensagens").select("texto").eq("departamento_id", dep).maybeSingle<{ texto: string }>(),
  ]);
  // Só as programações da igreja local, para o líder saber quando vai precisar de gente.
  const programacoesLocais = programacoesMes.filter((p) => p.origem === "local");

  const podeEditar = podeEditarProgramacao(perfil, { departamento_id: dep }, departamentos);
  const editaveis = new Set(departamentosQueLidera(perfil, departamentos).map((d) => d.id));
  const link = (m: string) => `/escalas/d/${dep}?mes=${m}`;

  const abas = (vertical: boolean) => (
    <AbasEscalas
      ativa={dep}
      departamentos={departamentos}
      comEquipe={comEquipe}
      editaveis={editaveis}
      podeAbrirOutros={ehLideranca(perfil)}
      vertical={vertical}
    />
  );
  const compartilhar =
    dias.length > 0 ? (
      <a
        href={linkWhatsapp(null, textoEscalaMes(departamento.nome, maiuscula(nomeDoMes(mes)), dias))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        <MessageCircle size={16} /> Compartilhar a escala do mês
      </a>
    ) : null;

  return (
    <div className="space-y-4">
      <QuadroEscala
        departamento={{ id: departamento.id, nome: departamento.nome }}
        membros={membros}
        diasIniciais={dias}
        podeEditar={podeEditar}
        hoje={hoje}
        mes={mes}
        programacoes={programacoesLocais}
        urlBase={process.env.NEXT_PUBLIC_APP_URL || "https://iasdagenda-pvbl.onrender.com"}
        modeloMensagem={mensagem?.texto ?? null}
        diaInicial={/^\d{4}-\d{2}-\d{2}$/.test(diaParam ?? "") ? diaParam : null}
        lateral={
          <>
            <div className="space-y-2">
              <TituloLateral>Escalas</TituloLateral>
              {abas(true)}
            </div>
            {compartilhar}
          </>
        }
        cabecalho={
          <CabecalhoMes
            mes={mes}
            hoje={hoje}
            link={link}
            direita={<span className="hidden truncate text-sm font-medium text-slate-500 sm:inline">Escala de {departamento.nome}</span>}
          />
        }
        abasCelular={
          <div className="space-y-2">
            {abas(false)}
            {compartilhar}
          </div>
        }
      />
    </div>
  );
}
