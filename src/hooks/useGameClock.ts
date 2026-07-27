import { useEffect } from "react";
import { useGame } from "../store/gameStore";

/**
 * Empurra o relógio do jogo.
 *
 * Sincroniza 5×/s para o anel do cronômetro andar liso, mas o store só escreve
 * quando o segundo vira. O `visibilitychange` é o que conserta o atraso quando
 * o jogador troca de app e volta — o tempo é calculado por timestamp, então a
 * primeira sincronização já mostra o valor correto.
 */
export function useGameClock() {
  useEffect(() => {
    const sync = () => useGame.getState().syncTime(Date.now());
    const id = setInterval(sync, 200);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
}
