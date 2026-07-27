import objetos from "./words/objetos.json";
import animais from "./words/animais.json";
import acoes from "./words/acoes.json";
import comida from "./words/comida.json";
import profissoes from "./words/profissoes.json";
import lugares from "./words/lugares.json";
import filmes from "./words/filmes.json";
import personagens from "./words/personagens.json";
import conceitos from "./words/conceitos.json";

export type Level = "facil" | "medio" | "dificil";
export type Mode = "total" | "perword";

export interface Category {
  id: string;
  name: string;
  icon: string;
  facil: string[];
  medio: string[];
  dificil: string[];
}

export const CATEGORIES: Category[] = [
  objetos,
  animais,
  acoes,
  comida,
  profissoes,
  lugares,
  filmes,
  personagens,
  conceitos,
];

export const LEVEL_LABELS: Record<Level, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const MODE_LABELS: Record<Mode, string> = {
  total: "Corrida · tempo total",
  perword: "Relâmpago · tempo por palavra",
};

/** Retorna o pool de palavras {word, categoryId} para nível + categorias selecionadas. */
export function buildPool(level: Level, categoryIds: Set<string>, customWords: string[] = []) {
  const pool: { w: string; c: string }[] = [];
  for (const cat of CATEGORIES) {
    if (!categoryIds.has(cat.id)) continue;
    for (const w of cat[level]) pool.push({ w, c: cat.id });
  }
  if (categoryIds.has("custom")) {
    for (const w of customWords) pool.push({ w, c: "custom" });
  }
  return pool;
}

export function categoryMeta(id: string): { name: string; icon: string } {
  if (id === "custom") return { name: "Personalizadas", icon: "📝" };
  const cat = CATEGORIES.find((c) => c.id === id);
  return cat ? { name: cat.name, icon: cat.icon } : { name: id, icon: "🎭" };
}
