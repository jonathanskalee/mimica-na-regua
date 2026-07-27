import { useGame } from "../store/gameStore";
import { championLabel } from "../store/teams";
import Confetti from "../components/Confetti";
import Scoreboard from "../components/Scoreboard";
import { BigButton, MarqueeBulbs } from "../components/ui";

/** A ovação. */
export default function ChampionScreen() {
  const g = useGame();

  return (
    <div className="flex-1 relative flex flex-col items-center justify-center gap-4 px-5 py-8 text-center overflow-y-auto">
      <Confetti />

      <div className="relative flex flex-col items-center gap-3">
        <MarqueeBulbs count={9} />
        <div className="animate-trophy text-[56px]" aria-hidden="true">
          🏆
        </div>
        <div className="text-[11px] tracking-[.28em] uppercase text-golddim font-semibold">
          Campeão da partida
        </div>
        <h1 className="font-display tracking-tight-display text-4xl text-gold leading-none px-4">
          {championLabel(g.teamScores, g.teamNames)}
        </h1>
      </div>

      <div className="hairline w-full max-w-[320px] my-1" />

      <Scoreboard scores={g.teamScores} names={g.teamNames} highlightLeader />

      <div className="w-full max-w-[320px] flex gap-2.5 mt-3">
        <button
          onClick={g.goHome}
          className="flex-1 panel rounded-2xl py-3.5 text-[13px] font-semibold"
        >
          Menu
        </button>
        <div className="flex-[1.4]">
          <BigButton onClick={g.rematch}>Revanche</BigButton>
        </div>
      </div>
    </div>
  );
}
