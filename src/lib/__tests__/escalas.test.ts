import { expect, it } from "vitest";
import { lembretesDeVespera, mensagemAvisoEscala, quandoE, textoEscalaMes } from "../escalas";

it("quandoE", () => {
  expect(quandoE("2026-12-05", "2026-12-05")).toBe("hoje");
  expect(quandoE("2026-12-06", "2026-12-05")).toBe("amanhã");
  expect(quandoE("2026-12-12", "2026-12-05")).toBe("sábado, 12 de dezembro");
});

it("mensagem de aviso no dia", () => {
  expect(
    mensagemAvisoEscala({
      nome: "Pedro",
      funcao: "Teclado",
      dia: { data: "2026-12-05", horario: "09:00", titulo: "Culto Divino" },
      departamento: "Música",
      hoje: "2026-12-05",
    }),
  ).toBe("Olá, Pedro! Passando para lembrar que hoje é o seu dia na escala de Música (Teclado): Culto Divino, às 9h. Conto com você!");
});

it("mensagem com data e sem função/título", () => {
  expect(
    mensagemAvisoEscala({
      nome: "Lucas",
      funcao: null,
      dia: { data: "2026-12-12", horario: null, titulo: null },
      departamento: "Diaconato",
      hoje: "2026-12-05",
    }),
  ).toBe("Olá, Lucas! Passando para lembrar que sábado, 12 de dezembro é o seu dia na escala de Diaconato. Conto com você!");
});

it("texto da escala do mês", () => {
  const t = textoEscalaMes("Música", "Dezembro de 2026", [
    { id: "1", departamento_id: "d", data: "2026-12-05", horario: "09:00", titulo: "Culto Divino", observacao: null,
      pessoas: [{ id: "a", escala_dia_id: "1", membro_id: "m", funcao: "Teclado", avisado_em: null, ordem: 0, membro: { id: "m", departamento_id: "d", nome: "Pedro", whatsapp: null, ativo: true } }] },
  ]);
  expect(t).toContain("*Escala de Música: Dezembro de 2026*");
  expect(t).toContain("• sábado, 5 de dezembro, 9h · Culto Divino\n  Pedro (Teclado)");
});

it("lembretes de véspera: líderes recebem; sem líder, o ancião", () => {
  const r = lembretesDeVespera(
    [
      { departamento: { id: "mus", nome: "Música", anciao_id: "h" }, lideres: ["ana"], pessoas: ["Roberto", "Pedro"] },
      { departamento: { id: "son", nome: "Sonoplastia", anciao_id: "h" }, lideres: [], pessoas: ["Lucas"] },
      { departamento: { id: "dia", nome: "Diaconato", anciao_id: "j" }, lideres: ["ana"], pessoas: [] },
    ],
    "2026-12-05",
  );
  expect(r.get("ana")).toEqual({
    titulo: "Escala de amanhã: 2 pessoas para avisar",
    corpo: "Música: Roberto, Pedro",
    url: "/escalas/d/mus?mes=2026-12&dia=2026-12-05",
    tag: "vespera-2026-12-05",
  });
  expect(r.get("h")?.titulo).toBe("Escala de amanhã: 1 pessoa para avisar");
  expect(r.has("j")).toBe(false);
});
