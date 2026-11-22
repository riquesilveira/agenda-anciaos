import { duracaoDias, periodosSeCruzam } from "./datas";
import type { Programacao } from "./tipos";

export type MotivoConflito = "mesmo_departamento" | "associacao_no_dia" | "mesmo_local_horario";

export interface Conflito {
  motivo: MotivoConflito;
  programacao: Pick<Programacao, "id" | "titulo" | "data" | "data_fim" | "hora_inicio" | "origem">;
  mensagem: string;
}

type Campos = "data" | "data_fim" | "hora_inicio" | "hora_fim" | "local" | "origem" | "departamento_id";
type Candidata = Pick<Programacao, Campos> & { id?: string | null };
type Existente = Pick<Programacao, Campos | "id" | "titulo">;

/**
 * Campanhas longas da Associação (Missão Calebe, 40 Dias de Oração, Semana
 * Santa…) são períodos, não choques de agenda: só avisamos de programações
 * da Associação com até este número de dias (ex: um fim de semana).
 */
export const MAX_DIAS_CHOQUE_ASSOCIACAO = 3;

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
 * É só aviso: quem cadastra decide se salva mesmo assim.
 */
export function detectarConflitos(nova: Candidata, existentes: Existente[]): Conflito[] {
  const conflitos: Conflito[] = [];

  for (const p of existentes) {
    if (!periodosSeCruzam(nova, p)) continue;
    if (nova.id && p.id === nova.id) continue;

    const resumo = {
      id: p.id,
      titulo: p.titulo,
      data: p.data,
      data_fim: p.data_fim,
      hora_inicio: p.hora_inicio,
      origem: p.origem,
    };

    if (nova.departamento_id && p.departamento_id === nova.departamento_id) {
      conflitos.push({
        motivo: "mesmo_departamento",
        programacao: resumo,
        mensagem: `Já existe "${p.titulo}" para este departamento nesse período.`,
      });
      continue;
    }

    const associacaoCurta = (x: Candidata | Existente) =>
      x.origem === "associacao" && duracaoDias(x) <= MAX_DIAS_CHOQUE_ASSOCIACAO;
    if (associacaoCurta(p) || associacaoCurta(nova)) {
      conflitos.push({
        motivo: "associacao_no_dia",
        programacao: resumo,
        mensagem: associacaoCurta(p)
          ? `A Associação já tem "${p.titulo}" nesse período.`
          : `Esse período já tem "${p.titulo}", e esta é uma programação da Associação.`,
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
