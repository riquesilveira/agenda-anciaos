import type { Departamento, Perfil } from "./tipos";

/**
 * Regras de quem pode o quê. Espelham as policies RLS do banco
 * (supabase/migrations/*_lideres_e_novidades.sql), que são a garantia de
 * verdade; aqui servem só para a interface não oferecer o que vai ser recusado.
 */

type Quem = Pick<Perfil, "id" | "papel">;

export function ehLideranca(p: Quem): boolean {
  return p.papel === "anciao" || p.papel === "pastor";
}

/** Departamentos que a pessoa lidera (para anciãos/pastor: nenhum por esse critério). */
export function departamentosQueLidera(p: Quem, departamentos: Departamento[]): Departamento[] {
  return departamentos.filter((d) => d.lideres?.some((l) => l.perfil_id === p.id));
}

/** Departamentos em que a pessoa pode criar programações. */
export function departamentosParaCriar(p: Quem, departamentos: Departamento[]): Departamento[] {
  return ehLideranca(p) ? departamentos : departamentosQueLidera(p, departamentos);
}

export function podeEditarProgramacao(
  p: Quem,
  programacao: { departamento_id: string | null },
  departamentos: Departamento[],
): boolean {
  if (ehLideranca(p)) return true;
  if (!programacao.departamento_id) return false;
  return departamentosQueLidera(p, departamentos).some((d) => d.id === programacao.departamento_id);
}
