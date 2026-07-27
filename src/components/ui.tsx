import { ReactNode, useEffect } from "react";

/* Peças pequenas que se repetem em todas as telas. */

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`panel rounded-2xl p-4 w-full max-w-[360px] flex flex-col gap-3 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-[11px] font-bold uppercase tracking-[.22em] text-gold">{children}</h2>
      {aside && <span className="text-[11px] text-mutedc">{aside}</span>}
    </div>
  );
}

export function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full border transition-colors shrink-0 ${
        on ? "bg-ok/50 border-ok" : "bg-black/35 border-gold/25"
      }`}
    >
      <span
        className={`absolute top-[2px] w-[22px] h-[22px] rounded-full transition-all ${
          on ? "left-[22px] bg-white" : "left-[2px] bg-mutedc"
        }`}
      />
    </button>
  );
}

export interface Option<T> {
  value: T;
  label: ReactNode;
  hint?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  activeClass = "bg-gold text-cardink",
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  activeClass?: string | ((v: T) => string);
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5 bg-black/25 rounded-xl p-1">
      {options.map((o) => {
        const active = o.value === value;
        const cls = typeof activeClass === "function" ? activeClass(o.value) : activeClass;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-lg py-2 px-1 text-[11px] font-semibold leading-tight transition-colors ${
              active ? cls : "text-mutedc"
            }`}
          >
            <b className="block text-[13px]">{o.label}</b>
            {o.hint}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({
  active,
  onClick,
  children,
  dashed = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dashed?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold border transition-colors ${
        dashed ? "border-dashed" : ""
      } ${
        active
          ? "bg-gold/20 border-gold text-cardlight"
          : "border-gold/25 bg-black/20 text-mutedc"
      }`}
    >
      {children}
    </button>
  );
}

/** Botão grande com a sombra "de palco" — o mesmo relevo do JOGAR. */
export function BigButton({
  onClick,
  children,
  className = "bg-gold text-cardink",
  disabled = false,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl py-4 font-display text-xl tracking-wide shadow-[0_6px_0_rgba(0,0,0,.3)] active:shadow-[0_2px_0_rgba(0,0,0,.3)] active:translate-y-1 transition-[box-shadow,transform] disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Bandeja que sobe de baixo — usada para palavras personalizadas e recordes. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 bg-black/60 flex items-end justify-center z-30"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="animate-sheet w-full max-w-[420px] bg-bg2 border border-gold/25 rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-3 max-h-[85dvh] overflow-y-auto"
      >
        <h3 className="font-display text-gold text-lg">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function MarqueeBulbs({ count = 7 }: { count?: number }) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="bulb w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_6px_1px_rgba(242,193,78,.8)]"
          style={{ animationDelay: `${(i % 3) * 0.4}s` }}
        />
      ))}
    </div>
  );
}
