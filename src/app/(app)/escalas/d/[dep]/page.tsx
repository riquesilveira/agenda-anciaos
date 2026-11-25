import { notFound } from "next/navigation";
import { AbasEscalas } from "@/components/abas-escalas";
import { CompartilharImagem } from "@/components/compartilhar-imagem";
import { CabecalhoMes, TituloLateral } from "@/components/moldura";
import { departamentosComEquipe, listarDepartamentos, listarDiasEscala, listarMembros, listarPerfis, listarProgramacoes, nomeDaIgreja } from "@/lib/consultas";
import { hojeISO, horaCurta, maiuscula, nomeDoMes } from "@/lib/datas";
import { fotosDosMembros } from "@/lib/escalas";
import { departamentosQueLidera, ehLideranca, podeEditarProgramacao } from "@/lib/permissoes";
import { ultimoDiaDoMes } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import { QuadroEscala } from "./quadro-escala";
import { URL_SITE } from "@/lib/url";

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

  const [departamentos, comEquipe, igreja] = await Promise.all([
    listarDepartamentos(supabase),
    departamentosComEquipe(supabase),
    nomeDaIgreja(supabase),
  ]);
  const departamento = departamentos.find((d) => d.id === dep);
  if (!departamento) notFound();
  const [membrosBase, diasBase, programacoesMes, { data: mensagem }, perfis] = await Promise.all([
    listarMembros(supabase, dep),
    listarDiasEscala(supabase, dep, `${mes}-01`, ultimoDiaDoMes(mes)),
    listarProgramacoes(supabase, `${mes}-01`, ultimoDiaDoMes(mes)),
    supabase.from("escala_mensagens").select("texto").eq("departamento_id", dep).maybeSingle<{ texto: string }>(),
    listarPerfis(supabase),
  ]);
  // Quem tem conta no sistema aparece com a foto da conta (iniciais quando não tem).
  const fotos = fotosDosMembros(membrosBase, perfis);
  const comFoto = <T extends { id: string; foto_url: string | null }>(m: T): T => ({ ...m, foto_url: m.foto_url ?? fotos.get(m.id) ?? null });
  const membros = membrosBase.map(comFoto);
  const dias = diasBase.map((d) => ({ ...d, pessoas: (d.pessoas ?? []).map((p) => ({ ...p, membro: p.membro ? comFoto(p.membro) : p.membro })) }));
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
      <CompartilharImagem
        titulo={`Escala de ${departamento.nome}`}
        mes={maiuscula(nomeDoMes(mes))}
        igreja={igreja}
        linhas={dias.map((d) => ({
          data: d.data,
          titulo: [d.titulo, d.horario ? horaCurta(d.horario) : null].filter(Boolean).join(" · "),
          nomes: (d.pessoas ?? []).map((p) => `${p.membro?.nome ?? "?"}${p.funcao ? ` (${p.funcao})` : ""}`),
        }))}
        arquivo={`escala-${departamento.nome.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}-${mes}.png`}
        rotulo="Compartilhar a escala do mês"
      />
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
        urlBase={URL_SITE}
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
