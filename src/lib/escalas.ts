import { dataLonga, horaCurta, somarDias } from "./datas";
import { tratamento } from "./resumo";
import type { EscalaDia, Perfil } from "./tipos";

type Remetente = Pick<Perfil, "nome" | "papel"> & { tratamento?: string | null };

/** "hoje", "amanhã" ou "sábado, 5 de dezembro". */
export function quandoE(data: string, hoje: string): string {
  if (data === hoje) return "hoje";
  if (data === somarDias(hoje, 1)) return "amanhã";
  return dataLonga(data);
}

/**
 * Mensagem que o líder manda (do próprio WhatsApp) para quem está na escala.
 * Ex: "Olá, Pedro! Passando para lembrar que hoje é o seu dia na escala de
 * Música (Teclado): Culto Divino, às 9h. Conto com você! Ana – Música"
 */
export function mensagemAvisoEscala(opcoes: {
  nome: string;
  funcao: string | null;
  dia: Pick<EscalaDia, "data" | "horario" | "titulo">;
  departamento: string;
  remetente: Remetente;
  hoje: string;
}): string {
  const { nome, funcao, dia, departamento, remetente, hoje } = opcoes;
  const detalhes = [dia.titulo, dia.horario ? `às ${horaCurta(dia.horario)}` : null].filter(Boolean).join(", ");
  return (
    `Olá, ${nome}! Passando para lembrar que ${quandoE(dia.data, hoje)} é o seu dia na escala de ${departamento}` +
    `${funcao ? ` (${funcao})` : ""}${detalhes ? `: ${detalhes}` : ""}. ` +
    `Conto com você! ${tratamento(remetente)} – ${departamento}`
  );
}

/** Texto da escala do mês para compartilhar no grupo. */
export function textoEscalaMes(departamento: string, mesNome: string, dias: EscalaDia[]): string {
  const linhas = dias.map((d) => {
    const quem = (d.pessoas ?? [])
      .map((p) => `${p.membro?.nome ?? "?"}${p.funcao ? ` (${p.funcao})` : ""}`)
      .join(", ");
    const cab = `${dataLonga(d.data)}${d.horario ? `, ${horaCurta(d.horario)}` : ""}${d.titulo ? ` · ${d.titulo}` : ""}`;
    return `• ${cab}\n  ${quem || "a definir"}`;
  });
  return [`🗓️ *Escala de ${departamento}: ${mesNome}*`, "", ...linhas].join("\n");
}
