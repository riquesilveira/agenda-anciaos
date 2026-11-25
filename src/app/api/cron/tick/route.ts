import { NextResponse } from "next/server";
import { FUSO, hojeISO, somarDias } from "@/lib/datas";
import { lembretesDeVespera, type PendentesDoDepartamento } from "@/lib/escalas";
import { enviarPush } from "@/lib/push";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

const TAREFA = "lembrete_vespera_escala";
const HORA = 18; // a partir das 18h (Brasília)

/**
 * Chamado pelo keep-alive a cada ~10 min (.github/workflows/keep-alive.yml).
 * A partir das 18h, uma vez por dia, avisa os líderes (notificação no celular)
 * de quem eles precisam avisar na escala de amanhã. Chamadas repetidas não
 * reenviam: o controle fica em execucoes_agendadas.
 */
export async function GET() {
  const agora = new Date();
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: FUSO, hour: "numeric", hour12: false }).format(agora));
  const hoje = hojeISO(agora);
  if (hora < HORA) return NextResponse.json({ ok: true, aguardando: `${HORA}h` });

  const db = supabaseAdmin();
  const { error: jaFoi } = await db.from("execucoes_agendadas").insert({ tarefa: TAREFA, dia: hoje });
  if (jaFoi) return NextResponse.json({ ok: true, jaExecutado: hoje });

  const amanha = somarDias(hoje, 1);
  const { data: dias, error } = await db
    .from("escala_dias")
    .select(
      "departamento_id, departamento:departamentos(id, nome, anciao_id, lideres:departamento_lideres(perfil_id)), pessoas:escala_dia_pessoas(avisado_em, membro:departamento_membros(nome))",
    )
    .eq("data", amanha);
  if (error) {
    console.error("Lembrete de véspera: falha ao ler a escala", error);
    await db.from("execucoes_agendadas").delete().eq("tarefa", TAREFA).eq("dia", hoje); // tenta de novo no próximo tick
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  type Linha = {
    departamento: { id: string; nome: string; anciao_id: string | null; lideres: { perfil_id: string }[] } | null;
    pessoas: { avisado_em: string | null; membro: { nome: string } | null }[];
  };
  const porDepartamento = new Map<string, PendentesDoDepartamento>();
  for (const d of (dias ?? []) as unknown as Linha[]) {
    if (!d.departamento) continue;
    const atual = porDepartamento.get(d.departamento.id) ?? {
      departamento: { id: d.departamento.id, nome: d.departamento.nome, anciao_id: d.departamento.anciao_id },
      lideres: d.departamento.lideres.map((l) => l.perfil_id),
      pessoas: [],
    };
    for (const p of d.pessoas) if (!p.avisado_em && p.membro) atual.pessoas.push(p.membro.nome);
    porDepartamento.set(d.departamento.id, atual);
  }

  const lembretes = lembretesDeVespera([...porDepartamento.values()], amanha);
  let aparelhos = 0;
  for (const [perfilId, notificacao] of lembretes) aparelhos += await enviarPush([perfilId], notificacao);

  const resultado = { amanha, pessoas: lembretes.size, aparelhos };
  await db.from("execucoes_agendadas").update({ resultado }).eq("tarefa", TAREFA).eq("dia", hoje);
  return NextResponse.json({ ok: true, ...resultado });
}
