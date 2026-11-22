import { describe, expect, it } from "vitest";
import { detectarConflitos } from "../conflitos";
import { hojeISO } from "../datas";
import { gerarResumo, linkWhatsapp, mensagemParaLider, normalizarWhatsapp } from "../resumo";
import type { Departamento, Perfil, Programacao } from "../tipos";

const henrique: Perfil = { id: "a1", igreja_id: "i", nome: "Henrique", papel: "anciao", email: "h@x", whatsapp: null };
const outro: Perfil = { id: "a2", igreja_id: "i", nome: "Paulo", papel: "anciao", email: "p@x", whatsapp: null };
const pastor: Perfil = { id: "p1", igreja_id: "i", nome: "Marcos", papel: "pastor", email: "m@x", whatsapp: null };

const jovens: Departamento = { id: "d1", igreja_id: "i", nome: "Jovens", cor: "#000", anciao_id: "a1", lider_nome: "Ana", lider_whatsapp: "(11) 98888-7777" };
const musica: Departamento = { id: "d2", igreja_id: "i", nome: "Música", cor: "#000", anciao_id: "a2", lider_nome: null, lider_whatsapp: null };

function prog(p: Partial<Programacao>): Programacao {
  return {
    id: Math.random().toString(), igreja_id: "i", titulo: "X", descricao: null, data: "2026-12-14",
    hora_inicio: null, hora_fim: null, local: null, origem: "local", departamento_id: null,
    lider_avisado_em: null, lider_avisado_por: null, criado_por: null, atualizado_por: null, ...p,
  };
}

describe("detectarConflitos", () => {
  it("avisa mesmo departamento no mesmo dia", () => {
    const c = detectarConflitos({ ...prog({ departamento_id: "d1" }), id: null }, [prog({ titulo: "Culto Jovem", departamento_id: "d1" })]);
    expect(c.map((x) => x.motivo)).toEqual(["mesmo_departamento"]);
  });
  it("avisa quando a Associação já tem algo no dia (e vice-versa)", () => {
    expect(detectarConflitos(prog({}), [prog({ origem: "associacao" })])[0].motivo).toBe("associacao_no_dia");
    expect(detectarConflitos(prog({ origem: "associacao" }), [prog({})])[0].motivo).toBe("associacao_no_dia");
  });
  it("avisa mesmo local com horário sobreposto, ignorando acento/caixa", () => {
    const nova = prog({ local: "Salão Social", hora_inicio: "19:00" });
    expect(detectarConflitos(nova, [prog({ local: "salao social", hora_inicio: "20:00:00" })])[0].motivo).toBe("mesmo_local_horario");
    expect(detectarConflitos(nova, [prog({ local: "salao social", hora_inicio: "21:00" })])).toEqual([]);
  });
  it("ignora outro dia e a própria programação (edição)", () => {
    const p = prog({ departamento_id: "d1" });
    expect(detectarConflitos(p, [p])).toEqual([]);
    expect(detectarConflitos(p, [prog({ departamento_id: "d1", data: "2026-12-15" })])).toEqual([]);
  });
});

describe("gerarResumo", () => {
  const programacoes = [
    prog({ titulo: "Culto Jovem", data: "2026-12-14", hora_inicio: "19:00", departamento_id: "d1" }),
    prog({ titulo: "Cantata", data: "2026-12-21", departamento_id: "d2" }),
    prog({ titulo: "Vigília", data: "2027-01-10", departamento_id: "d1", lider_avisado_em: "2026-12-01" }),
    prog({ titulo: "Passado", data: "2026-11-01", departamento_id: "d1" }),
  ];
  const base = { programacoes, departamentos: [jovens, musica], perfis: [henrique, outro, pastor], hoje: "2026-12-01" };

  it("mensal: ancião só vê os próprios departamentos, no mês", () => {
    const r = gerarResumo({ ...base, tipo: "mensal", destinatario: henrique });
    expect(r.itens.map((i) => i.programacao.titulo)).toEqual(["Culto Jovem"]);
    expect(r.introducao).toBe("Ancião Henrique, em dezembro de 2026 temos as seguintes programações:");
    expect(r.texto).toContain("Você é o ancião responsável por Jovens: lembre Ana (líder de Jovens)");
  });
  it("semanal: próximos 30 dias, com status de aviso", () => {
    const r = gerarResumo({ ...base, tipo: "semanal", destinatario: henrique, hoje: "2026-12-12" });
    expect(r.itens.map((i) => [i.programacao.titulo, i.diasRestantes, i.avisado])).toEqual([
      ["Culto Jovem", 2, false],
      ["Vigília", 29, true],
    ]);
    expect(r.pendentes).toBe(1);
  });
  it("pastor vê tudo e o ancião responsável de cada item", () => {
    const r = gerarResumo({ ...base, tipo: "mensal", destinatario: pastor });
    expect(r.itens).toHaveLength(2);
    expect(r.texto).toContain("Ancião responsável: Ancião Paulo.");
    expect(r.introducao.startsWith("Pastor Marcos")).toBe(true);
  });
});

describe("WhatsApp", () => {
  it("normaliza número brasileiro", () => {
    expect(normalizarWhatsapp("(11) 98888-7777")).toBe("5511988887777");
    expect(normalizarWhatsapp("+55 11 98888-7777")).toBe("5511988887777");
    expect(normalizarWhatsapp("")).toBeNull();
  });
  it("monta mensagem e link", () => {
    const p = prog({ titulo: "Culto Jovem", hora_inicio: "19:30", local: "Templo" });
    const m = mensagemParaLider(p, jovens, henrique);
    expect(m).toBe("Olá, Ana! Passando para lembrar da programação *Culto Jovem* (Jovens), segunda-feira, 14 de dezembro, às 19h30, em Templo. Conte comigo para o que precisar. Ancião Henrique");
    expect(linkWhatsapp(jovens.lider_whatsapp, m)).toMatch(/^https:\/\/wa\.me\/5511988887777\?text=Ol%C3%A1/);
  });
});

it("hojeISO usa o fuso de Brasília", () => {
  expect(hojeISO(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11-30");
});
