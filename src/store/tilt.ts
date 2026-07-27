/**
 * Modo testa — decisão pura a partir do ângulo do celular.
 *
 * O jogador põe o celular na testa com a tela pra fora: inclinar pra baixo é
 * acertou, pra cima é pula. Entre um gesto e outro é preciso voltar à vertical
 * — é o que o `armed` (latch) garante, sem depender de cooldown por tempo.
 */

export type TiltAction = "hit" | "pass" | "neutral" | "none";

/** Celular na vertical. Serve de base quando o jogador não calibrou. */
export const TILT_BASE_DEFAULT = 90;
/** Meia-largura da banda neutra: dentro dela o gesto rearma. */
export const TILT_NEUTRAL_HALF = 35;
/** Quanto precisa inclinar pra frente pra contar como acerto. */
export const TILT_HIT_DELTA = 50;
/** Quanto precisa inclinar pra trás pra contar como pulo. */
export const TILT_PASS_DELTA = -55;
/** Abaixo disso o `beta` já não descreve o gesto — ignora. */
export const TILT_PASS_FLOOR = -180;

/** Calibrações fora desta faixa deixariam os limiares fora do domínio do beta. */
export const TILT_BASE_MIN = 40;
export const TILT_BASE_MAX = 140;

export function clampTiltBase(beta: number): number {
  if (!Number.isFinite(beta)) return TILT_BASE_DEFAULT;
  return Math.min(TILT_BASE_MAX, Math.max(TILT_BASE_MIN, beta));
}

/**
 * Com `base = 90` os limiares reproduzem o legacy exatamente
 * (neutro 55–125, acerto ≥140, pulo ≤35), então calibrar é retrocompatível.
 *
 * Os deltas são absolutos em graus, não proporcionais: a física do gesto
 * (inclinar o pulso ~50°) não muda porque o ponto neutro mudou.
 */
export function tiltDecision(beta: number, base: number, armed: boolean): TiltAction {
  if (!Number.isFinite(beta)) return "none";
  const d = beta - base;
  if (d > -TILT_NEUTRAL_HALF && d < TILT_NEUTRAL_HALF) return "neutral";
  if (!armed) return "none";
  if (d >= TILT_HIT_DELTA) return "hit";
  if (d <= TILT_PASS_DELTA && d >= TILT_PASS_FLOOR) return "pass";
  return "none";
}
