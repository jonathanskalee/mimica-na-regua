/**
 * Configurações persistidas.
 *
 * Tudo numa chave só (`mimica_settings`), com merge defensivo campo a campo:
 * um valor corrompido cai no default sem derrubar os vizinhos, porque perder
 * as preferências inteiras por causa de um campo estragado seria pior.
 */

import { CATEGORIES, Level, Mode } from "../data";
import { store as kv } from "../lib/fx";
import {
  DEFAULT_TEAM_NAMES,
  MAX_ROUNDS,
  MAX_TEAM_NAME,
  MAX_TEAMS,
  MIN_ROUNDS,
  MIN_TEAMS,
} from "./teams";
import { TILT_BASE_DEFAULT, clampTiltBase } from "./tilt";

export const SETTINGS_KEY = "mimica_settings";

export const ROUND_SECONDS_MIN = 30;
export const ROUND_SECONDS_MAX = 180;
export const ROUND_SECONDS_STEP = 10;
export const WORD_SECONDS_MIN = 5;
export const WORD_SECONDS_MAX = 30;
export const WORD_SECONDS_STEP = 5;

export const SKIP_LIMITS = [-1, 3, 5];
/** 0 = sem limite. */
export const WORD_LIMITS = [0, 10, 15, 20];

export interface PersistedSettings {
  mode: Mode;
  level: Level;
  roundSeconds: number;
  wordSeconds: number;
  cats: string[];
  bonusEnabled: boolean;
  skipLimit: number;
  skipPenalty: boolean;
  wordLimit: number;
  teamsEnabled: boolean;
  teamCount: number;
  teamRounds: number;
  teamNames: string[];
  soundOn: boolean;
  vibeOn: boolean;
  tiltEnabled: boolean;
  tiltBaseBeta: number;
}

const allCatIds = () => CATEGORIES.map((c) => c.id);

export const DEFAULT_SETTINGS: PersistedSettings = {
  mode: "total",
  level: "facil",
  roundSeconds: 60,
  wordSeconds: 10,
  cats: allCatIds(),
  bonusEnabled: true,
  skipLimit: -1,
  skipPenalty: false,
  wordLimit: 15,
  teamsEnabled: false,
  teamCount: 2,
  teamRounds: 1,
  teamNames: [...DEFAULT_TEAM_NAMES],
  soundOn: true,
  vibeOn: true,
  tiltEnabled: false,
  tiltBaseBeta: TILT_BASE_DEFAULT,
};

/* -------- validadores -------- */

export function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Arredonda para o passo mais próximo dentro da faixa (ex.: 47s -> 50s). */
export function clampStep(
  value: unknown,
  min: number,
  max: number,
  step: number,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const snapped = min + Math.round((value - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readCats(value: unknown): string[] {
  if (!Array.isArray(value)) return allCatIds();
  const known = new Set([...allCatIds(), "custom"]);
  const cats = value.filter((c): c is string => typeof c === "string" && known.has(c));
  // Ficar sem nenhuma categoria deixaria o jogo sem palavras.
  return cats.length > 0 ? [...new Set(cats)] : allCatIds();
}

function readTeamNames(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  return DEFAULT_TEAM_NAMES.map((fallback, i) => {
    const name = typeof raw[i] === "string" ? (raw[i] as string).trim().slice(0, MAX_TEAM_NAME) : "";
    return name || fallback;
  });
}

/* -------- leitura e escrita -------- */

export function loadSettings(): PersistedSettings {
  let raw: unknown;
  try {
    const text = kv.get(SETTINGS_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null;
  }
  const s: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  return {
    mode: oneOf<Mode>(s.mode, ["total", "perword"], DEFAULT_SETTINGS.mode),
    level: oneOf<Level>(s.level, ["facil", "medio", "dificil"], DEFAULT_SETTINGS.level),
    roundSeconds: clampStep(
      s.roundSeconds,
      ROUND_SECONDS_MIN,
      ROUND_SECONDS_MAX,
      ROUND_SECONDS_STEP,
      DEFAULT_SETTINGS.roundSeconds
    ),
    wordSeconds: clampStep(
      s.wordSeconds,
      WORD_SECONDS_MIN,
      WORD_SECONDS_MAX,
      WORD_SECONDS_STEP,
      DEFAULT_SETTINGS.wordSeconds
    ),
    cats: readCats(s.cats),
    bonusEnabled: bool(s.bonusEnabled, DEFAULT_SETTINGS.bonusEnabled),
    skipLimit: oneOf(s.skipLimit, SKIP_LIMITS, DEFAULT_SETTINGS.skipLimit),
    skipPenalty: bool(s.skipPenalty, DEFAULT_SETTINGS.skipPenalty),
    wordLimit: oneOf(s.wordLimit, WORD_LIMITS, DEFAULT_SETTINGS.wordLimit),
    teamsEnabled: bool(s.teamsEnabled, DEFAULT_SETTINGS.teamsEnabled),
    teamCount: clampInt(s.teamCount, MIN_TEAMS, MAX_TEAMS, DEFAULT_SETTINGS.teamCount),
    teamRounds: clampInt(s.teamRounds, MIN_ROUNDS, MAX_ROUNDS, DEFAULT_SETTINGS.teamRounds),
    teamNames: readTeamNames(s.teamNames),
    soundOn: bool(s.soundOn, DEFAULT_SETTINGS.soundOn),
    vibeOn: bool(s.vibeOn, DEFAULT_SETTINGS.vibeOn),
    tiltEnabled: bool(s.tiltEnabled, DEFAULT_SETTINGS.tiltEnabled),
    tiltBaseBeta:
      typeof s.tiltBaseBeta === "number" && Number.isFinite(s.tiltBaseBeta)
        ? clampTiltBase(s.tiltBaseBeta)
        : DEFAULT_SETTINGS.tiltBaseBeta,
  };
}

export function saveSettings(s: PersistedSettings) {
  try {
    kv.set(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}
