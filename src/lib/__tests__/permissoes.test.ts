import { describe, expect, it } from "vitest";
import { departamentosParaCriar, podeEditarProgramacao } from "../permissoes";
import type { Departamento } from "../tipos";

const dep = (id: string, lideres: string[] = []): Departamento => ({
  id, igreja_id: "i", nome: id, sigla: null, cor: "#000", anciao_id: null, lider_nome: null, lider_whatsapp: null,
  lideres: lideres.map((perfil_id) => ({ perfil_id })),
});
const deps = [dep("jovens", ["ana"]), dep("musica")];

describe("permissões", () => {
  it("ancião e pastor criam em qualquer departamento", () => {
    expect(departamentosParaCriar({ id: "h", papel: "anciao" }, deps)).toHaveLength(2);
    expect(departamentosParaCriar({ id: "p", papel: "pastor" }, deps)).toHaveLength(2);
  });
  it("líder só cria nos departamentos que lidera", () => {
    expect(departamentosParaCriar({ id: "ana", papel: "lider" }, deps).map((d) => d.id)).toEqual(["jovens"]);
  });
  it("líder só edita programação do próprio departamento", () => {
    const ana = { id: "ana", papel: "lider" as const };
    expect(podeEditarProgramacao(ana, { departamento_id: "jovens" }, deps)).toBe(true);
    expect(podeEditarProgramacao(ana, { departamento_id: "musica" }, deps)).toBe(false);
    expect(podeEditarProgramacao(ana, { departamento_id: null }, deps)).toBe(false);
    expect(podeEditarProgramacao({ id: "h", papel: "anciao" }, { departamento_id: null }, deps)).toBe(true);
  });
});
