// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildPool, CATEGORIES, Level, Mode } from "../data";
import { resetClock, setClock } from "../lib/clock";
import { store as kv } from "../lib/fx";
import {
  effectiveWordLimit,
  GameData,
  makeInitialState,
  recordKey,
  useGame,
} from "./gameStore";

const T0 = 1_000_000;

/** Estado limpo. Bônus desligado e sem limite de palavras = testes determinísticos. */
function reset(overrides: Partial<GameData> = {}) {
  useGame.setState(makeInitialState({ bonusEnabled: false, wordLimit: 0, ...overrides }));
}

/** Vai da home até o jogo em andamento. */
function beginGame(overrides: Partial<GameData> = {}) {
  reset(overrides);
  useGame.getState().startMatch();
  useGame.getState().startTurn();
}

const s = () => useGame.getState();

beforeEach(() => {
  setClock(() => T0);
  for (const m of ["total", "perword"] as Mode[])
    for (const l of ["facil", "medio", "dificil"] as Level[]) kv.remove(recordKey(m, l));
  kv.remove("mimica_settings");
  kv.remove("mimica_onboarded");
  reset();
});

afterEach(resetClock);

describe("buildPool", () => {
  it("retorna palavras das categorias selecionadas no nível, com dica", () => {
    const pool = buildPool("facil", new Set(["animais"]));
    expect(pool.length).toBeGreaterThan(10);
    expect(pool.every((p) => p.c === "animais")).toBe(true);
    expect(pool.every((p) => typeof p.h === "string" && p.h.length > 0)).toBe(true);
  });

  it("inclui palavras personalizadas quando 'custom' está ativo, sem dica", () => {
    const pool = buildPool("dificil", new Set(["custom"]), ["Piada interna"]);
    expect(pool).toEqual([{ w: "Piada interna", c: "custom" }]);
  });
});

describe("rodada solo", () => {
  it("começa com pontuação zero e uma palavra sorteada", () => {
    beginGame();
    expect(s().screen).toBe("game");
    expect(s().score).toBe(0);
    expect(s().current).not.toBeNull();
    expect(s().timeLeft).toBe(60);
  });

  it("acertar soma 1 ponto e troca a palavra", () => {
    beginGame();
    const first = s().current?.w;
    useGame.getState().hit();
    expect(s().score).toBe(1);
    expect(s().current?.w).not.toBe(first);
    expect(s().history[0]).toMatchObject({ word: first, hit: true });
  });

  it("não repete palavra na mesma sessão", () => {
    beginGame();
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const w = s().current!.w;
      expect(seen.has(w)).toBe(false);
      seen.add(w);
      useGame.getState().hit();
    }
  });

  it("respeita o limite de pulos", () => {
    beginGame({ skipLimit: 2 });
    useGame.getState().pass();
    useGame.getState().pass();
    const before = s().current?.w;
    useGame.getState().pass(); // bloqueado
    expect(s().current?.w).toBe(before);
    expect(s().skipsUsed).toBe(2);
  });

  it("penalidade de pulo desconta 1 ponto sem ficar negativo", () => {
    beginGame({ skipPenalty: true });
    useGame.getState().pass();
    expect(s().score).toBe(0);
    useGame.getState().hit();
    useGame.getState().pass();
    expect(s().score).toBe(0);
  });

  it("pausa bloqueia acertos e o relógio", () => {
    beginGame();
    useGame.getState().togglePause(T0);
    useGame.getState().hit();
    useGame.getState().syncTime(T0 + 30_000);
    expect(s().score).toBe(0);
    expect(s().timeLeft).toBe(60);
  });

  it("acerto e pulo pedem o flash da cor certa", () => {
    beginGame();
    useGame.getState().hit();
    expect(s().flashKind).toBe("ok");
    const id = s().flashId;
    useGame.getState().pass();
    expect(s().flashKind).toBe("bad");
    expect(s().flashId).toBeGreaterThan(id);
  });
});

describe("relógio por timestamp", () => {
  it("no modo corrida, tempo esgotado encerra a rodada", () => {
    beginGame({ roundSeconds: 60 });
    useGame.getState().syncTime(T0 + 60_000);
    expect(s().screen).toBe("results");
  });

  it("não atrasa quando a aba fica em segundo plano", () => {
    beginGame({ roundSeconds: 60 });
    // Uma única sincronização depois de 30s parados — sem tiques intermediários.
    useGame.getState().syncTime(T0 + 30_000);
    expect(s().timeLeft).toBe(30);
  });

  it("o tempo pausado não conta", () => {
    beginGame({ roundSeconds: 60 });
    useGame.getState().togglePause(T0 + 10_000); // pausa faltando 50s
    useGame.getState().togglePause(T0 + 40_000); // volta 30s depois
    useGame.getState().syncTime(T0 + 41_000);
    expect(s().timeLeft).toBe(49);
  });

  it("sincronizar várias vezes no mesmo segundo escreve uma vez só", () => {
    beginGame({ roundSeconds: 60 });
    let writes = 0;
    const unsub = useGame.subscribe(() => writes++);
    for (const ms of [200, 400, 600, 800, 999]) useGame.getState().syncTime(T0 + 30_000 + ms);
    unsub();
    expect(writes).toBe(1);
  });

  it("no relâmpago, tempo esgotado queima a palavra e continua", () => {
    beginGame({ mode: "perword", wordSeconds: 5 });
    const first = s().current?.w;
    useGame.getState().syncTime(T0 + 5_000);
    expect(s().screen).toBe("game");
    expect(s().current?.w).not.toBe(first);
    expect(s().timeLeft).toBe(5);
    expect(s().history[0]).toMatchObject({ word: first, hit: false, auto: true });
  });

  it("voltar de muito tempo em segundo plano queima uma palavra, não todas", () => {
    beginGame({ mode: "perword", wordSeconds: 5 });
    useGame.getState().syncTime(T0 + 60_000);
    expect(s().history).toHaveLength(1);
    expect(s().screen).toBe("game");
  });
});

describe("limite de palavras por vez", () => {
  it("decide o limite conforme o modo", () => {
    expect(effectiveWordLimit({ mode: "total", teamsEnabled: true, wordLimit: 15 })).toBe(0);
    expect(effectiveWordLimit({ mode: "perword", teamsEnabled: false, wordLimit: 0 })).toBe(0);
    expect(effectiveWordLimit({ mode: "perword", teamsEnabled: false, wordLimit: 15 })).toBe(15);
    // Times sem escolha explícita caem nas 10 palavras do legacy.
    expect(effectiveWordLimit({ mode: "perword", teamsEnabled: true, wordLimit: 0 })).toBe(10);
    expect(effectiveWordLimit({ mode: "perword", teamsEnabled: true, wordLimit: 20 })).toBe(20);
  });

  it("encerra a vez ao atingir o limite", () => {
    beginGame({ mode: "perword", wordSeconds: 5, wordLimit: 3 });
    useGame.getState().hit();
    useGame.getState().hit();
    expect(s().screen).toBe("game");
    useGame.getState().hit();
    expect(s().screen).toBe("results");
    expect(s().score).toBe(3);
  });

  it("conta acertos, pulos e palavras queimadas", () => {
    beginGame({ mode: "perword", wordSeconds: 5, wordLimit: 3 });
    useGame.getState().hit();
    useGame.getState().pass();
    expect(s().screen).toBe("game");
    useGame.getState().syncTime(T0 + 999_000); // queima a terceira
    expect(s().screen).toBe("results");
  });

  it("pulo bloqueado não consome palavra da vez", () => {
    beginGame({ mode: "perword", wordSeconds: 5, wordLimit: 5, skipLimit: 1 });
    useGame.getState().pass();
    useGame.getState().pass(); // bloqueado
    useGame.getState().pass(); // bloqueado
    expect(s().wordsThisTurn).toBe(1);
    expect(s().screen).toBe("game");
  });

  it("a palavra seguinte não vaza para a próxima vez", () => {
    beginGame({ mode: "perword", wordSeconds: 5, wordLimit: 3 });
    const played = [s().current!.w];
    useGame.getState().hit();
    played.push(s().current!.w);
    useGame.getState().hit();
    played.push(s().current!.w);
    useGame.getState().hit();
    // Encerrou na terceira: a carta seguinte não foi sacada nem marcada.
    expect(s().current?.w).toBe(played[2]);
    expect(s().used.size).toBe(3);
  });

  it("sem limite, o relâmpago solo continua indefinidamente", () => {
    beginGame({ mode: "perword", wordSeconds: 5, wordLimit: 0 });
    for (let i = 0; i < 30; i++) useGame.getState().hit();
    expect(s().screen).toBe("game");
  });
});

describe("modo times", () => {
  const twoTeams = { teamsEnabled: true, teamCount: 2, teamRounds: 1 };

  it("monta a fila de vezes ao começar a partida", () => {
    reset(twoTeams);
    useGame.getState().startMatch();
    expect(s().turnQueue).toEqual([0, 1]);
    expect(s().teamScores).toEqual([0, 0]);
    expect(s().turnIndex).toBe(0);
    expect(s().screen).toBe("ready");
  });

  it("credita a pontuação ao time da vez e avança até o campeão", () => {
    beginGame(twoTeams);
    useGame.getState().hit();
    useGame.getState().hit();
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    expect(s().screen).toBe("results");
    expect(s().teamScores).toEqual([3, 0]);

    useGame.getState().nextTurn();
    expect(s().screen).toBe("ready");
    expect(s().turnIndex).toBe(1);

    useGame.getState().startTurn();
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    expect(s().teamScores).toEqual([3, 1]);

    useGame.getState().nextTurn();
    expect(s().screen).toBe("champion");
  });

  it("os times não repetem palavras entre si", () => {
    beginGame(twoTeams);
    const firstTurn = new Set<string>();
    for (let i = 0; i < 8; i++) {
      firstTurn.add(s().current!.w);
      useGame.getState().hit();
    }
    useGame.getState().endTurn("manual");
    useGame.getState().nextTurn();
    useGame.getState().startTurn();
    for (let i = 0; i < 8; i++) {
      expect(firstTurn.has(s().current!.w)).toBe(false);
      useGame.getState().hit();
    }
  });

  it("não grava recorde em partida de times", () => {
    beginGame(twoTeams);
    for (let i = 0; i < 5; i++) useGame.getState().hit();
    useGame.getState().endTurn("manual");
    expect(s().isNewRecord).toBe(false);
    expect(kv.get(recordKey("total", "facil"))).toBeNull();
  });

  it("encerrar duas vezes não credita o dobro", () => {
    beginGame(twoTeams);
    useGame.getState().hit();
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    useGame.getState().endTurn("time"); // tempo expirou no mesmo instante
    expect(s().teamScores).toEqual([2, 0]);
  });

  it("revanche zera os placares e o baralho", () => {
    beginGame(twoTeams);
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    useGame.getState().nextTurn();
    useGame.getState().startTurn();
    useGame.getState().endTurn("manual");
    useGame.getState().nextTurn();
    expect(s().screen).toBe("champion");

    useGame.getState().rematch();
    expect(s().screen).toBe("ready");
    expect(s().teamScores).toEqual([0, 0]);
    expect(s().turnIndex).toBe(0);
    expect(s().used.size).toBe(0);
  });

  it("solo não vai para a tela de campeão", () => {
    beginGame();
    useGame.getState().endTurn("manual");
    useGame.getState().nextTurn();
    expect(s().screen).toBe("ready");
  });

  it("grava recorde no modo solo", () => {
    beginGame();
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    expect(s().isNewRecord).toBe(true);
    expect(kv.get(recordKey("total", "facil"))).toBe("1");
  });
});

describe("nomes de time", () => {
  it("apara o nome no limite e não muta o array anterior", () => {
    reset();
    const before = s().teamNames;
    useGame.getState().setTeamName(0, "Um nome absurdamente longo");
    expect(s().teamNames[0]).toBe("Um nome absurdam");
    expect(s().teamNames).not.toBe(before);
    expect(before[0]).toBe("Time 1");
  });
});

describe("modo testa", () => {
  const tilted = { tiltEnabled: true };

  it("exige voltar ao neutro entre um gesto e outro", () => {
    beginGame(tilted);
    useGame.getState().onTilt(150); // latch travado — nada acontece
    expect(s().score).toBe(0);
    useGame.getState().onTilt(90); // rearma
    useGame.getState().onTilt(150);
    expect(s().score).toBe(1);
    useGame.getState().onTilt(150); // sem rearmar
    expect(s().score).toBe(1);
    useGame.getState().onTilt(90);
    useGame.getState().onTilt(150);
    expect(s().score).toBe(2);
  });

  it("inclinar pra cima pula a palavra", () => {
    beginGame(tilted);
    const first = s().current?.w;
    useGame.getState().onTilt(90);
    useGame.getState().onTilt(20);
    expect(s().current?.w).not.toBe(first);
    expect(s().history[0]).toMatchObject({ hit: false });
  });

  it("não reage com o jogo pausado, fora do jogo ou com o modo desligado", () => {
    beginGame(tilted);
    useGame.getState().togglePause(T0);
    useGame.getState().onTilt(90);
    useGame.getState().onTilt(150);
    expect(s().score).toBe(0);

    beginGame({ tiltEnabled: false });
    useGame.getState().onTilt(90);
    useGame.getState().onTilt(150);
    expect(s().score).toBe(0);
  });

  it("ficar parado no neutro não escreve no estado", () => {
    beginGame(tilted);
    useGame.getState().onTilt(90); // rearma (escreve uma vez)
    let writes = 0;
    const unsub = useGame.subscribe(() => writes++);
    for (let i = 0; i < 10; i++) useGame.getState().onTilt(90);
    unsub();
    expect(writes).toBe(0);
  });

  it("calibra dentro de uma faixa plausível", () => {
    reset();
    useGame.getState().calibrateTilt(200);
    expect(s().tiltBaseBeta).toBe(140);
    useGame.getState().resetTiltCalibration();
    expect(s().tiltBaseBeta).toBe(90);
  });

  it("permissão negada desliga o modo", () => {
    reset({ tiltEnabled: true });
    useGame.getState().setTiltPermission("denied");
    expect(s().tiltEnabled).toBe(false);
    useGame.getState().setTiltEnabled(true); // não dá pra religar sem permissão
    expect(s().tiltEnabled).toBe(false);
  });
});

describe("preferências", () => {
  it("mudanças de configuração sobrevivem ao recarregar", () => {
    reset();
    useGame.getState().setLevel("dificil");
    useGame.getState().setTeamCount(3);
    const saved = JSON.parse(kv.get("mimica_settings")!);
    expect(saved.level).toBe("dificil");
    expect(saved.teamCount).toBe(3);
  });

  it("o onboarding aparece uma vez só", () => {
    expect(kv.get("mimica_onboarded")).toBeNull();
    reset({ showOnboarding: true });
    useGame.getState().dismissOnboarding();
    expect(s().showOnboarding).toBe(false);
    expect(kv.get("mimica_onboarded")).toBe("1");
  });

  it("dá pra apagar os recordes", () => {
    beginGame();
    useGame.getState().hit();
    useGame.getState().endTurn("manual");
    expect(kv.get(recordKey("total", "facil"))).toBe("1");
    useGame.getState().clearRecords();
    expect(kv.get(recordKey("total", "facil"))).toBeNull();
  });
});

describe("categorias", () => {
  it("nunca deixa a partida sem nenhuma categoria", () => {
    reset({ cats: new Set(["animais"]) });
    useGame.getState().toggleCat("animais");
    expect(s().cats.size).toBe(1);
  });

  it("o botão 'todas' alterna entre tudo e uma só", () => {
    reset();
    expect(s().cats.size).toBe(CATEGORIES.length);
    useGame.getState().toggleAllCats();
    expect(s().cats.size).toBe(1);
    useGame.getState().toggleAllCats();
    expect(s().cats.size).toBe(CATEGORIES.length);
  });
});
