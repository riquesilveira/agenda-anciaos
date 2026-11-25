import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarioMes } from "@/components/calendario-mes";
import { FiltroDepartamento } from "@/components/filtro-departamento";
import { CabecalhoMes, Moldura, TituloLateral } from "@/components/moldura";
import { ListaProgramacoes } from "@/components/lista-programacoes";
import { NovoEventoRapido } from "@/components/novo-evento-rapido";
import { departamentosParaCriar } from "@/lib/permissoes";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { dataLonga, fimDe, hojeISO, maiuscula } from "@/lib/datas";
import { exigirPerfil } from "@/lib/sessao";
import { ORIGENS, type Origem, type Programacao } from "@/lib/tipos";

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dep?: string; origem?: string; dia?: string }>;
}) {
  const params = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);
  // Dia selecionado (toque no celular ou "+N" no computador): a lista mostra só ele.
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "") ? params.dia! : null;

  const inicioMes = parseISO(`${mes}-01`);
  const inicioGrade = startOfWeek(startOfMonth(inicioMes));
  const fimGrade = endOfWeek(endOfMonth(inicioMes));
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade }).map((d) => format(d, "yyyy-MM-dd"));

  const [departamentos, todas] = await Promise.all([
    listarDepartamentos(supabase),
    listarProgramacoes(supabase, dias[0], dias[dias.length - 1]),
  ]);

  // "meus": departamentos que a pessoa acompanha (ancião responsável) ou lidera.
  const meusDeps = new Set(
    departamentos
      .filter((d) => d.anciao_id === perfil.id || d.lideres?.some((l) => l.perfil_id === perfil.id))
      .map((d) => d.id),
  );
  // Origens visíveis (caixinhas da lateral). Sem parâmetro = todas.
  const todasOrigens = Object.keys(ORIGENS) as Origem[];
  const marcadas = new Set(
    (params.origem ?? "").split(",").filter((o): o is Origem => todasOrigens.includes(o as Origem)),
  );
  const visiveis = marcadas.size ? marcadas : new Set(todasOrigens);

  const programacoes = todas.filter(
    (p) =>
      (!params.dep ||
        (params.dep === "meus" ? Boolean(p.departamento_id && meusDeps.has(p.departamento_id)) : p.departamento_id === params.dep)) &&
      visiveis.has(p.origem),
  );
  // Eventos de vários dias aparecem em cada dia do período.
  const porDia = new Map<string, Programacao[]>();
  for (const dia of dias) {
    porDia.set(
      dia,
      programacoes
        .filter((p) => p.data <= dia && fimDe(p) >= dia)
        // sem horário (o dia todo / vários dias) primeiro, depois por horário
        .sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? "")),
    );
  }

  const link = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const tudo = { mes, dep: params.dep, origem: params.origem, ...extra };
    Object.entries(tudo).forEach(([k, v]) => v && q.set(k, v));
    return `/?${q}`;
  };

  const doMes = programacoes.filter((p) => p.data <= `${mes}-31` && fimDe(p) >= `${mes}-01`);

  const linkSemDep = (() => {
    const q = new URLSearchParams();
    Object.entries({ mes, origem: params.origem }).forEach(([k, v]) => v && q.set(k, v));
    const t = q.toString();
    return t ? `/?${t}&` : "/?";
  })();

  // Abas de origem (no lugar de Dia/Semana/Mês). "ANP" é a Associação desta igreja.
  const origemAtiva = marcadas.size === 1 ? [...marcadas][0] : null;
  const ROTULO_ORIGEM: Record<Origem, string> = { local: "Local", distrito: "Distrito", associacao: "ANP" };
  const abasOrigem = (
    <nav className="flex rounded-xl bg-slate-100 p-1" aria-label="Origem">
      {([null, "local", "distrito", "associacao"] as (Origem | null)[]).map((o) => {
        const ativa = origemAtiva === o;
        return (
          <Link
            key={o ?? "todos"}
            href={link({ origem: o ?? undefined, dia: undefined })}
            aria-current={ativa ? "page" : undefined}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition ${
              ativa ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {o && <span className={`h-2 w-2 rounded-full ${ORIGENS[o].ponto}`} />}
            {o ? ROTULO_ORIGEM[o] : "Todos"}
          </Link>
        );
      })}
    </nav>
  );

  const podeCriarEm = departamentosParaCriar(perfil, departamentos);
  const soLocal = perfil.papel === "lider";
  const podeCriar = !soLocal || podeCriarEm.length > 0;

  return (
    <div className="space-y-5">
      {podeCriar && <NovoEventoRapido departamentos={podeCriarEm} soLocal={soLocal} />}
      <Moldura
        lateral={
          <>
            <Link href="/programacoes/nova" className="botao w-full py-2.5">
              <Plus size={18} /> Nova programação
            </Link>
            <div className="space-y-2">
              <TituloLateral>Departamento</TituloLateral>
              <FiltroDepartamento departamentos={departamentos} valor={params.dep ?? ""} linkBase={linkSemDep} />
            </div>
            <Link
              href="/minhas"
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
            >
              <Bell size={16} /> Minhas programações
            </Link>
          </>
        }
      >
        <CabecalhoMes
          mes={mes}
          hoje={hoje}
          link={(m) => link({ mes: m, dia: undefined })}
          direita={
            <>
              <div className="hidden sm:block">{abasOrigem}</div>
              <Link href="/minhas" className="botao-secundario px-2.5 py-1.5 sm:hidden" aria-label="Minhas programações" title="Minhas programações">
                <Bell size={16} />
              </Link>
            </>
          }
        />
        <div className="space-y-2.5 px-4 pb-3 sm:hidden">{abasOrigem}</div>
        <div className="px-4 pb-3 lg:hidden">
          <FiltroDepartamento departamentos={departamentos} valor={params.dep ?? ""} linkBase={linkSemDep} />
        </div>
        <CalendarioMes
          dias={dias}
          porDia={porDia}
          mesAtual={mes}
          hoje={hoje}
          diaSelecionado={dia}
          linkDoDia={(d) => `${link({ dia: d })}#lista`}
          podeCriar={podeCriar}
        />
      </Moldura>

      <section id="lista" className="scroll-mt-4 space-y-3">
        {dia ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{maiuscula(dataLonga(dia))}</h2>
              <Link href={link({})} className="botao-secundario">Mês todo</Link>
            </div>
            <ListaProgramacoes programacoes={porDia.get(dia) ?? programacoes.filter((p) => p.data <= dia && fimDe(p) >= dia)} hoje={hoje} />
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">
              Programações do mês <span className="text-sm font-normal text-slate-400">({doMes.length})</span>
            </h2>
            <ListaProgramacoes programacoes={doMes} hoje={hoje} />
          </>
        )}
      </section>
    </div>
  );
}
