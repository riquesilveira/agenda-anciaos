import { describe, expect, it } from "vitest";
import { limparSigla, sugerirSigla } from "../siglas";

describe("sugerirSigla", () => {
  it.each([
    ["Ação Solidária Adventista", "ASA"],
    ["Ministério da Mulher", "MM"],
    ["Desbravadores", "DBV"],
    ["Aventureiros", "AVE"],
    ["Secretaria", "SEC"],
    ["Jovens", "JA"],
    ["Ministério da Família", "MF"],
    ["Escola Sabatina", "ES"],
    ["Música", "MUS"],
    ["Recepção", "REC"],
    ["Ministério de Intercessão", "MI"],
    ["", ""],
  ])("%s -> %s", (nome, sigla) => expect(sugerirSigla(nome)).toBe(sigla));
});

it("limparSigla", () => {
  expect(limparSigla(" asa ")).toBe("ASA");
  expect(limparSigla("Dbv-1")).toBe("DBV1");
  expect(limparSigla("ação")).toBe("ACAO");
  expect(limparSigla("ABCDEFGH")).toBe("ABCDEF");
});
