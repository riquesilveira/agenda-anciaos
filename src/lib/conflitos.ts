import type { Programacao } from "./tipos";

export type MotivoConflito = "mesmo_departamento" | "associacao_no_dia" | "mesmo_local_horario";

export interface Conflito {
  motivo: MotivoConflito;
  programacao: Pick<Programacao, "id" | "titulo" | "data" | "hora_inicio" | "origem">;
  mensagem: string;
}

type Candidata = Pick<
  Programacao,
  "data" | "hora_inicio" | "hora_fim" | "local" | "origem" | "departamento_id"
> & { id?: string | null };

type Existente = Pick<
  Programacao,
  "id" | "titulo" | "data" | "hora_inicio" | "hora_fim" | "local" | "origem" | "departamento_id"
>;

function minutos(hora: string | null): number | null {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Sem hora de fim, considera que a programação dura 2 horas. */
function intervalo(p: Pick<Programacao, "hora_inicio" | "hora_fim">): [number, number] | null {
  const ini = minutos(p.hora_inicio);
  if (ini === null) return null;
  const fim = minutos(p.hora_fim) ?? ini + 120;
  return [ini, Math.max(fim, ini + 1)];
}

function normalizar(texto: string | null): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Detecta conflitos de uma programação nova (ou editada) com as já cadastradas.
 * É só aviso — quem cadastra decide se salva mesmo assim.
 */
export function detectarConflitos(nova: Candidata, existentes: Existente[]): Conflito[] {
  const conflitos: Conflito[] = [];

  for (const p of existentes) {
    if (p.data !== nova.data) continue;
    if (nova.id && p.id === nova.id) continue;

    const resumo = { id: p.id, titulo: p.titulo, data: p.data, hora_inicio: p.hora_inicio, origem: p.origem };

    if (nova.departamento_id && p.departamento_id === nova.departamento_id) {
      conflitos.push({
        motivo: "mesmo_departamento",
        programacao: resumo,
        mensagem: `Já existe "${p.titulo}" para este departamento neste dia.`,
      });
      continue;
    }

    if (p.origem === "associacao" || nova.origem === "associacao") {
      conflitos.push({
        motivo: "associacao_no_dia",
        programacao: resumo,
        mensagem:
          p.origem === "associacao"
            ? `A Associação já tem "${p.titulo}" neste dia.`
            : `Este dia já tem "${p.titulo}", e esta é uma programação da Associação.`,
      });
      continue;
    }

    const a = intervalo(nova);
    const b = intervalo(p);
    if (a && b && normalizar(nova.local) && normalizar(nova.local) === normalizar(p.local)) {
      if (a[0] < b[1] && b[0] < a[1]) {
        conflitos.push({
          motivo: "mesmo_local_horario",
          programacao: resumo,
          mensagem: `"${p.titulo}" usa o mesmo local em horário que se sobrepõe.`,
        });
      }
    }
  }

  return conflitos;
}
