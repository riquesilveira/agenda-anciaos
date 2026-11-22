import { describe, expect, it } from "vitest";
import { chaveImportacao, sugerirDepartamento } from "../importacao";

const deps = ["Jovens", "Desbravadores", "Aventureiros", "Ministério da Criança", "Ministério da Mulher",
  "Ministério da Família", "Escola Sabatina", "Ministério Pessoal", "Música"].map((nome) => ({ id: nome, nome }));

describe("sugerirDepartamento", () => {
  it.each([
    ["MISSÃO CALEBE", "Jovens"],
    ["SEMANA DE ORAÇÃO JA", "Jovens"],
    ["CAMPORI ANP", "Desbravadores"],
    ["DIA MUNDIAL DOS DESBRAVADORES", "Desbravadores"],
    ["AVENTURI ANP", "Aventureiros"],
    ["ESCOLA CRISTÃ DE FÉRIAS - LOCAL", "Ministério da Criança"],
    ["CONGRESSO MM - CADA MULHER UMA VOZ", "Ministério da Mulher"],
    ["CURSO DE NOIVOS - LONDRINA", "Ministério da Família"],
    ["13º SÁBADO - TUDO COMEÇA EM CASA", "Escola Sabatina"],
    ["40 DIAS DE ORAÇÃO ONE VOICE", "Ministério Pessoal"],
    ["ENCONTRO DE GRUPOS MUSICAIS", "Música"],
  ])("%s -> %s", (titulo, esperado) => {
    expect(sugerirDepartamento(titulo, deps)).toBe(esperado);
  });

  it("eventos de pastores/administração ficam sem departamento", () => {
    expect(sugerirDepartamento("PAMP - PASTORES", deps)).toBeNull();
    expect(sugerirDepartamento("ENCONTRO DE FILHOS DE OBREIROS", deps)).toBeNull();
  });

  it("sem o departamento cadastrado, fica sem departamento", () => {
    expect(sugerirDepartamento("CAMPORI ANP", [{ id: "j", nome: "Jovens" }])).toBeNull();
  });

  it("aceita apelidos e ignora acento/caixa no nome do departamento", () => {
    expect(sugerirDepartamento("CAMPORI ANP", [{ id: "x", nome: "DBV" }])).toBe("x");
    expect(sugerirDepartamento("MISSÃO CALEBE", [{ id: "y", nome: "ministério jovem" }])).toBe("y");
  });
});

it("chave de importação é estável", () => {
  const e = { data: "2027-01-16", titulo_original: "MISSÃO CALEBE", fonte: "ANP" };
  expect(chaveImportacao(2027, e)).toBe("associacao-2027:anp:2027-01-16:missao-calebe");
});
