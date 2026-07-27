/* Sons (WebAudio), vibração e storage seguro. */

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

/**
 * Cria (ou retoma) o AudioContext. Navegadores só permitem isso dentro de um
 * gesto do usuário — chamar no clique do JOGAR, nunca no boot.
 */
export function unlockAudio() {
  const c = ac();
  if (c?.state === "suspended") c.resume().catch(() => {});
}

let soundOn = true;
export function setSound(on: boolean) {
  soundOn = on;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25, when = 0) {
  if (!soundOn) return;
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur);
}

export const sfx = {
  ok: () => {
    tone(660, 0.12, "sine", 0.3);
    tone(880, 0.18, "sine", 0.3, 0.1);
  },
  bonus: () => {
    tone(660, 0.1, "sine", 0.3);
    tone(880, 0.1, "sine", 0.3, 0.09);
    tone(1180, 0.22, "sine", 0.3, 0.18);
  },
  pass: () => tone(220, 0.18, "sawtooth", 0.18),
  tick: () => tone(1000, 0.05, "square", 0.12),
  buzzer: () => {
    tone(180, 0.5, "sawtooth", 0.3);
    tone(140, 0.5, "sawtooth", 0.3, 0.05);
  },
  count: () => tone(520, 0.1, "sine", 0.25),
  go: () => tone(780, 0.25, "sine", 0.3),
};

let vibeOn = true;
export function setVibe(on: boolean) {
  vibeOn = on;
}
export function vibrate(pattern: number | number[]) {
  if (vibeOn && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* noop */
    }
  }
}

/* -------- storage seguro (fallback em memória) -------- */
const mem: Record<string, string> = {};
export const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(k) ?? mem[k] ?? null;
    } catch {
      return mem[k] ?? null;
    }
  },
  set(k: string, v: string) {
    mem[k] = v;
    try {
      localStorage.setItem(k, v);
    } catch {
      /* noop */
    }
  },
  remove(k: string) {
    delete mem[k];
    try {
      localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  },
};

/* -------- wake lock -------- */
let wakeLock: any = null;
export async function keepAwake() {
  try {
    if ("wakeLock" in navigator) wakeLock = await (navigator as any).wakeLock.request("screen");
  } catch {
    /* noop */
  }
}
export function releaseAwake() {
  try {
    wakeLock?.release();
    wakeLock = null;
  } catch {
    /* noop */
  }
}
