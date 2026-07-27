import { useEffect, useState } from "react";
import { selectCurrentTeam, useGame } from "../store/gameStore";
import { LEVEL_LABELS } from "../data";
import { roundNumber } from "../store/teams";
import { sfx } from "../lib/fx";
import Curtain from "../components/Curtain";
import { TeamBadge } from "../components/Scoreboard";

/**
 * A cortina fechada.
 *
 * Conta 3-2-1 sobre o veludo e abre no "VAI!" — o tempo da animação é o mesmo
 * que o jogador leva para virar o celular para quem vai fazer a mímica.
 */
export default function ReadyScreen() {
  const g = useGame();
  const [count, setCount] = useState(3);
  const [open, setOpen] = useState(false);
  const team = selectCurrentTeam(g);

  useEffect(() => {
    sfx.count();
    const id = setInterval(() => {
      setCount((prev) => {
        if (prev > 1) {
          sfx.count();
          return prev - 1;
        }
        clearInterval(id);
        sfx.go();
        setOpen(true);
        // Deixa a cortina abrir antes de mostrar a palavra.
        setTimeout(() => useGame.getState().startTurn(), 620);
        return 0;
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex-1 relative">
      <Curtain open={open}>
        {team >= 0 ? (
          <>
            <TeamBadge index={team} names={g.teamNames} className="!text-lg !px-5 !py-2" />
            <div className="text-[11px] uppercase tracking-[.28em] text-gold/80">
              Rodada {roundNumber(g.turnIndex, g.teamCount)} de {g.teamRounds}
            </div>
          </>
        ) : (
          <div className="text-[11px] uppercase tracking-[.28em] text-gold/80">
            {g.mode === "total" ? "Corrida" : "Relâmpago"} · Nível {LEVEL_LABELS[g.level]}
          </div>
        )}

        <div
          aria-live="assertive"
          className="font-display tabular text-[112px] leading-none text-cardlight drop-shadow-[0_0_40px_rgba(242,193,78,.5)]"
        >
          {count || "VAI!"}
        </div>

        <p className="text-cardlight/70 text-[13px] max-w-[260px]">
          {g.tiltEnabled
            ? "Celular na testa, tela pra fora. Inclina pra baixo se acertou, pra cima pra pular."
            : "Passa o celular pra quem vai fazer a mímica. Mais ninguém pode ver a palavra."}
        </p>

        <button
          className="pointer-events-auto text-cardlight/60 underline text-[13px] mt-2"
          onClick={g.goHome}
        >
          Cancelar
        </button>
      </Curtain>
    </div>
  );
}
