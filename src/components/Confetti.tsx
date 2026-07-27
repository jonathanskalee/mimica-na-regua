import { useMemo } from "react";
import { TEAM_COLORS } from "../store/teams";

const COLORS = [...TEAM_COLORS, "#fff8ed"];

/** Sessenta papeizinhos caindo. Some inteiro com movimento reduzido (ver index.css). */
export default function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}vw`,
        background: COLORS[Math.floor(Math.random() * COLORS.length)],
        animationDuration: `${2.2 + Math.random() * 2}s`,
        animationDelay: `${Math.random() * 0.8}s`,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {pieces.map((style, i) => (
        <span key={i} className="confetti" style={style} />
      ))}
    </div>
  );
}
