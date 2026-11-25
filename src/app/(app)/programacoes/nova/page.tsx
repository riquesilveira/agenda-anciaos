import { Voltar } from "@/components/voltar";
import { FormProgramacao } from "@/components/form-programacao";
import { listarDepartamentos } from "@/lib/consultas";
import { departamentosParaCriar } from "@/lib/permissoes";
import { exigirPerfil } from "@/lib/sessao";

export default async function NovaProgramacao({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const { supabase, perfil } = await exigirPerfil();
  const permitidos = departamentosParaCriar(perfil, await listarDepartamentos(supabase));
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data ?? "") ? data : undefined;
  const ehLider = perfil.papel === "lider";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Voltar href={dataValida ? `/?mes=${dataValida.slice(0, 7)}` : "/"} />
      <h1 className="text-lg font-semibold">Nova programação</h1>
      {ehLider && permitidos.length === 0 ? (
        <p className="cartao text-sm text-slate-600">
          Você ainda não está como líder de nenhum departamento. Peça a um ancião para te vincular na tela Departamentos.
        </p>
      ) : (
        <>
          {ehLider && (
            <p className="text-sm text-slate-500">
              Você pode cadastrar programações de: {permitidos.map((d) => d.nome).join(", ")}.
            </p>
          )}
          <FormProgramacao departamentos={permitidos} dataInicial={dataValida} soLocal={ehLider} />
        </>
      )}
    </div>
  );
}
