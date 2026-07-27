/**
 * Modo Times — funções puras.
 *
 * Nada aqui conhece o store, o React ou o browser: a fila de vezes, o cálculo
 * do campeão e o empate são só aritmética sobre arrays, e por isso dá pra
 * testar uma partida inteira sem simular uma partida inteira.
 */

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 3;
export const MAX_TEAM_NAME = 16;

/**
 * Ouro, verde, vermelho e azul-petróleo. O legacy usava #4ea8de no quarto;
 * trocado pelo petróleo art-déco para não destoar da identidade do app.
 */
export const TEAM_COLORS = ["#f2c14e", "#3da35d", "#d1495b", "#3e8e9e"] as const;

export const DEFAULT_TEAM_NAMES = ["Time 1", "Time 2", "Time 3", "Time 4"];

/** Nome de exibição do time `i`, com fallback para "Time N". */
export function teamName(names: string[], i: number): string {
  return names[i]?.trim() || DEFAULT_TEAM_NAMES[i] || `Time ${i + 1}`;
}

/**
 * A ordem das vezes, achatada: 3 times × 2 rodadas => [0,1,2,0,1,2].
 * Cada rodada dá uma vez a cada time, na mesma ordem.
 */
export function buildTurnQueue(teamCount: number, teamRounds: number): number[] {
  const queue: number[] = [];
  for (let r = 0; r < teamRounds; r++) {
    for (let t = 0; t < teamCount; t++) queue.push(t);
  }
  return queue;
}

/** Índice do time da vez, ou -1 fora da fila. */
export function currentTeam(queue: number[], index: number): number {
  return queue[index] ?? -1;
}

/** Índice do próximo time, ou -1 se a partida acabou. */
export function nextTeam(queue: number[], index: number): number {
  return queue[index + 1] ?? -1;
}

/** Rodada atual, 1-based. */
export function roundNumber(index: number, teamCount: number): number {
  if (teamCount <= 0) return 1;
  return Math.floor(index / teamCount) + 1;
}

export function isMatchOver(queue: number[], index: number): boolean {
  return index >= queue.length - 1;
}

/** Índices de todos os times empatados na maior pontuação. */
export function winners(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  return scores.reduce<number[]>((acc, s, i) => (s === max ? [...acc, i] : acc), []);
}

/**
 * "Time 2" para vencedor único, "Empate! Time 1 & Time 3" para dois,
 * "Empate! Time 1, Time 2 & Time 4" para três ou mais.
 */
export function championLabel(scores: number[], names: string[]): string {
  const win = winners(scores);
  if (win.length === 0) return "";
  const labels = win.map((i) => teamName(names, i));
  if (labels.length === 1) return labels[0];
  const last = labels[labels.length - 1];
  return `Empate! ${labels.slice(0, -1).join(", ")} & ${last}`;
}
