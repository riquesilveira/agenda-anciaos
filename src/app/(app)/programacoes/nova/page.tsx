import { FormProgramacao } from "@/components/form-programacao";
import { listarDepartamentos } from "@/lib/consultas";
import { exigirPerfil } from "@/lib/sessao";

export default async function NovaProgramacao({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const { supabase } = await exigirPerfil();
  const departamentos = await listarDepartamentos(supabase);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Nova programação</h1>
      <FormProgramacao departamentos={departamentos} dataInicial={/^\d{4}-\d{2}-\d{2}$/.test(data ?? "") ? data : undefined} />
    </div>
  );
}
