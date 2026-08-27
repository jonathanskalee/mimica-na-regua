import { create } from "zustand";
import { buildPool, CATEGORIES, Level, Mode } from "../data";
import {
  keepAwake,
  releaseAwake,
  setSound,
  setVibe,
  sfx,
  store as kv,
  vibrate,
} from "../lib/fx";
import { now as clockNow } from "../lib/clock";
import {
  buildTurnQueue,
  currentTeam,
  isMatchOver,
  MAX_ROUNDS,
  MAX_TEAM_NAME,
  MAX_TEAMS,
  MIN_ROUNDS,
  MIN_TEAMS,
} from "./teams";
import { clampTiltBase, tiltDecision } from "./tilt";
import {
  clampInt,
  clampStep,
  DEFAULT_SETTINGS,
  loadSettings,
  PersistedSettings,
  ROUND_SECONDS_MAX,
  ROUND_SECONDS_MIN,
  ROUND_SECONDS_STEP,
  saveSettings,
  WORD_SECONDS_MAX,
  WORD_SECONDS_MIN,
  WORD_SECONDS_STEP,
} from "./settings";

export type ScreenName = "home" | "ready" | "game" | "results" | "champion";
export type TiltPermission = "unknown" | "granted" | "denied" | "unsupported";
export type EndReason = "time" | "manual" | "wordLimit";
export type FlashKind = "ok" | "bad";

export interface HistoryItem {
  word: string;
  cat: string;
  hit: boolean;
  bonus?: boolean;
  auto?: boolean; // tempo esgotou (relâmpago)
}

export interface WordCard {
  w: string;
  c: string;
  h?: string;
}

/** Chance de uma palavra valer 3 pontos em vez de 1. */
export const BONUS_CHANCE = 0.15;
export const BONUS_POINTS = 3;
/** Vez padrão no Relâmpago com times, quando o jogador não escolheu um limite. */
export const WORDS_PER_TURN_TEAMS = 10;

export interface GameData {
  /* ----- configuração da partida (persistida) ----- */
  mode: Mode;
  level: Level;
  roundSeconds: number;
  wordSeconds: number;
  cats: Set<string>;
  bonusEnabled: boolean;
  hintsEnabled: boolean;
  skipLimit: number; // -1 = ilimitado
  skipPenalty: boolean;
  wordLimit: number; // 0 = ilimitado; só vale no Relâmpago

  /* ----- configuração de times (persistida) ----- */
  teamsEnabled: boolean;
  teamCount: number;
  teamRounds: number;
  teamNames: string[]; // sempre 4 posições

  /* ----- configuração de dispositivo (persistida) ----- */
  soundOn: boolean;
  vibeOn: boolean;
  tiltEnabled: boolean;
  tiltBaseBeta: number;

  /* ----- palavras personalizadas (chave própria) ----- */
  customWords: string[];

  /* ----- navegação ----- */
  screen: ScreenName;
  showOnboarding: boolean;

  /* ----- relógio (por timestamp) ----- */
  deadline: number; // epoch ms em que o tempo acaba
  pausedAt: number | null;
  timeLeft: number; // derivado, em segundos — só para render
  paused: boolean;

  /* ----- vez atual (zerado a cada startTurn) ----- */
  score: number;
  deck: WordCard[];
  current: WordCard | null;
  currentBonus: boolean;
  history: HistoryItem[];
  skipsUsed: number;
  wordsThisTurn: number;

  /* ----- partida (sobrevive entre vezes) ----- */
  used: Set<string>; // global à partida: times não repetem palavras entre si
  turnQueue: number[];
  turnIndex: number;
  teamScores: number[];
  isNewRecord: boolean;

  /* ----- modo testa ----- */
  tiltNeutral: boolean;
  tiltPermission: TiltPermission;

  /* ----- feedback visual ----- */
  flashKind: FlashKind | null;
  flashId: number;
}

interface GameActions {
  setMode: (m: Mode) => void;
  setLevel: (l: Level) => void;
  adjustTime: (delta: 1 | -1) => void;
  toggleCat: (id: string) => void;
  toggleAllCats: () => void;
  setBonusEnabled: (v: boolean) => void;
  setHintsEnabled: (v: boolean) => void;
  setSkipLimit: (v: number) => void;
  setSkipPenalty: (v: boolean) => void;
  setWordLimit: (v: number) => void;
  setCustomWords: (words: string[]) => void;

  setTeamsEnabled: (v: boolean) => void;
  setTeamCount: (n: number) => void;
  setTeamRounds: (n: number) => void;
  setTeamName: (index: number, name: string) => void;

  setSoundOn: (v: boolean) => void;
  setVibeOn: (v: boolean) => void;
  setTiltEnabled: (v: boolean) => void;
  setTiltPermission: (p: TiltPermission) => void;
  calibrateTilt: (beta: number) => void;
  resetTiltCalibration: () => void;

  goHome: () => void;
  startMatch: () => void;
  startTurn: () => void;
  syncTime: (nowMs?: number) => void;
  hit: () => void;
  pass: () => void;
  onTilt: (beta: number) => void;
  togglePause: (nowMs?: number) => void;
  endTurn: (reason: EndReason) => void;
  nextTurn: () => void;
  rematch: () => void;

  dismissOnboarding: () => void;
  replayOnboarding: () => void;
  clearRecords: () => void;
}

export type GameState = GameData & GameActions;

/* -------- recordes -------- */

export function recordKey(mode: Mode, level: Level) {
  return `mimica_rec_${mode}_${level}`;
}
export function getRecord(mode: Mode, level: Level): number {
  const v = kv.get(recordKey(mode, level));
  return v ? parseInt(v, 10) : 0;
}

const ALL_MODES: Mode[] = ["total", "perword"];
const ALL_LEVELS: Level[] = ["facil", "medio", "dificil"];

/* -------- palavras personalizadas e onboarding -------- */

const CUSTOM_KEY = "mimica_custom";
const ONBOARDED_KEY = "mimica_onboarded";

function loadCustomWords(): string[] {
  try {
    const parsed = JSON.parse(kv.get(CUSTOM_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

/* -------- helpers -------- */

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Quantas palavras encerram a vez. 0 = só o tempo encerra.
 * Com times no Relâmpago, cai nas 10 do legacy quando o jogador escolheu "∞".
 */
export function effectiveWordLimit(
  s: Pick<GameData, "mode" | "teamsEnabled" | "wordLimit">
): number {
  if (s.mode !== "perword") return 0;
  if (s.teamsEnabled && s.wordLimit <= 0) return WORDS_PER_TURN_TEAMS;
  return s.wordLimit;
}

export const selectCurrentTeam = (s: GameData): number =>
  s.teamsEnabled ? currentTeam(s.turnQueue, s.turnIndex) : -1;

export function pickSettings(s: GameData): PersistedSettings {
  return {
    mode: s.mode,
    level: s.level,
    roundSeconds: s.roundSeconds,
    wordSeconds: s.wordSeconds,
    cats: [...s.cats],
    bonusEnabled: s.bonusEnabled,
    hintsEnabled: s.hintsEnabled,
    skipLimit: s.skipLimit,
    skipPenalty: s.skipPenalty,
    wordLimit: s.wordLimit,
    teamsEnabled: s.teamsEnabled,
    teamCount: s.teamCount,
    teamRounds: s.teamRounds,
    teamNames: [...s.teamNames],
    soundOn: s.soundOn,
    vibeOn: s.vibeOn,
    tiltEnabled: s.tiltEnabled,
    tiltBaseBeta: s.tiltBaseBeta,
  };
}

/**
 * Estado inicial. Os testes chamam com os defaults, então nada do que estiver
 * salvo no dispositivo vaza para dentro deles — e cada chamada devolve `Set`s
 * novos, para um `.add()` acidental não contaminar o teste seguinte.
 */
export function makeInitialState(
  overrides: Partial<GameData> = {},
  s: PersistedSettings = DEFAULT_SETTINGS
): GameData {
  return {
    mode: s.mode,
    level: s.level,
    roundSeconds: s.roundSeconds,
    wordSeconds: s.wordSeconds,
    cats: new Set(s.cats),
    bonusEnabled: s.bonusEnabled,
    hintsEnabled: s.hintsEnabled,
    skipLimit: s.skipLimit,
    skipPenalty: s.skipPenalty,
    wordLimit: s.wordLimit,

    teamsEnabled: s.teamsEnabled,
    teamCount: s.teamCount,
    teamRounds: s.teamRounds,
    teamNames: [...s.teamNames],

    soundOn: s.soundOn,
    vibeOn: s.vibeOn,
    tiltEnabled: s.tiltEnabled,
    tiltBaseBeta: s.tiltBaseBeta,

    customWords: [],

    screen: "home",
    showOnboarding: false,

    deadline: 0,
    pausedAt: null,
    timeLeft: s.mode === "total" ? s.roundSeconds : s.wordSeconds,
    paused: false,

    score: 0,
    deck: [],
    current: null,
    currentBonus: false,
    history: [],
    skipsUsed: 0,
    wordsThisTurn: 0,

    used: new Set(),
    turnQueue: [],
    turnIndex: 0,
    teamScores: [],
    isNewRecord: false,

    tiltNeutral: false,
    tiltPermission: "unknown",

    flashKind: null,
    flashId: 0,
    ...overrides,
  };
}

type SetFn = (partial: Partial<GameData>) => void;
type GetFn = () => GameState;

const persist = (get: GetFn) => saveSettings(pickSettings(get()));

function flash(s: GameData, kind: FlashKind): Partial<GameData> {
  return { flashKind: kind, flashId: s.flashId + 1 };
}

/** Monta o baralho respeitando as palavras já usadas na partida. */
function freshDeck(s: GameData, minPool: number): { deck: WordCard[]; used: Set<string> } {
  let used = s.used;
  let pool = buildPool(s.level, s.cats, s.customWords).filter((x) => !used.has(x.w));
  // Acabaram as inéditas: recicla em vez de deixar o jogo sem palavra.
  if (pool.length < minPool) {
    used = new Set();
    pool = buildPool(s.level, s.cats, s.customWords);
  }
  return { deck: shuffle(pool), used };
}

/** O patch de "saca a próxima carta". Não decide se a vez continua. */
function drawPatch(s: GameData, nowMs: number): Partial<GameData> {
  let deck = s.deck;
  let used = s.used;
  if (deck.length === 0) {
    ({ deck, used } = freshDeck(s, 5));
  }
  const current = deck[deck.length - 1] ?? null;
  const nextUsed = new Set(used);
  if (current) nextUsed.add(current.w);
  return {
    deck: deck.slice(0, -1),
    used: nextUsed,
    current,
    currentBonus: s.bonusEnabled && Math.random() < BONUS_CHANCE,
    tiltNeutral: false,
    ...(s.mode === "perword"
      ? { deadline: nowMs + s.wordSeconds * 1000, timeLeft: s.wordSeconds }
      : {}),
  };
}

/**
 * Fecha a palavra atual e decide o que vem depois.
 *
 * A checagem do limite acontece **antes** de sacar a próxima carta: senão a
 * palavra seguinte entraria em `used` e sumiria da vez do time adversário.
 */
function commitWord(set: SetFn, get: GetFn, extra: Partial<GameData>, nowMs: number) {
  const s = get();
  const wordsThisTurn = s.wordsThisTurn + 1;
  const limit = effectiveWordLimit(s);
  if (limit > 0 && wordsThisTurn >= limit) {
    set({ ...extra, wordsThisTurn });
    sfx.buzzer();
    vibrate([120, 60, 120]);
    get().endTurn("wordLimit");
    return;
  }
  set({ ...extra, wordsThisTurn, ...drawPatch(s, nowMs) });
}

/* -------- store -------- */

export const useGame = create<GameState>((set, get) => ({
  ...makeInitialState(
    {
      customWords: loadCustomWords(),
      showOnboarding: kv.get(ONBOARDED_KEY) !== "1",
    },
    loadSettings()
  ),

  /* ----- configuração ----- */

  setMode: (mode) => {
    set({ mode });
    persist(get);
  },
  setLevel: (level) => {
    set({ level });
    persist(get);
  },
  adjustTime: (delta) => {
    const s = get();
    if (s.mode === "total") {
      set({
        roundSeconds: clampStep(
          s.roundSeconds + delta * ROUND_SECONDS_STEP,
          ROUND_SECONDS_MIN,
          ROUND_SECONDS_MAX,
          ROUND_SECONDS_STEP,
          s.roundSeconds
        ),
      });
    } else {
      set({
        wordSeconds: clampStep(
          s.wordSeconds + delta * WORD_SECONDS_STEP,
          WORD_SECONDS_MIN,
          WORD_SECONDS_MAX,
          WORD_SECONDS_STEP,
          s.wordSeconds
        ),
      });
    }
    persist(get);
  },
  toggleCat: (id) => {
    const cats = new Set(get().cats);
    if (cats.has(id)) {
      if (cats.size > 1) cats.delete(id); // nunca deixa a partida sem palavras
    } else cats.add(id);
    set({ cats });
    persist(get);
  },
  toggleAllCats: () => {
    const s = get();
    const all = new Set(CATEGORIES.map((c) => c.id));
    if (s.customWords.length > 0) all.add("custom");
    set({ cats: s.cats.size >= all.size ? new Set([CATEGORIES[0].id]) : all });
    persist(get);
  },
  setBonusEnabled: (bonusEnabled) => {
    set({ bonusEnabled });
    persist(get);
  },
  setHintsEnabled: (hintsEnabled) => {
    set({ hintsEnabled });
    persist(get);
  },
  setSkipLimit: (skipLimit) => {
    set({ skipLimit });
    persist(get);
  },
  setSkipPenalty: (skipPenalty) => {
    set({ skipPenalty });
    persist(get);
  },
  setWordLimit: (wordLimit) => {
    set({ wordLimit });
    persist(get);
  },
  setCustomWords: (words) => {
    kv.set(CUSTOM_KEY, JSON.stringify(words));
    const cats = new Set(get().cats);
    if (words.length > 0) cats.add("custom");
    else cats.delete("custom");
    set({ customWords: words, cats });
    persist(get);
  },

  /* ----- times ----- */

  setTeamsEnabled: (teamsEnabled) => {
    set({ teamsEnabled });
    persist(get);
  },
  setTeamCount: (n) => {
    set({ teamCount: clampInt(n, MIN_TEAMS, MAX_TEAMS, get().teamCount) });
    persist(get);
  },
  setTeamRounds: (n) => {
    set({ teamRounds: clampInt(n, MIN_ROUNDS, MAX_ROUNDS, get().teamRounds) });
    persist(get);
  },
  setTeamName: (index, name) => {
    set({
      teamNames: get().teamNames.map((old, i) =>
        i === index ? name.slice(0, MAX_TEAM_NAME) : old
      ),
    });
    persist(get);
  },

  /* ----- dispositivo ----- */

  setSoundOn: (soundOn) => {
    setSound(soundOn);
    set({ soundOn });
    persist(get);
  },
  setVibeOn: (vibeOn) => {
    setVibe(vibeOn);
    set({ vibeOn });
    persist(get);
  },
  setTiltEnabled: (tiltEnabled) => {
    if (tiltEnabled && ["denied", "unsupported"].includes(get().tiltPermission)) return;
    set({ tiltEnabled });
    persist(get);
  },
  setTiltPermission: (tiltPermission) => {
    const blocked = tiltPermission === "denied" || tiltPermission === "unsupported";
    set({ tiltPermission, ...(blocked ? { tiltEnabled: false } : {}) });
    persist(get);
  },
  calibrateTilt: (beta) => {
    set({ tiltBaseBeta: clampTiltBase(beta), tiltNeutral: true });
    persist(get);
  },
  resetTiltCalibration: () => {
    set({ tiltBaseBeta: DEFAULT_SETTINGS.tiltBaseBeta, tiltNeutral: true });
    persist(get);
  },

  /* ----- fluxo da partida ----- */

  goHome: () => {
    releaseAwake();
    set({ screen: "home", paused: false, pausedAt: null, deadline: 0, flashKind: null });
  },

  startMatch: () => {
    const s = get();
    set({
      screen: "ready",
      used: new Set(),
      turnIndex: 0,
      turnQueue: s.teamsEnabled ? buildTurnQueue(s.teamCount, s.teamRounds) : [],
      teamScores: s.teamsEnabled ? new Array(s.teamCount).fill(0) : [],
      isNewRecord: false,
    });
  },

  startTurn: () => {
    const s = get();
    // A contagem regressiva pode disparar duas vezes (StrictMode monta o
    // efeito duas vezes em dev); a segunda encontra a tela já trocada.
    if (s.screen !== "ready") return;
    const nowMs = clockNow();
    const seconds = s.mode === "total" ? s.roundSeconds : s.wordSeconds;
    const { deck, used } = freshDeck(s, 10);
    const current = deck.length > 0 ? deck[deck.length - 1] : null;
    const nextUsed = new Set(used);
    if (current) nextUsed.add(current.w);
    keepAwake();
    set({
      screen: "game",
      score: 0,
      history: [],
      paused: false,
      pausedAt: null,
      skipsUsed: 0,
      wordsThisTurn: 0,
      isNewRecord: false,
      deck: deck.slice(0, -1),
      used: nextUsed,
      current,
      currentBonus: s.bonusEnabled && Math.random() < BONUS_CHANCE,
      timeLeft: seconds,
      deadline: nowMs + seconds * 1000,
      tiltNeutral: false,
      flashKind: null,
    });
  },

  syncTime: (nowMs = clockNow()) => {
    const s = get();
    if (s.screen !== "game" || s.paused) return;
    const remaining = s.deadline - nowMs;

    if (remaining > 0) {
      const timeLeft = Math.ceil(remaining / 1000);
      // O relógio é pollado várias vezes por segundo; só reage quando o
      // segundo vira, senão são 5 re-renders e 5 tiques por segundo.
      if (timeLeft === s.timeLeft) return;
      set({ timeLeft });
      const urgent = s.mode === "total" ? 10 : 3;
      if (timeLeft <= urgent) {
        sfx.tick();
        vibrate(40);
      }
      return;
    }

    if (s.mode === "total") {
      set({ timeLeft: 0 });
      sfx.buzzer();
      vibrate([120, 60, 120]);
      get().endTurn("time");
      return;
    }

    if (!s.current) {
      get().endTurn("manual");
      return;
    }
    // Relâmpago: a palavra queimou. O próximo prazo conta a partir de agora,
    // então voltar de 5 min em background queima uma palavra, não trinta.
    sfx.pass();
    vibrate(80);
    const history: HistoryItem[] = [
      ...s.history,
      { word: s.current.w, cat: s.current.c, hit: false, auto: true },
    ];
    commitWord(set, get, { history, ...flash(s, "bad") }, nowMs);
  },

  hit: () => {
    const s = get();
    if (s.screen !== "game" || s.paused || !s.current) return;
    const pts = s.currentBonus ? BONUS_POINTS : 1;
    if (s.currentBonus) sfx.bonus();
    else sfx.ok();
    vibrate(60);
    const history: HistoryItem[] = [
      ...s.history,
      { word: s.current.w, cat: s.current.c, hit: true, bonus: s.currentBonus },
    ];
    commitWord(set, get, { history, score: s.score + pts, ...flash(s, "ok") }, clockNow());
  },

  pass: () => {
    const s = get();
    if (s.screen !== "game" || s.paused || !s.current) return;
    if (s.skipLimit >= 0 && s.skipsUsed >= s.skipLimit) {
      // Pulo bloqueado não consome palavra nem conta para o limite da vez.
      sfx.pass();
      vibrate([40, 40, 40]);
      return;
    }
    sfx.pass();
    vibrate(50);
    const history: HistoryItem[] = [
      ...s.history,
      { word: s.current.w, cat: s.current.c, hit: false },
    ];
    commitWord(
      set,
      get,
      {
        history,
        skipsUsed: s.skipsUsed + 1,
        score: s.skipPenalty && s.score > 0 ? s.score - 1 : s.score,
        ...flash(s, "bad"),
      },
      clockNow()
    );
  },

  onTilt: (beta) => {
    const s = get();
    if (s.screen !== "game" || s.paused || !s.tiltEnabled || !s.current) return;
    switch (tiltDecision(beta, s.tiltBaseBeta, s.tiltNeutral)) {
      case "neutral":
        // O evento chega ~60×/s: só escreve quando o latch realmente muda.
        if (!s.tiltNeutral) set({ tiltNeutral: true });
        break;
      case "hit":
        set({ tiltNeutral: false });
        get().hit();
        break;
      case "pass":
        set({ tiltNeutral: false });
        get().pass();
        break;
    }
  },

  togglePause: (nowMs = clockNow()) => {
    const s = get();
    if (s.screen !== "game") return;
    if (!s.paused) {
      set({ paused: true, pausedAt: nowMs });
    } else {
      set({
        paused: false,
        pausedAt: null,
        deadline: s.deadline + (nowMs - (s.pausedAt ?? nowMs)),
      });
    }
  },

  endTurn: () => {
    const s = get();
    // O tempo pode expirar no mesmo instante em que alguém toca "Encerrar
    // rodada" — sem esta guarda o placar do time receberia o score duas vezes.
    if (s.screen !== "game") return;
    releaseAwake();
    const team = selectCurrentTeam(s);

    if (team >= 0) {
      set({
        screen: "results",
        paused: false,
        pausedAt: null,
        teamScores: s.teamScores.map((v, i) => (i === team ? v + s.score : v)),
        isNewRecord: false, // recorde é só do modo solo
      });
      return;
    }

    const isNewRecord = s.score > getRecord(s.mode, s.level);
    if (isNewRecord) {
      kv.set(recordKey(s.mode, s.level), String(s.score));
      sfx.bonus();
      vibrate([80, 60, 80, 60, 150]);
    }
    set({ screen: "results", paused: false, pausedAt: null, isNewRecord });
  },

  nextTurn: () => {
    const s = get();
    if (!s.teamsEnabled) {
      set({ screen: "ready" });
      return;
    }
    if (isMatchOver(s.turnQueue, s.turnIndex)) {
      sfx.bonus();
      vibrate([100, 80, 100, 80, 200]);
      set({ screen: "champion" });
      return;
    }
    set({ turnIndex: s.turnIndex + 1, screen: "ready" });
  },

  rematch: () => {
    const s = get();
    set({
      screen: "ready",
      turnIndex: 0,
      turnQueue: buildTurnQueue(s.teamCount, s.teamRounds),
      teamScores: new Array(s.teamCount).fill(0),
      used: new Set(),
      isNewRecord: false,
    });
  },

  /* ----- onboarding e recordes ----- */

  dismissOnboarding: () => {
    kv.set(ONBOARDED_KEY, "1");
    set({ showOnboarding: false });
  },
  replayOnboarding: () => set({ showOnboarding: true }),

  clearRecords: () => {
    for (const m of ALL_MODES) for (const l of ALL_LEVELS) kv.remove(recordKey(m, l));
    set({ isNewRecord: false });
  },
}));

// Alinha os módulos de som e vibração com o que ficou salvo do último jogo.
// Seguro fora de um gesto do usuário: `setSound` só mexe numa flag — quem cria
// o AudioContext é `unlockAudio()`, no clique do JOGAR.
setSound(useGame.getState().soundOn);
setVibe(useGame.getState().vibeOn);
