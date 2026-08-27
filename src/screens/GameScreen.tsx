import { effectiveWordLimit, selectCurrentTeam, useGame } from "../store/gameStore";
import { categoryMeta, LEVEL_LABELS } from "../data";
import { TEAM_COLORS, teamName } from "../store/teams";
import { useGameClock } from "../hooks/useGameClock";
import { useDeviceTilt } from "../hooks/useDeviceTilt";
import FlashFeedback from "../components/FlashFeedback";

const R = 26;
const CIRC = 2 * Math.PI * R;

export default function GameScreen() {
  const g = useGame();
  useGameClock();
  useDeviceTilt(g.tiltEnabled);

  const total = g.mode === "total" ? g.roundSeconds : g.wordSeconds;
  const frac = Math.max(0, Math.min(1, g.timeLeft / total));
  const urgent = g.timeLeft <= (g.mode === "total" ? 10 : 3) && g.timeLeft > 0;
  const skipsLeft = g.skipLimit < 0 ? null : g.skipLimit - g.skipsUsed;
  const meta = g.current ? categoryMeta(g.current.c) : null;
  const team = selectCurrentTeam(g);
  const limit = effectiveWordLimit(g);

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] relative">
      <FlashFeedback kind={g.flashKind} id={g.flashId} />

      {/* placa de cima: quem está jogando, o relógio, o placar */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {team >= 0 ? (
            <div
              className="rounded-full px-3 py-1.5 text-xs font-bold truncate max-w-[104px]"
              style={{
                background: `${TEAM_COLORS[team]}22`,
                color: TEAM_COLORS[team],
                border: `1px solid ${TEAM_COLORS[team]}`,
              }}
            >
              {teamName(g.teamNames, team)}
            </div>
          ) : (
            <div className="panel rounded-full px-3 py-1.5 text-[11px]">
              Nível <b className="font-display text-gold text-[15px]">{LEVEL_LABELS[g.level]}</b>
            </div>
          )}
        </div>

        <button
          onClick={() => g.togglePause()}
          aria-label={g.paused ? "Continuar" : "Pausar"}
          className={`w-11 h-11 rounded-full border border-gold/25 flex items-center justify-center text-[17px] shrink-0 ${
            g.paused ? "bg-gold text-cardink" : "bg-gold/15 text-gold"
          }`}
        >
          {g.paused ? "▶" : "⏸"}
        </button>

        <div className="relative w-[60px] h-[60px] shrink-0">
          <svg width="60" height="60" className="-rotate-90" aria-hidden="true">
            <circle cx="30" cy="30" r={R} fill="none" strokeWidth="5" stroke="rgba(255,255,255,.12)" />
            <circle
              cx="30"
              cy="30"
              r={R}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              stroke={g.paused ? "#caa9a1" : urgent ? "#d1495b" : "#f2c14e"}
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - frac)}
              style={{ transition: "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          <div
            className={`absolute inset-0 flex items-center justify-center font-display tabular text-lg ${
              urgent ? "text-danger animate-blink" : ""
            }`}
          >
            {g.timeLeft}
          </div>
        </div>

        <div className="panel rounded-full px-3 py-1.5 text-[11px] shrink-0" aria-live="polite">
          Pontos <b className="font-display tabular text-gold text-[15px]">{g.score}</b>
        </div>
      </div>

      {/* palco */}
      <div className="flex-1 flex items-center justify-center relative my-3 min-h-0">
        <div className="spotlight absolute w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(242,193,78,.16),transparent_65%)]" />

        <div
          key={g.current?.w}
          className={`animate-flip ticket relative rounded-2xl w-full max-w-[310px] min-h-[196px] flex flex-col shadow-[0_18px_40px_rgba(0,0,0,.45)] ${
            g.currentBonus
              ? "!bg-gradient-to-br from-[#ffe9b0] to-gold shadow-[0_18px_40px_rgba(0,0,0,.45),0_0_34px_rgba(242,193,78,.55)]"
              : ""
          }`}
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-5 py-6 text-center">
            {g.currentBonus && (
              <span className="text-[10px] font-extrabold uppercase tracking-[.18em] bg-cardink text-gold px-3 py-1 rounded-full">
                ★ Camarote · vale 3
              </span>
            )}
            {meta && (
              <span className="text-[10px] uppercase tracking-[.24em] text-[#8a6a70] font-bold">
                {meta.icon} {meta.name}
              </span>
            )}
            <div className="font-display tracking-tight-display text-[34px] leading-[1.05] break-words">
              {g.current?.w.toUpperCase() ?? "…"}
            </div>
            {g.hintsEnabled && g.current?.h && (
              <p className="text-[12px] italic text-[#8a6a70] px-2 leading-snug">
                💡 {g.current.h}
              </p>
            )}
          </div>

          {/* canhoto */}
          <div className="ticket-perf flex items-center justify-between px-5 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a6a70]">
            <span>{limit > 0 ? `Palavra ${g.wordsThisTurn + 1}/${limit}` : "Mímica na régua"}</span>
            <span>{g.mode === "total" ? "Corrida" : "Relâmpago"}</span>
          </div>

          {g.paused && (
            <div
              className="absolute inset-0 rounded-2xl bg-[rgba(36,16,20,.96)] text-gold flex flex-col items-center justify-center gap-1.5 z-10"
              aria-live="assertive"
            >
              <div className="text-3xl">⏸</div>
              <b className="font-display text-xl tracking-wide">PAUSADO</b>
              <span className="text-xs text-mutedc max-w-[200px] text-center">
                Ninguém espia. Toque em play pra voltar.
              </span>
            </div>
          )}
        </div>
      </div>

      {g.tiltEnabled && (
        <div className="flex justify-between text-[11px] text-mutedc px-1 pb-2">
          <span>⬆ pra cima: pula</span>
          <span>⬇ pra baixo: acertou</span>
        </div>
      )}

      {/* ações */}
      <div className="flex gap-3">
        <button
          onClick={g.pass}
          disabled={g.paused || (skipsLeft !== null && skipsLeft <= 0)}
          className="flex-1 rounded-2xl py-4 font-bold text-[15px] bg-passc text-[#fff0ea] flex flex-col items-center gap-0.5 shadow-[0_6px_0_rgba(0,0,0,.25)] active:shadow-[0_2px_0_rgba(0,0,0,.25)] active:translate-y-1 disabled:opacity-40"
        >
          <span className="text-xl" aria-hidden="true">
            ⏭
          </span>
          Pular
          <small className="text-[10px] font-semibold opacity-80">
            {skipsLeft === null ? " " : `restam ${skipsLeft}`}
          </small>
        </button>
        <button
          onClick={g.hit}
          disabled={g.paused}
          className="flex-1 rounded-2xl py-4 font-bold text-[15px] bg-ok text-[#eafff1] flex flex-col items-center gap-0.5 shadow-[0_6px_0_rgba(0,0,0,.25)] active:shadow-[0_2px_0_rgba(0,0,0,.25)] active:translate-y-1 disabled:opacity-40"
        >
          <span className="text-xl" aria-hidden="true">
            ✓
          </span>
          Acertou
          <small className="text-[10px]">{" "}</small>
        </button>
      </div>

      <button
        onClick={() => g.endTurn("manual")}
        className="mt-3 text-mutedc text-xs underline self-center"
      >
        Encerrar {team >= 0 ? "a vez" : "a rodada"}
      </button>
    </div>
  );
}
