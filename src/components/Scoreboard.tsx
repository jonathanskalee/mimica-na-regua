import { TEAM_COLORS, teamName, winners } from "../store/teams";

export function TeamBadge({
  index,
  names,
  className = "",
}: {
  index: number;
  names: string[];
  className?: string;
}) {
  const color = TEAM_COLORS[index] ?? TEAM_COLORS[0];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold ${className}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}` }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {teamName(names, index)}
    </span>
  );
}

/**
 * O placar. Fora da tela de campeão ninguém é destacado — no meio da partida,
 * apontar um líder só desanima quem está atrás.
 */
export default function Scoreboard({
  scores,
  names,
  highlightLeader = false,
}: {
  scores: number[];
  names: string[];
  highlightLeader?: boolean;
}) {
  const leaders = highlightLeader ? winners(scores) : [];

  return (
    <ul className="w-full max-w-[320px] flex flex-col gap-2">
      {scores.map((points, i) => {
        const color = TEAM_COLORS[i] ?? TEAM_COLORS[0];
        const isLeader = leaders.includes(i);
        return (
          <li
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm border ${
              isLeader ? "border-gold bg-gold/12" : "panel"
            }`}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
            <span className="flex-1 text-left font-semibold">{teamName(names, i)}</span>
            <span className="font-display tabular text-xl text-gold">{points}</span>
          </li>
        );
      })}
    </ul>
  );
}
