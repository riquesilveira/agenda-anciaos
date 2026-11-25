import { addMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { NovoEventoRapido } from "@/components/novo-evento-rapido";
import { listarDepartamentos, listarProgramacoes } from "@/lib/consultas";
import { hojeISO } from "@/lib/datas";
import { departamentosParaCriar } from "@/lib/permissoes";
import { exigirPerfil } from "@/lib/sessao";
import { ORIGENS, type Origem } from "@/lib/tipos";
import { CalendarioInterativo } from "./calendario-interativo";

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dep?: string; origem?: string; dia?: string }>;
}) {
  const params = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : hoje.slice(0, 7);
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "") ? params.dia! : null;
  const origem = (Object.keys(ORIGENS) as Origem[]).includes(params.origem as Origem) ? (params.origem as Origem) : null;

  // Já manda o mês anterior e o próximo: trocar de mês fica instantâneo.
  const base = parseISO(`${mes}-01`);
  const meses = [-1, 0, 1].map((n) => format(addMonths(base, n), "yyyy-MM"));
  const de = format(startOfWeek(startOfMonth(addMonths(base, -1))), "yyyy-MM-dd");
  const ate = format(endOfWeek(endOfMonth(addMonths(base, 1))), "yyyy-MM-dd");

  const [departamentos, programacoes] = await Promise.all([listarDepartamentos(supabase), listarProgramacoes(supabase, de, ate)]);

  // "meus": departamentos que a pessoa acompanha (ancião responsável) ou lidera.
  const meusDeps = departamentos
    .filter((d) => d.anciao_id === perfil.id || d.lideres?.some((l) => l.perfil_id === perfil.id))
    .map((d) => d.id);
  const podeCriarEm = departamentosParaCriar(perfil, departamentos);
  const soLocal = perfil.papel === "lider";
  const podeCriar = !soLocal || podeCriarEm.length > 0;

  return (
    <div className="space-y-5">
      {podeCriar && <NovoEventoRapido departamentos={podeCriarEm} soLocal={soLocal} />}
      <CalendarioInterativo
        inicial={{ mes, dia, origem, dep: params.dep ?? "" }}
        mesesCarregados={meses}
        programacoesIniciais={programacoes}
        departamentos={departamentos}
        meusDeps={meusDeps}
        hoje={hoje}
        podeCriar={podeCriar}
      />
    </div>
  );
}
