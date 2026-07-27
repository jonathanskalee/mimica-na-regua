import { describe, expect, it } from "vitest";
import { clampTiltBase, TILT_BASE_DEFAULT, tiltDecision } from "./tilt";

const B = TILT_BASE_DEFAULT; // 90

describe("tiltDecision — paridade com o legacy (base 90)", () => {
  it("reconhece a vertical como neutro e rearma o gesto", () => {
    expect(tiltDecision(90, B, false)).toBe("neutral");
    expect(tiltDecision(60, B, false)).toBe("neutral");
    expect(tiltDecision(120, B, false)).toBe("neutral");
  });

  it("inclinar pra baixo é acerto", () => {
    expect(tiltDecision(140, B, true)).toBe("hit");
    expect(tiltDecision(170, B, true)).toBe("hit");
  });

  it("inclinar pra cima é pulo", () => {
    expect(tiltDecision(35, B, true)).toBe("pass");
    expect(tiltDecision(-80, B, true)).toBe("pass");
  });

  it("ignora ângulos fora do alcance do gesto", () => {
    expect(tiltDecision(-120, B, true)).toBe("none"); // abaixo do piso
    expect(tiltDecision(130, B, true)).toBe("none"); // zona morta
    expect(tiltDecision(45, B, true)).toBe("none"); // zona morta
  });

  it("não dispara duas vezes sem voltar ao neutro", () => {
    expect(tiltDecision(150, B, false)).toBe("none");
    expect(tiltDecision(150, B, true)).toBe("hit");
  });

  it("descarta leituras inválidas", () => {
    expect(tiltDecision(NaN, B, true)).toBe("none");
  });
});

describe("tiltDecision — calibrado", () => {
  it("desloca os limiares junto com a base", () => {
    const base = 70;
    expect(tiltDecision(70, base, false)).toBe("neutral");
    expect(tiltDecision(120, base, true)).toBe("hit"); // base + 50
    expect(tiltDecision(15, base, true)).toBe("pass"); // base - 55
    expect(tiltDecision(119, base, true)).toBe("none"); // ainda não chegou
  });

  it("mantém as fronteiras exatas", () => {
    expect(tiltDecision(B + 50, B, true)).toBe("hit");
    expect(tiltDecision(B + 49, B, true)).toBe("none");
    expect(tiltDecision(B - 55, B, true)).toBe("pass");
    expect(tiltDecision(B - 35, B, true)).toBe("none");
    expect(tiltDecision(B - 34, B, true)).toBe("neutral");
  });
});

describe("clampTiltBase", () => {
  it("mantém calibrações plausíveis", () => {
    expect(clampTiltBase(70)).toBe(70);
    expect(clampTiltBase(110)).toBe(110);
  });

  it("segura calibrações que deixariam os limiares fora do alcance", () => {
    expect(clampTiltBase(200)).toBe(140);
    expect(clampTiltBase(-30)).toBe(40);
    expect(clampTiltBase(NaN)).toBe(TILT_BASE_DEFAULT);
  });
});
