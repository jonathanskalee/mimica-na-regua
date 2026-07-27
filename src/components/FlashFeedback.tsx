import { FlashKind } from "../store/gameStore";

/**
 * Clarão verde no acerto, vermelho no pulo.
 *
 * A `key` vem do contador de flashes do store: trocar a key remonta o elemento
 * e reinicia a animação mesmo em toques em sequência rápida.
 *
 * O clarão acende as bordas e não o centro, para a palavra que acabou de
 * entrar continuar legível enquanto ele passa.
 */
export default function FlashFeedback({ kind, id }: { kind: FlashKind | null; id: number }) {
  if (!kind) return null;
  return (
    <div
      key={id}
      aria-hidden="true"
      className="animate-flash absolute inset-0 pointer-events-none z-10"
      style={{
        background:
          kind === "ok"
            ? "radial-gradient(circle at 50% 45%, transparent 24%, rgba(61,163,93,.5) 95%)"
            : "radial-gradient(circle at 50% 45%, transparent 24%, rgba(209,73,91,.5) 95%)",
      }}
    />
  );
}
