import { expect, it } from "vitest";
import { mensagemAvisoEscala, quandoE, textoEscalaMes } from "../escalas";

const ana = { nome: "Ana", papel: "lider" as const };

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
      remetente: ana,
      hoje: "2026-12-05",
    }),
  ).toBe("Olá, Pedro! Passando para lembrar que hoje é o seu dia na escala de Música (Teclado): Culto Divino, às 9h. Conto com você! Ana – Música");
});

it("mensagem com data e sem função/título", () => {
  expect(
    mensagemAvisoEscala({
      nome: "Lucas",
      funcao: null,
      dia: { data: "2026-12-12", horario: null, titulo: null },
      departamento: "Diaconato",
      remetente: { nome: "Henrique", papel: "anciao" },
      hoje: "2026-12-05",
    }),
  ).toBe("Olá, Lucas! Passando para lembrar que sábado, 12 de dezembro é o seu dia na escala de Diaconato. Conto com você! Ancião Henrique – Diaconato");
});

it("texto da escala do mês", () => {
  const t = textoEscalaMes("Música", "Dezembro de 2026", [
    { id: "1", departamento_id: "d", data: "2026-12-05", horario: "09:00", titulo: "Culto Divino", observacao: null,
      pessoas: [{ id: "a", escala_dia_id: "1", membro_id: "m", funcao: "Teclado", avisado_em: null, ordem: 0, membro: { id: "m", departamento_id: "d", nome: "Pedro", whatsapp: null, ativo: true } }] },
  ]);
  expect(t).toContain("*Escala de Música: Dezembro de 2026*");
  expect(t).toContain("• sábado, 5 de dezembro, 9h · Culto Divino\n  Pedro (Teclado)");
});
