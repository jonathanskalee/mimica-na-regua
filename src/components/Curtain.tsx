/**
 * A cortina de veludo.
 *
 * Fecha quando a tela de preparação entra e abre no "VAI!", revelando o palco.
 * É o único momento coreografado do app — o resto fica quieto de propósito.
 */
import { ReactNode } from "react";

export default function Curtain({ open, children }: { open: boolean; children?: ReactNode }) {
  return (
    <div className={`absolute inset-0 overflow-hidden z-20 ${open ? "curtain-open" : ""}`}>
      <div className="curtain-panel left" />
      <div className="curtain-panel right" />
      {/* Bandô: a faixa de cima não sobe junto com os painéis. */}
      <div
        className="absolute top-0 inset-x-0 h-9 border-b-2 border-gold/40 shadow-[0_6px_18px_rgba(0,0,0,.5)]"
        style={{
          background:
            "repeating-linear-gradient(90deg,#4d1119 0px,#7a1f2b 14px,#99303d 21px,#7a1f2b 28px,#4d1119 42px)",
        }}
      />
      {children && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center transition-opacity duration-300 ${
            open ? "opacity-0" : "opacity-100"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
