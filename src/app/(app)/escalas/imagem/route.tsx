import type { NextRequest } from "next/server";
import { listarEscala, nomeDaIgreja } from "@/lib/consultas";
import { hojeISO, maiuscula, nomeDoMes } from "@/lib/datas";
import { imagemDaEscala } from "@/lib/imagem-escala";
import { cultosComEspeciais, nomeDoCulto } from "@/lib/pregacao";
import { ultimoDiaDoMes } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";

/** Imagem da escala de pregação do mês (para o WhatsApp). */
export async function GET(request: NextRequest) {
  const mesParam = request.nextUrl.searchParams.get("mes") ?? "";
  const mes = /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : hojeISO().slice(0, 7);
  const { supabase } = await exigirPerfil();
  const [escala, igreja] = await Promise.all([listarEscala(supabase, `${mes}-01`, ultimoDiaDoMes(mes)), nomeDaIgreja(supabase)]);
  const porChave = new Map(escala.map((e) => [`${e.data}|${e.culto}`, e]));

  return imagemDaEscala({
    titulo: "Escala de pregação",
    mes: maiuscula(nomeDoMes(mes)),
    igreja,
    linhas: cultosComEspeciais(mes, escala).map((c) => {
      const e = porChave.get(`${c.data}|${c.culto}`);
      return { data: c.data, titulo: nomeDoCulto({ culto: c.culto, titulo: e?.titulo }), nomes: e?.pregador_nome ? [e.pregador_nome] : [] };
    }),
  });
}
