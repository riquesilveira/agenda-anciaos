/**
 * Importa o calendário da Associação (JSON gerado por
 * scripts/extrair-calendario-pdf.py) para TODAS as igrejas (o calendário da
 * ANP vale para todas). IGREJA_ID=<id> limita a uma igreja só.
 *
 *   npm run importar -- dados/associacao-2027.json --previa   # só mostra
 *   npm run importar -- dados/associacao-2027.json            # grava
 *   ... --com-comissoes   # inclui Comissão Interna/Diretiva (padrão: não)
 *
 * Pode rodar de novo sem duplicar. Eventos já importados NÃO são alterados,
 * para não desfazer ajustes feitos pelos anciãos no app (ex: departamento).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chaveImportacao, fonteLegivel, sugerirDepartamento, type EventoImportado } from "../src/lib/importacao";

const SO_UMA_IGREJA = process.env.IGREJA_ID;
const PREVIA_IGREJA = "a0e00000-0000-4000-8000-000000000001";

async function main() {
  const args = process.argv.slice(2);
  const arquivo = args.find((a) => !a.startsWith("--"));
  if (!arquivo) throw new Error("Informe o arquivo: npm run importar -- dados/associacao-2027.json");
  const previa = args.includes("--previa");
  const comComissoes = args.includes("--com-comissoes");

  const { ano, eventos } = JSON.parse(readFileSync(arquivo, "utf8")) as { ano: number; eventos: EventoImportado[] };
  const selecionados = eventos.filter((e) => comComissoes || e.fonte !== "COMISSÕES");

  const db = previa && !process.env.SUPABASE_SERVICE_ROLE_KEY
    ? null
    : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });

  let igrejas: { id: string; nome: string }[] = [{ id: PREVIA_IGREJA, nome: "prévia" }];
  if (db) {
    const consulta = db.from("igrejas").select("id, nome").order("nome");
    const { data, error } = SO_UMA_IGREJA ? await consulta.eq("id", SO_UMA_IGREJA) : await consulta;
    if (error) throw error;
    igrejas = data;
  }
  for (const { id: igrejaId, nome: nomeIgreja } of igrejas) {
    // Na prévia sem banco, usa os departamentos do arquivo de dados.
    let departamentos: { id: string; nome: string }[];
    if (db) {
      const { data, error } = await db.from("departamentos").select("id, nome").eq("igreja_id", igrejaId);
      if (error) throw error;
      departamentos = data;
    } else {
      const local = (() => {
        try {
          return JSON.parse(readFileSync("scripts/dados.local.json", "utf8"));
        } catch {
          return JSON.parse(readFileSync("scripts/dados.exemplo.json", "utf8"));
        }
      })();
      departamentos = local.departamentos.map((d: { nome: string }) => ({ id: d.nome, nome: d.nome }));
    }
    const nomeDep = new Map(departamentos.map((d) => [d.id, d.nome]));

    const linhas = selecionados.map((e) => ({
      igreja_id: igrejaId,
      titulo: e.titulo,
      data: e.data,
      data_fim: e.data_fim,
      origem: "associacao" as const,
      fonte: fonteLegivel(e.fonte),
      departamento_id: sugerirDepartamento(e.titulo_original, departamentos),
      chave_importacao: chaveImportacao(ano, e),
    }));

    const porDep = new Map<string, number>();
    for (const l of linhas) {
      const nome = l.departamento_id ? nomeDep.get(l.departamento_id)! : "(sem departamento)";
      porDep.set(nome, (porDep.get(nome) ?? 0) + 1);
    }
    console.log(`\n== ${nomeIgreja}: ${linhas.length} eventos (${eventos.length - selecionados.length} comissões ignoradas)`);
    for (const [nome, n] of [...porDep].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${nome}`);

    if (previa) {
      for (const l of linhas) {
        const dep = l.departamento_id ? nomeDep.get(l.departamento_id) : "";
        console.log(`${l.data}${l.data_fim ? ` a ${l.data_fim}` : "              "}  ${l.fonte?.padEnd(8)} ${dep?.padEnd(22)} ${l.titulo}`);
      }
      continue;
    }

    const { error, count } = await db!
      .from("programacoes")
      .upsert(linhas, { onConflict: "igreja_id,chave_importacao", ignoreDuplicates: true, count: "exact" });
    if (error) throw error;
    console.log(`Gravado. ${count ?? "?"} novos (os já existentes foram mantidos como estavam).`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
