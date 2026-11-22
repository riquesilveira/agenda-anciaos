import { NextResponse, type NextRequest } from "next/server";
import { addMonths, format, parseISO } from "date-fns";
import { hojeISO, somarDias } from "@/lib/datas";
import { enviarEmail, htmlDoResumo } from "@/lib/email/enviar";
import { gerarResumo, JANELA_SEMANAL_DIAS, type TipoResumo } from "@/lib/resumo";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { Departamento, Perfil, Programacao } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Chamado pela Vercel Cron (ver vercel.json):
 *   /api/cron/resumos?tipo=semanal  toda segunda
 *   /api/cron/resumos?tipo=mensal   todo dia 1º
 * Envia a cada ancião/pastor o resumo dos seus departamentos.
 * Adicione &teste=1 para ver os resumos sem enviar e-mail.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const tipo: TipoResumo = request.nextUrl.searchParams.get("tipo") === "mensal" ? "mensal" : "semanal";
  const teste = request.nextUrl.searchParams.get("teste") === "1";
  const hoje = hojeISO();
  const ate =
    tipo === "mensal"
      ? format(addMonths(parseISO(`${hoje.slice(0, 7)}-01`), 1), "yyyy-MM-dd")
      : somarDias(hoje, JANELA_SEMANAL_DIAS);

  const db = supabaseAdmin();
  const [perfis, departamentos, programacoes] = await Promise.all([
    db.from("perfis").select("*").returns<Perfil[]>(),
    db.from("departamentos").select("*").returns<Departamento[]>(),
    db.from("programacoes").select("*").gte("data", hoje).lte("data", ate).returns<Programacao[]>(),
  ]);
  if (perfis.error || departamentos.error || programacoes.error) {
    return NextResponse.json({ erro: "falha ao ler o banco" }, { status: 500 });
  }

  const urlApp = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const relatorio: { para: string; itens: number; status: string; texto?: string }[] = [];

  for (const pessoa of perfis.data) {
    // Cada pessoa só recebe dados da própria igreja.
    const daIgreja = <T extends { igreja_id: string }>(lista: T[]) => lista.filter((x) => x.igreja_id === pessoa.igreja_id);
    const resumo = gerarResumo({
      tipo,
      destinatario: pessoa,
      programacoes: daIgreja(programacoes.data),
      departamentos: daIgreja(departamentos.data),
      perfis: daIgreja(perfis.data),
      hoje,
    });

    if (!resumo.itens.length) {
      relatorio.push({ para: pessoa.email, itens: 0, status: "sem programações" });
      continue;
    }
    if (teste) {
      relatorio.push({ para: pessoa.email, itens: resumo.itens.length, status: "teste", texto: resumo.texto });
      continue;
    }
    try {
      await enviarEmail(pessoa.email, resumo.assunto, htmlDoResumo(resumo, urlApp), resumo.texto);
      relatorio.push({ para: pessoa.email, itens: resumo.itens.length, status: "enviado" });
    } catch (e) {
      console.error("Falha ao enviar resumo", pessoa.email, e);
      relatorio.push({ para: pessoa.email, itens: resumo.itens.length, status: "erro" });
    }
  }

  return NextResponse.json({ tipo, hoje, relatorio });
}
