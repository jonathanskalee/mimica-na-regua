import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./index";

describe("banco de palavras", () => {
  it("toda palavra de toda categoria tem texto e dica não vazios", () => {
    for (const cat of CATEGORIES) {
      for (const level of ["facil", "medio", "dificil"] as const) {
        for (const entry of cat[level]) {
          expect(entry.w.trim().length, `${cat.id}/${level}: palavra vazia`).toBeGreaterThan(0);
          expect(entry.h.trim().length, `${cat.id}/${level}: "${entry.w}" sem dica`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("nenhuma categoria fica com nível vazio", () => {
    for (const cat of CATEGORIES) {
      for (const level of ["facil", "medio", "dificil"] as const) {
        expect(cat[level].length, `${cat.id}/${level} vazio`).toBeGreaterThan(0);
      }
    }
  });
});
