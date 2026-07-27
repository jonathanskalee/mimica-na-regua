import { useCallback, useEffect, useState } from "react";
import { TiltPermission, useGame } from "../store/gameStore";

type PermissionCapableEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function orientationApi(): PermissionCapableEvent | null {
  if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return null;
  return DeviceOrientationEvent as PermissionCapableEvent;
}

/**
 * Pede permissão de movimento.
 *
 * No iOS 13+ isso só funciona dentro de um gesto do usuário, por isso mora num
 * hook chamado pelo `onClick` do switch — nunca num efeito.
 */
export function useTiltPermission() {
  const setTiltPermission = useGame((s) => s.setTiltPermission);

  return useCallback(async (): Promise<TiltPermission> => {
    const api = orientationApi();
    if (!api) {
      setTiltPermission("unsupported");
      return "unsupported";
    }
    if (typeof api.requestPermission !== "function") {
      // Android e desktop não pedem permissão.
      setTiltPermission("granted");
      return "granted";
    }
    try {
      const result = await api.requestPermission();
      const permission: TiltPermission = result === "granted" ? "granted" : "denied";
      setTiltPermission(permission);
      return permission;
    } catch {
      setTiltPermission("denied");
      return "denied";
    }
  }, [setTiltPermission]);
}

/** Liga o sensor durante a rodada e entrega o ângulo para o store decidir. */
export function useDeviceTilt(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !orientationApi()) return;
    const handler = (e: DeviceOrientationEvent) => {
      if (e.beta == null) return;
      useGame.getState().onTilt(e.beta);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [enabled]);
}

/**
 * Ângulo ao vivo, só para a tela de calibração.
 * Fica em estado local de propósito: o sensor dispara ~60×/s e isso no store
 * re-renderizaria o app inteiro a cada evento.
 */
export function useLiveBeta(active: boolean): number | null {
  const [beta, setBeta] = useState<number | null>(null);

  useEffect(() => {
    if (!active || !orientationApi()) return;
    const handler = (e: DeviceOrientationEvent) => {
      if (e.beta != null) setBeta(Math.round(e.beta));
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [active]);

  return beta;
}
