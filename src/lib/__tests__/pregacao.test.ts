import { describe, expect, it } from "vitest";
import { cultosDoMes, cultoValido, mensagemConvite, mensagemLembrete, siglasAnciaos } from "../pregacao";

describe("cultosDoMes", () => {
  it("dezembro/2026: 5 quartas, 4 sábados, 4 domingos, em ordem", () => {
    const c = cultosDoMes("2026-12");
    expect(c.filter((x) => x.culto === "quarta").map((x) => x.data)).toEqual([
      "2026-12-02", "2026-12-09", "2026-12-16", "2026-12-23", "2026-12-30",
    ]);
    expect(c.filter((x) => x.culto === "sabado_manha")).toHaveLength(4);
    expect(c.filter((x) => x.culto === "domingo_noite")).toHaveLength(4);
    expect(c[0]).toEqual({ data: "2026-12-02", culto: "quarta" });
    expect([...c].sort((a, b) => a.data.localeCompare(b.data))).toEqual(c);
  });
});

it("cultoValido confere o dia da semana", () => {
  expect(cultoValido("2026-12-05", "sabado_manha")).toBe(true);
  expect(cultoValido("2026-12-06", "sabado_manha")).toBe(false);
  expect(cultoValido("2026-12-06", "domingo_noite")).toBe(true);
  expect(cultoValido("2026-12-09", "quarta")).toBe(true);
  expect(cultoValido("2026-12-09", "invalido")).toBe(false);
});

it("mensagens de convite e lembrete", () => {
  const henrique = { nome: "Henrique", papel: "anciao" as const };
  expect(mensagemConvite({ data: "2026-12-05", culto: "sabado_manha", pregador_nome: "Pr. João" }, "Igreja do Aeroporto", henrique)).toBe(
    "Olá, Pr. João! Gostaríamos de convidar você para pregar no *Culto Divino (sábado de manhã)* da Igreja do Aeroporto, sábado, 5 de dezembro. Você pode? Fico no aguardo da sua confirmação. Ancião Henrique",
  );
  expect(
    mensagemLembrete({ data: "2026-12-05", culto: "sabado_manha", pregador_nome: "Pr. João", tema: "Esperança" }, "Igreja do Aeroporto", henrique),
  ).toContain('Tema: "Esperança". Que Deus abençoe! Ancião Henrique');
});

describe("siglasAnciaos", () => {
  it("usa a inicial quando não há repetição", () => {
    const s = siglasAnciaos([
      { id: "h", nome: "Henrique" },
      { id: "j", nome: "Jurandir" },
      { id: "d", nome: "Denise" },
    ]);
    expect([s.get("j")?.sigla, s.get("h")?.sigla, s.get("d")?.sigla]).toEqual(["J", "H", "D"]);
    expect(new Set([...s.values()].map((x) => x.cor)).size).toBe(3);
  });
  it("desempata com mais letras", () => {
    const s = siglasAnciaos([
      { id: "1", nome: "João" },
      { id: "2", nome: "Jurandir" },
      { id: "3", nome: "Élcio" },
    ]);
    expect([s.get("1")?.sigla, s.get("2")?.sigla, s.get("3")?.sigla]).toEqual(["JO", "JU", "E"]);
  });
});
