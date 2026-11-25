import { ListaProgramacoes } from "@/components/lista-programacoes";
import { listarPerfis } from "@/lib/consultas";
import { hojeISO } from "@/lib/datas";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Programacao } from "@/lib/tipos";

/** Programações cadastradas pelos outros nos últimos 30 dias; destaca as novas desde a última visita. */
export default async function Novidades() {
  const { supabase, perfil } = await exigirPerfil();
  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ data }, perfis] = await Promise.all([
    supabase
      .from("programacoes")
      .select("*, departamento:departamentos(*)")
      .gte("created_at", desde)
      .neq("criado_por", perfil.id)
      .not("criado_por", "is", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Programacao[]>(),
    listarPerfis(supabase),
  ]);
  const lista = data ?? [];
  const novas = lista.filter((p) => p.created_at > perfil.novidades_vistas_em);
  const anteriores = lista.filter((p) => p.created_at <= perfil.novidades_vistas_em);

  // Marca como visto (o contador no menu zera na próxima navegação).
  if (novas.length) {
    await supabase.from("perfis").update({ novidades_vistas_em: new Date().toISOString() }).eq("id", perfil.id);
  }

  const autor = (id: string | null) => {
    const p = perfis.find((x) => x.id === id);
    return p ? tratamento(p) : "alguém";
  };
  const hoje = hojeISO();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Novidades</h1>
        <p className="text-sm text-slate-500">Programações que outras pessoas cadastraram nos últimos 30 dias.</p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">{novas.length ? `${novas.length} nova(s) desde a sua última visita` : "Nada novo desde a sua última visita"}</h2>
        {novas.map((p) => (
          <div key={p.id} className="space-y-1">
            <p className="text-xs text-slate-500">
              Cadastrada por {autor(p.criado_por)} em{" "}
              {new Date(p.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
            <ListaProgramacoes programacoes={[p]} hoje={hoje} />
          </div>
        ))}
      </section>

      {anteriores.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-slate-600">Já vistas</h2>
          <ListaProgramacoes programacoes={anteriores} hoje={hoje} />
        </section>
      )}
    </div>
  );
}
