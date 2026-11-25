import { BotaoConfirmar } from "@/components/botao-confirmar";
import { listarDepartamentos, listarPerfis } from "@/lib/consultas";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Departamento, Perfil } from "@/lib/tipos";
import { ehLideranca } from "@/lib/permissoes";
import { excluirDepartamento, removerLider, salvarDepartamento } from "../acoes";
import { ConvidarLider } from "./convidar-lider";

function FormDepartamento({ d, perfis }: { d?: Departamento; perfis: Perfil[] }) {
  return (
    <form action={salvarDepartamento} className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto] sm:items-end">
      {d && <input type="hidden" name="id" value={d.id} />}
      <div>
        <label className="rotulo">Cor</label>
        <input type="color" name="cor" defaultValue={d?.cor ?? "#6366f1"} className="h-9 w-12 rounded border border-slate-300" />
      </div>
      <div>
        <label className="rotulo">Departamento</label>
        <input className="campo" name="nome" required defaultValue={d?.nome} placeholder="Ex: Jovens" />
      </div>
      <div>
        <label className="rotulo">Responsável (ancionato)</label>
        <select className="campo" name="anciao_id" defaultValue={d?.anciao_id ?? ""}>
          <option value="">—</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{tratamento(p)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="rotulo">Líder</label>
        <input className="campo" name="lider_nome" defaultValue={d?.lider_nome ?? ""} placeholder="Nome" />
      </div>
      <div>
        <label className="rotulo">WhatsApp do líder</label>
        <input className="campo" name="lider_whatsapp" defaultValue={d?.lider_whatsapp ?? ""} placeholder="(11) 98888-7777" inputMode="tel" />
      </div>
      <button className="botao">{d ? "Salvar" : "Adicionar"}</button>
    </form>
  );
}

function Lideres({ d, podeGerir }: { d: Departamento; podeGerir: boolean }) {
  const lideres = d.lideres ?? [];
  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Líderes com acesso ao sistema</p>
      {lideres.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {lideres.map((l) => (
            <li key={l.perfil_id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
              {l.perfil ? tratamento(l.perfil) : "—"}
              {podeGerir && (
                <form action={removerLider}>
                  <input type="hidden" name="departamento_id" value={d.id} />
                  <input type="hidden" name="perfil_id" value={l.perfil_id} />
                  <BotaoConfirmar
                    mensagem={`Tirar ${l.perfil?.nome ?? "esta pessoa"} da liderança de ${d.nome}? Ela continua podendo ver a agenda.`}
                    className="text-xs text-red-600 hover:underline"
                  >
                    remover
                  </BotaoConfirmar>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {podeGerir && <ConvidarLider departamentoId={d.id} departamento={d.nome} />}
    </div>
  );
}

export default async function PaginaDepartamentos() {
  const { supabase, perfil } = await exigirPerfil();
  const [departamentos, todos] = await Promise.all([listarDepartamentos(supabase), listarPerfis(supabase)]);
  // Responsável (ancionato) só pode ser ancião ou pastor.
  const perfis = todos.filter((p) => ehLideranca(p));

  if (!ehLideranca(perfil)) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Departamentos</h1>
          <p className="text-sm text-slate-500">Quem acompanha e quem lidera cada departamento.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {departamentos.map((d) => (
            <li key={d.id} className="cartao space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <span className="h-3 w-3 rounded-full" style={{ background: d.cor }} /> {d.nome}
              </p>
              <p><span className="text-slate-500">Ancionato:</span> {todos.find((x) => x.id === d.anciao_id) ? tratamento(todos.find((x) => x.id === d.anciao_id)!) : "—"}</p>
              <p><span className="text-slate-500">Líder:</span> {(d.lideres ?? []).map((l) => l.perfil?.nome).filter(Boolean).join(", ") || d.lider_nome || "—"}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Departamentos</h1>
        <p className="text-sm text-slate-500">
          Defina quem do ancionato acompanha cada departamento e quem é o líder. É isso que monta os lembretes de cada um.
        </p>
      </div>

      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        <b>Para dar acesso a um líder:</b> no cartão do departamento, use o botão verde <b>“Convidar líder de …”</b>.
        O sistema gera um link para você mandar pelo WhatsApp.
      </p>

      <section className="cartao">
        <h2 className="mb-3 text-sm font-semibold">Novo departamento</h2>
        <FormDepartamento perfis={perfis} />
      </section>

      <ul className="space-y-3">
        {departamentos.map((d) => (
          <li key={d.id} className="cartao space-y-3">
            <FormDepartamento d={d} perfis={perfis} />
            <Lideres d={d} podeGerir />
            <form action={excluirDepartamento} className="text-right">
              <input type="hidden" name="id" value={d.id} />
              <BotaoConfirmar
                mensagem={`Excluir ${d.nome}? As programações dele ficam sem departamento.`}
                className="text-xs text-red-600 hover:underline"
              >
                Excluir departamento
              </BotaoConfirmar>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
