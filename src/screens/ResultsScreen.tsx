import { selectCurrentTeam, useGame } from "../store/gameStore";
import { isMatchOver, nextTeam, teamName } from "../store/teams";
import Scoreboard from "../components/Scoreboard";
import { BigButton } from "../components/ui";

/** O intervalo: o que rolou na vez que acabou e quem entra agora. */
export default function ResultsScreen() {
  const g = useGame();
  const team = selectCurrentTeam(g);
  const upNext = g.teamsEnabled ? nextTeam(g.turnQueue, g.turnIndex) : -1;
  const matchOver = g.teamsEnabled && isMatchOver(g.turnQueue, g.turnIndex);

  const nextLabel = !g.teamsEnabled
    ? "Jogar de novo"
    : matchOver
      ? "🏆 Ver o campeão"
      : `Vez de ${teamName(g.teamNames, upNext)}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center overflow-y-auto">
      <div className="text-[11px] tracking-[.28em] uppercase text-golddim font-semibold">
        {team >= 0 ? `Fim da vez de ${teamName(g.teamNames, team)}` : "Fim da rodada"}
      </div>

      <div>
        <div className="font-display tabular text-6xl text-gold leading-none">{g.score}</div>
        <div className="text-mutedc text-[13px] mt-1">
          {g.score === 1 ? "ponto nesta vez" : "pontos nesta vez"}
        </div>
      </div>

      {g.isNewRecord && (
        <div className="animate-pop bg-gold/15 border border-gold text-gold px-4 py-1.5 rounded-full text-xs font-bold">
          🏆 Recorde novo!
        </div>
      )}

      {g.teamsEnabled && (
        <>
          <div className="hairline w-full max-w-[320px]" />
          <Scoreboard scores={g.teamScores} names={g.teamNames} />
        </>
      )}

      {g.history.length > 0 && (
        <ul className="w-full max-w-[320px] flex flex-col gap-2 overflow-y-auto">
          {g.history
            .slice()
            .reverse()
            .map((h, i) => (
              <li
                key={`${h.word}-${i}`}
                className={`panel rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-[13px] ${
                  h.hit ? "" : "opacity-55"
                }`}
              >
                <span className="text-left flex-1">{h.word}</span>
                {h.hit ? (
                  h.bonus ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/25 text-gold">
                      ★ +3
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ok/20 text-[#7fdb9b]">
                      Acertou
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-passc/30 text-[#e3b9c0]">
                    {h.auto ? "Tempo" : "Pulou"}
                  </span>
                )}
              </li>
            ))}
        </ul>
      )}

      <div className="w-full max-w-[320px] flex gap-2.5 pt-2 shrink-0">
        <button
          onClick={g.goHome}
          className="flex-1 panel rounded-2xl py-3.5 text-[13px] font-semibold"
        >
          Menu
        </button>
        <div className="flex-[1.4]">
          <BigButton onClick={g.nextTurn}>
            <span className="text-[15px]">{nextLabel}</span>
          </BigButton>
        </div>
      </div>
    </div>
  );
}
