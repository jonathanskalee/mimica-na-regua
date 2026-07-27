import { useState } from "react";
import { useGame } from "../store/gameStore";
import { BigButton, MarqueeBulbs } from "../components/ui";

const CARDS = [
  {
    icon: "🎭",
    title: "Só mímica",
    body: "Quem está com o celular faz a mímica da palavra. Nada de falar, apontar pro objeto ou desenhar no ar as letras.",
  },
  {
    icon: "👀",
    title: "O resto adivinha",
    body: "Acertou, toque em Acertou e a próxima palavra entra na hora. Travou? Pular passa pra outra — mas o limite de pulos você escolhe antes.",
  },
  {
    icon: "⏱",
    title: "Dois jeitos de jogar",
    body: "Na Corrida vale o tempo total da rodada. No Relâmpago cada palavra tem seu próprio tempo. Com times, cada um tem a sua vez.",
  },
];

export default function OnboardingOverlay() {
  const dismiss = useGame((s) => s.dismissOnboarding);
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 px-6 text-center overflow-y-auto py-10"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(242,193,78,.12), transparent 55%), linear-gradient(180deg,#14070c,#2b1018)",
      }}
    >
      <MarqueeBulbs count={7} />

      <div className="text-[64px] leading-none" aria-hidden="true">
        {card.icon}
      </div>

      <div className="flex flex-col gap-3 max-w-[320px]">
        <h2 className="font-display tracking-tight-display text-3xl text-gold">{card.title}</h2>
        <p className="text-[14px] leading-relaxed text-cardlight/85">{card.body}</p>
      </div>

      <div className="flex gap-2" aria-hidden="true">
        {CARDS.map((_, n) => (
          <span
            key={n}
            className={`h-1.5 rounded-full transition-all ${
              n === i ? "w-6 bg-gold" : "w-1.5 bg-gold/30"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <BigButton onClick={() => (last ? dismiss() : setI(i + 1))}>
          {last ? "Bora jogar" : "Próximo"}
        </BigButton>
        {!last && (
          <button onClick={dismiss} className="text-mutedc underline text-[13px]">
            Já sei jogar
          </button>
        )}
      </div>
    </div>
  );
}
