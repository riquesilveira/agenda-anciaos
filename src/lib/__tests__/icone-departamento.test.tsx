import { expect, it } from "vitest";
import { BookOpen, Compass, Flame, HandHelping, Music, Speaker, Users } from "lucide-react";
import { iconeDoDepartamento } from "@/components/icone-departamento";

it("ícone de cada departamento", () => {
  expect(iconeDoDepartamento("Música", "MUS")).toBe(Music);
  expect(iconeDoDepartamento("Sonoplastia")).toBe(Speaker);
  expect(iconeDoDepartamento("Desbravadores", "DBV")).toBe(Compass);
  expect(iconeDoDepartamento("Jovens", "JA")).toBe(Flame);
  expect(iconeDoDepartamento("Escola Sabatina", "ES")).toBe(BookOpen);
  expect(iconeDoDepartamento("Diaconato")).toBe(HandHelping);
  expect(iconeDoDepartamento("Algo novo")).toBe(Users);
});
