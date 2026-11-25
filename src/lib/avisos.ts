import { dataLonga, horaCurta } from "./datas";
import { tratamento } from "./resumo";
import type { Perfil, Programacao } from "./tipos";

type Autor = (Pick<Perfil, "nome" | "papel"> & { tratamento?: string | null }) | null | undefined;

/**
 * Texto do aviso "nova programação na agenda", usado no botão de WhatsApp
 * e no e-mail automático.
 */
export function mensagemNovaProgramacao(
  p: Pick<Programacao, "titulo" | "data" | "data_fim" | "hora_inicio" | "local"> & {
    departamento?: { nome: string } | null;
  },
  autor: Autor,
  link?: string,
): string {
  const quando =
    p.data_fim && p.data_fim !== p.data ? `de ${dataLonga(p.data)} a ${dataLonga(p.data_fim)}` : dataLonga(p.data);
  const hora = p.hora_inicio ? `, às ${horaCurta(p.hora_inicio)}` : "";
  const local = p.local ? `, em ${p.local}` : "";
  const dep = p.departamento ? ` (${p.departamento.nome})` : "";
  const por = autor ? `\nCadastrada por ${tratamento(autor)}.` : "";
  const ver = link ? `\nVeja na agenda: ${link}` : "";
  return `📅 Nova programação na agenda da igreja: *${p.titulo}*${dep}, ${quando}${hora}${local}.${por}${ver}`;
}
