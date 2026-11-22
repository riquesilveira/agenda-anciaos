import { BotaoConfirmar } from "@/components/botao-confirmar";
import { listarDepartamentos, listarPerfis } from "@/lib/consultas";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Departamento, Perfil } from "@/lib/tipos";
import { excluirDepartamento, salvarDepartamento } from "../acoes";

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
        <label className="rotulo">Ancião responsável</label>
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

export default async function PaginaDepartamentos() {
  const { supabase } = await exigirPerfil();
  const [departamentos, perfis] = await Promise.all([listarDepartamentos(supabase), listarPerfis(supabase)]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Departamentos</h1>
        <p className="text-sm text-slate-500">
          Defina o ancião responsável e o líder de cada departamento. É isso que monta os lembretes de cada ancião.
        </p>
      </div>

      <section className="cartao">
        <h2 className="mb-3 text-sm font-semibold">Novo departamento</h2>
        <FormDepartamento perfis={perfis} />
      </section>

      <ul className="space-y-3">
        {departamentos.map((d) => (
          <li key={d.id} className="cartao space-y-2">
            <FormDepartamento d={d} perfis={perfis} />
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
