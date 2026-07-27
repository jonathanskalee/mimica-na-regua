import { describe, expect, it } from "vitest";
import {
  buildTurnQueue,
  championLabel,
  currentTeam,
  isMatchOver,
  nextTeam,
  roundNumber,
  teamName,
  winners,
} from "./teams";

describe("fila de vezes", () => {
  it("dá uma vez a cada time por rodada, na ordem", () => {
    expect(buildTurnQueue(3, 2)).toEqual([0, 1, 2, 0, 1, 2]);
    expect(buildTurnQueue(2, 1)).toEqual([0, 1]);
    expect(buildTurnQueue(4, 3)).toHaveLength(12);
  });

  it("aponta o time da vez e o próximo", () => {
    const q = buildTurnQueue(2, 2); // [0,1,0,1]
    expect(currentTeam(q, 0)).toBe(0);
    expect(currentTeam(q, 3)).toBe(1);
    expect(currentTeam(q, 9)).toBe(-1);
    expect(nextTeam(q, 0)).toBe(1);
    expect(nextTeam(q, 3)).toBe(-1); // acabou
  });

  it("conta a rodada a partir de 1", () => {
    expect(roundNumber(0, 3)).toBe(1);
    expect(roundNumber(2, 3)).toBe(1);
    expect(roundNumber(3, 3)).toBe(2);
    expect(roundNumber(4, 3)).toBe(2);
  });

  it("sabe quando a última vez chegou", () => {
    const q = buildTurnQueue(2, 1); // [0,1]
    expect(isMatchOver(q, 0)).toBe(false);
    expect(isMatchOver(q, 1)).toBe(true);
  });
});

describe("campeão", () => {
  it("aponta o time com mais pontos", () => {
    expect(winners([3, 7, 2])).toEqual([1]);
    expect(championLabel([3, 7, 2], ["A", "B", "C"])).toBe("B");
  });

  it("trata empate entre dois", () => {
    expect(winners([3, 7, 7, 1])).toEqual([1, 2]);
    expect(championLabel([3, 7, 7, 1], ["A", "B", "C", "D"])).toBe("Empate! B & C");
  });

  it("trata empate entre três ou mais", () => {
    expect(championLabel([5, 5, 5], ["A", "B", "C"])).toBe("Empate! A, B & C");
  });

  it("empata todo mundo quando ninguém pontuou", () => {
    expect(winners([0, 0])).toEqual([0, 1]);
  });

  it("não quebra sem times", () => {
    expect(winners([])).toEqual([]);
    expect(championLabel([], [])).toBe("");
  });
});

describe("nome do time", () => {
  it("usa o nome dado", () => {
    expect(teamName(["Vingadores", "Time 2"], 0)).toBe("Vingadores");
  });

  it("cai no padrão quando está vazio ou só com espaços", () => {
    expect(teamName(["", "Time 2"], 0)).toBe("Time 1");
    expect(teamName(["   "], 0)).toBe("Time 1");
    expect(teamName([], 2)).toBe("Time 3");
  });
});
