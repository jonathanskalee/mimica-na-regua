import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORIES } from "../data";
import { store as kv } from "../lib/fx";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY } from "./settings";

const write = (value: string) => kv.set(SETTINGS_KEY, value);
const writeJson = (obj: unknown) => write(JSON.stringify(obj));

beforeEach(() => kv.remove(SETTINGS_KEY));

describe("loadSettings — entrada estragada", () => {
  it("devolve os defaults quando não há nada salvo", () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("não quebra com JSON inválido", () => {
    write("{{{");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("ignora JSON válido que não é um objeto", () => {
    write("42");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    write("[]");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    write("null");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("preserva os campos bons quando um vizinho está estragado", () => {
    writeJson({ level: "dificil", roundSeconds: "abc", cats: 5, teamNames: null });
    const s = loadSettings();
    expect(s.level).toBe("dificil");
    expect(s.roundSeconds).toBe(DEFAULT_SETTINGS.roundSeconds);
    expect(s.cats).toEqual(DEFAULT_SETTINGS.cats);
    expect(s.teamNames).toEqual(DEFAULT_SETTINGS.teamNames);
  });

  it("recusa valores fora do conjunto permitido", () => {
    writeJson({ mode: "turbo", skipLimit: 99, wordLimit: 7 });
    const s = loadSettings();
    expect(s.mode).toBe("total");
    expect(s.skipLimit).toBe(-1);
    expect(s.wordLimit).toBe(DEFAULT_SETTINGS.wordLimit);
  });
});

describe("loadSettings — números fora da faixa", () => {
  it("limita o tempo da rodada", () => {
    writeJson({ roundSeconds: 999 });
    expect(loadSettings().roundSeconds).toBe(180);
    writeJson({ roundSeconds: 1 });
    expect(loadSettings().roundSeconds).toBe(30);
  });

  it("arredonda para o passo", () => {
    writeJson({ roundSeconds: 47 });
    expect(loadSettings().roundSeconds).toBe(50);
    writeJson({ wordSeconds: 12 });
    expect(loadSettings().wordSeconds).toBe(10);
  });

  it("limita quantidade de times e rodadas", () => {
    writeJson({ teamCount: 9, teamRounds: 0 });
    const s = loadSettings();
    expect(s.teamCount).toBe(4);
    expect(s.teamRounds).toBe(1);
  });

  it("limita a calibração do modo testa", () => {
    writeJson({ tiltBaseBeta: 500 });
    expect(loadSettings().tiltBaseBeta).toBe(140);
  });
});

describe("loadSettings — listas", () => {
  it("descarta categorias que não existem", () => {
    writeJson({ cats: ["animais", "inexistente"] });
    expect(loadSettings().cats).toEqual(["animais"]);
  });

  it("aceita a categoria personalizada", () => {
    writeJson({ cats: ["custom"] });
    expect(loadSettings().cats).toEqual(["custom"]);
  });

  it("volta para todas quando a lista fica vazia", () => {
    writeJson({ cats: [] });
    expect(loadSettings().cats).toEqual(CATEGORIES.map((c) => c.id));
  });

  it("completa e apara os nomes dos times", () => {
    writeJson({ teamNames: ["  Vingadores  ", "", "Um nome absurdamente longo demais"] });
    expect(loadSettings().teamNames).toEqual([
      "Vingadores",
      "Time 2",
      "Um nome absurdam", // 16 caracteres
      "Time 4",
    ]);
  });
});

describe("round-trip", () => {
  it("salva e relê o mesmo conteúdo", () => {
    const custom = {
      ...DEFAULT_SETTINGS,
      mode: "perword" as const,
      level: "medio" as const,
      cats: ["animais", "filmes"],
      teamsEnabled: true,
      teamCount: 3,
      teamNames: ["Alfa", "Beta", "Gama", "Delta"],
      wordLimit: 20,
      soundOn: false,
    };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });
});
