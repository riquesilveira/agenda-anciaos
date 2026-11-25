import { Trash2 } from "lucide-react";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Sigla } from "@/components/sigla";
import { listarDepartamentos, listarPerfis } from "@/lib/consultas";
import { ehLideranca } from "@/lib/permissoes";
import { tratamento } from "@/lib/resumo";
import { exigirPerfil } from "@/lib/sessao";
import type { Departamento, Perfil } from "@/lib/tipos";
import { excluirDepartamento, removerLider } from "../acoes";
import { ConvidarLider } from "./convidar-lider";
import { EditarDepartamento, NovoDepartamento } from "./form-departamento";

function Cartao({ d, todos, podeGerir }: { d: Departamento; todos: Perfil[]; podeGerir: boolean }) {
  const responsavel = todos.find((x) => x.id === d.anciao_id);
  const lideres = d.lideres ?? [];
  const ancionato = todos.filter((p) => ehLideranca(p)).map((p) => ({ id: p.id, rotulo: tratamento(p) }));

  return (
    <li className="cartao space-y-3">
      <div className="flex items-center gap-2">
        <Sigla d={d} />
        <h2 className="font-semibold">{d.nome}</h2>
      </div>

      <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="text-slate-500">Responsável</dt>
        <dd>{responsavel ? tratamento(responsavel) : "—"}</dd>
        <dt className="text-slate-500">Líder</dt>
        <dd>
          {lideres.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {lideres.map((l) => (
                <li key={l.perfil_id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5">
                  {l.perfil ? tratamento(l.perfil) : "—"}
                  <span className="text-xs text-emerald-700" title="Tem acesso ao sistema">✓ acesso</span>
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
          ) : d.lider_nome ? (
            <span>
              {d.lider_nome} <span className="text-xs text-amber-700">(ainda sem acesso)</span>
            </span>
          ) : (
            "—"
          )}
        </dd>
      </dl>

      {podeGerir && (
        <div className="flex flex-wrap items-start gap-2 border-t border-slate-100 pt-3">
          <ConvidarLider
            departamentoId={d.id}
            departamento={d.nome}
            sugestao={lideres.length === 0 ? { nome: d.lider_nome, whatsapp: d.lider_whatsapp } : undefined}
          />
          <EditarDepartamento d={d} ancionato={ancionato} />
          <form action={excluirDepartamento} className="ml-auto self-center">
            <input type="hidden" name="id" value={d.id} />
            <BotaoConfirmar
              mensagem={`Excluir ${d.nome}? As programações dele ficam sem departamento.`}
              rotulo={`Excluir ${d.nome}`}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={18} />
            </BotaoConfirmar>
          </form>
        </div>
      )}
    </li>
  );
}

export default async function PaginaDepartamentos() {
  const { supabase, perfil } = await exigirPerfil();
  const [departamentos, todos] = await Promise.all([listarDepartamentos(supabase), listarPerfis(supabase)]);
  const podeGerir = ehLideranca(perfil);
  const ancionato = todos.filter((p) => ehLideranca(p)).map((p) => ({ id: p.id, rotulo: tratamento(p) }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Departamentos</h1>
          <p className="text-sm text-slate-500">
            {podeGerir
              ? "Cada departamento tem um responsável do ancionato e um ou mais líderes. Use “Convidar líder” para dar acesso ao sistema."
              : "Quem acompanha e quem lidera cada departamento."}
          </p>
        </div>
      </div>

      {podeGerir && <NovoDepartamento ancionato={ancionato} />}

      <ul className="grid gap-3 lg:grid-cols-2">
        {departamentos.map((d) => (
          <Cartao key={d.id} d={d} todos={todos} podeGerir={podeGerir} />
        ))}
      </ul>
    </div>
  );
}
