import type { NextRequest } from "next/server";
import { listarDepartamentos, listarDiasEscala, nomeDaIgreja } from "@/lib/consultas";
import { horaCurta, hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { imagemDaEscala } from "@/lib/imagem-escala";
import { ultimoDiaDoMes } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";

/** Imagem da escala do mês de um departamento (para o WhatsApp). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ dep: string }> }) {
  const { dep } = await params;
  const mesParam = request.nextUrl.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : hojeISO().slice(0, 7);
  const { supabase } = await exigirPerfil(); // RLS: só departamentos da própria igreja
  const departamento = (await listarDepartamentos(supabase)).find((d) => d.id === dep);
  if (!departamento) return new Response("Não encontrado", { status: 404 });
  const [dias, igreja] = await Promise.all([listarDiasEscala(supabase, dep, `${mes}-01`, ultimoDiaDoMes(mes)), nomeDaIgreja(supabase)]);

  return imagemDaEscala({
    titulo: `Escala de ${departamento.nome}`,
    mes: maiuscula(nomeDoMes(mes)),
    igreja,
    linhas: dias.map((d) => ({
      data: d.data,
      titulo: [d.titulo, d.horario ? horaCurta(d.horario) : null].filter(Boolean).join(" · "),
      nomes: (d.pessoas ?? []).map((p) => `${p.membro?.nome ?? "?"}${p.funcao ? ` (${p.funcao})` : ""}`),
    })),
  });
}
