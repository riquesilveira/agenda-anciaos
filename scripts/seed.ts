/**
 * Cria a igreja, os usuários (anciãos + pastor) e os departamentos.
 * Pode rodar várias vezes: tudo é upsert, nada duplica.
 *
 *   npm run seed            # igreja, usuários, departamentos
 *   npm run seed -- --exemplos   # + algumas programações de exemplo
 *
 * Edite as listas abaixo com os dados reais antes de rodar.
 * Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
import { createClient } from "@supabase/supabase-js";

const IGREJA = { id: "a0e00000-0000-4000-8000-000000000001", nome: "Igreja do Aeroporto" };

// Senha inicial de todos; cada um troca depois em "Esqueci a senha" do Supabase.
const SENHA_INICIAL = process.env.SEED_SENHA ?? "trocar-esta-senha";

const USUARIOS = [
  { email: "henrique@exemplo.com", nome: "Henrique", papel: "anciao" },
  { email: "anciao2@exemplo.com", nome: "Ancião 2", papel: "anciao" },
  { email: "anciao3@exemplo.com", nome: "Ancião 3", papel: "anciao" },
  { email: "pastor@exemplo.com", nome: "Pastor", papel: "pastor" },
] as const;

// anciao = e-mail do ancião responsável (da lista acima)
const DEPARTAMENTOS = [
  { nome: "Jovens", cor: "#6366f1", anciao: "henrique@exemplo.com" },
  { nome: "Infantil", cor: "#f59e0b", anciao: "henrique@exemplo.com" },
  { nome: "Música", cor: "#ec4899", anciao: "anciao2@exemplo.com" },
  { nome: "Mordomia", cor: "#10b981", anciao: "anciao2@exemplo.com" },
  { nome: "Ministério da Mulher", cor: "#8b5cf6", anciao: "anciao3@exemplo.com" },
  { nome: "Escola Sabatina", cor: "#0ea5e9", anciao: "anciao3@exemplo.com" },
];

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function garantirUsuario(email: string): Promise<string> {
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => u.email === email);
    if (achado) return achado.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await db.auth.admin.createUser({ email, password: SENHA_INICIAL, email_confirm: true });
  if (error) throw error;
  console.log(`  usuário criado: ${email}`);
  return data.user.id;
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  }

  console.log("Igreja…");
  await check(db.from("igrejas").upsert(IGREJA));

  console.log("Usuários…");
  const ids = new Map<string, string>();
  for (const u of USUARIOS) {
    const id = await garantirUsuario(u.email);
    ids.set(u.email, id);
    await check(db.from("perfis").upsert({ id, igreja_id: IGREJA.id, nome: u.nome, papel: u.papel, email: u.email }));
  }

  console.log("Departamentos…");
  await check(
    db.from("departamentos").upsert(
      DEPARTAMENTOS.map((d) => ({ igreja_id: IGREJA.id, nome: d.nome, cor: d.cor, anciao_id: ids.get(d.anciao) ?? null })),
      { onConflict: "igreja_id,nome" },
    ),
  );

  if (process.argv.includes("--exemplos")) {
    console.log("Programações de exemplo…");
    const { data: deps } = await db.from("departamentos").select("id, nome").eq("igreja_id", IGREJA.id);
    const dep = (nome: string) => deps?.find((d) => d.nome === nome)?.id ?? null;
    const exemplos = [
      { id: "e0e00000-0000-4000-8000-000000000001", titulo: "Semana de Oração", data: "2026-12-05", origem: "associacao", departamento_id: null },
      { id: "e0e00000-0000-4000-8000-000000000002", titulo: "Culto Jovem", data: "2026-12-12", hora_inicio: "19:00", origem: "local", departamento_id: dep("Jovens"), local: "Templo" },
      { id: "e0e00000-0000-4000-8000-000000000003", titulo: "Cantata de Natal", data: "2026-12-19", hora_inicio: "19:30", origem: "local", departamento_id: dep("Música"), local: "Templo" },
      { id: "e0e00000-0000-4000-8000-000000000004", titulo: "Encontro Distrital de Crianças", data: "2026-12-13", hora_inicio: "09:00", origem: "distrito", departamento_id: dep("Infantil") },
    ];
    await check(db.from("programacoes").upsert(exemplos.map((e) => ({ ...e, igreja_id: IGREJA.id }))));
  }

  console.log(`Pronto. Senha inicial: ${SENHA_INICIAL === "trocar-esta-senha" ? "trocar-esta-senha (defina SEED_SENHA)" : "a de SEED_SENHA"}`);
}

async function check<T extends { error: unknown }>(p: PromiseLike<T>) {
  const r = await p;
  if (r.error) throw r.error;
  return r;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
