# Dicas de Atuação e Mais Palavras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toda palavra do banco de dados ganha uma dica curta de atuação (visível só pra quem está mimicando, com toggle nas configurações), e o banco de palavras cresce com 2 categorias novas (Esportes, Desenhos e Animações) e mais palavras nas 9 categorias existentes.

**Architecture:** Cada palavra passa de `string` para `{ w: string; h: string }` (`WordEntry`) nos JSON de `src/data/words/*.json`. `buildPool()` carrega a dica junto da palavra; `WordCard` no store ganha `h?: string` (ausente para palavras personalizadas). Uma preferência `hintsEnabled` (default `true`) controla se a dica aparece na tela de jogo, seguindo o padrão de persistência já usado por `bonusEnabled`/`soundOn`.

**Tech Stack:** TypeScript strict, Zustand, Vitest, JSON como dado estático (`resolveJsonModule`).

## Global Constraints

- Textos de interface e dicas em **português (pt-BR)**, tom leve e informal.
- TypeScript strict; sem `any` novos.
- Toda configuração nova precisa persistir: campo em `PersistedSettings` (`src/store/settings.ts`) com validador, incluído em `pickSettings`, e `persist(get)` no fim do setter (`src/store/gameStore.ts`).
- Lógica de jogo vive no store, nunca nos componentes — componentes só leem estado e chamam actions.
- Palavras são dados: vivem em `src/data/words/*.json`; categoria nova = novo arquivo JSON + import em `src/data/index.ts`.
- Rodar `npm test` e `npm run build` (type-check) ao final de cada task antes de marcar como concluída.

---

### Task 1: Migrar o schema de palavras para `{w, h}` e reescrever as 9 categorias existentes

Esta é a única task que muda `Category`/`WordCard`/`buildPool`. Como `CATEGORIES: Category[]` é checado contra **todos** os arquivos JSON de uma vez, o type-check só passa quando os 9 arquivos já estiverem no novo formato — por isso a mudança de tipo e a reescrita dos 9 arquivos acontecem juntas, numa única task atômica. Aproveitamos a reescrita de cada arquivo para já incluir as palavras novas (evita reescrever o mesmo arquivo duas vezes).

**Files:**
- Modify: `src/data/index.ts` (tipo `Category`, novo tipo `WordEntry`, `buildPool`)
- Modify: `src/store/gameStore.ts:52-55` (`WordCard`)
- Modify: `src/store/gameStore.test.ts` (teste de `buildPool`)
- Modify: `src/data/words/animais.json`
- Modify: `src/data/words/acoes.json`
- Modify: `src/data/words/comida.json`
- Modify: `src/data/words/conceitos.json`
- Modify: `src/data/words/filmes.json`
- Modify: `src/data/words/lugares.json`
- Modify: `src/data/words/objetos.json`
- Modify: `src/data/words/personagens.json`
- Modify: `src/data/words/profissoes.json`
- Test: `src/data/index.test.ts` (novo arquivo)

**Interfaces:**
- Produces: `WordEntry { w: string; h: string }`, `Category.facil/medio/dificil: WordEntry[]`, `buildPool(level, categoryIds, customWords?): { w: string; c: string; h?: string }[]`, `WordCard { w: string; c: string; h?: string }`.
- Consumes: nada de tasks anteriores (é a primeira task).

- [ ] **Step 1: Escrever o teste de schema dos dados**

Criar `src/data/index.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "./index";

describe("banco de palavras", () => {
  it("toda palavra de toda categoria tem texto e dica não vazios", () => {
    for (const cat of CATEGORIES) {
      for (const level of ["facil", "medio", "dificil"] as const) {
        for (const entry of cat[level]) {
          expect(entry.w.trim().length, `${cat.id}/${level}: palavra vazia`).toBeGreaterThan(0);
          expect(entry.h.trim().length, `${cat.id}/${level}: "${entry.w}" sem dica`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("nenhuma categoria fica com nível vazio", () => {
    for (const cat of CATEGORIES) {
      for (const level of ["facil", "medio", "dificil"] as const) {
        expect(cat[level].length, `${cat.id}/${level} vazio`).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Rodar o teste e ver que falha (o módulo ainda não expõe o formato certo)**

Run: `npm test -- --run index.test.ts`
Expected: FAIL — `CATEGORIES` ainda tem `facil: string[]`, então `entry.w`/`entry.h` são `undefined`, e o `expect(...).toBeGreaterThan(0)` quebra com `Cannot read properties of undefined`.

- [ ] **Step 3: Atualizar o tipo `Category` e `buildPool` em `src/data/index.ts`**

Substituir o conteúdo de `src/data/index.ts` por:

```ts
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

export interface WordEntry {
  w: string;
  h: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  facil: WordEntry[];
  medio: WordEntry[];
  dificil: WordEntry[];
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

/** Retorna o pool de palavras {w, c, h} para nível + categorias selecionadas. */
export function buildPool(level: Level, categoryIds: Set<string>, customWords: string[] = []) {
  const pool: { w: string; c: string; h?: string }[] = [];
  for (const cat of CATEGORIES) {
    if (!categoryIds.has(cat.id)) continue;
    for (const entry of cat[level]) pool.push({ w: entry.w, c: cat.id, h: entry.h });
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
```

- [ ] **Step 4: Reescrever `src/data/words/animais.json`**

```json
{
  "id": "animais",
  "name": "Animais",
  "icon": "🐾",
  "facil": [
    { "w": "Leão", "h": "Rugido silencioso e jeito de andar de gato grandão, cabeça erguida" },
    { "w": "Macaco", "h": "Coce as axilas e pule imitando o jeito de andar bamboleante" },
    { "w": "Elefante", "h": "Faça uma tromba com o braço esticado e balance devagar" },
    { "w": "Gato", "h": "Lamba a mão como pata e arqueie as costas, miando sem som" },
    { "w": "Cachorro", "h": "Ande de quatro, abane um rabo imaginário e late sem som" },
    { "w": "Galinha", "h": "Bata os braços como asas e cacareje balançando a cabeça" },
    { "w": "Sapo", "h": "Agache e dê pulinhos curtos, língua saindo pra pegar mosca" },
    { "w": "Pinguim", "h": "Braços colados ao corpo, passinhos curtos, balançando de lado a lado" },
    { "w": "Pato", "h": "Ande rebolando com as pernas dobradas, faça bico com a boca" },
    { "w": "Peixe", "h": "Junte as mãos e faça um movimento ondulado de nadar, boca abrindo e fechando" },
    { "w": "Cavalo", "h": "Bata os pés no chão como cascos e balance a cabeça como crina" },
    { "w": "Vaca", "h": "Faça chifres com os dedos na cabeça e mastigue bem devagar" },
    { "w": "Porco", "h": "Empurre o nariz pra cima com o dedo e role no chão" },
    { "w": "Coelho", "h": "Mãos na cabeça como orelhas compridas e pule bem agachado" },
    { "w": "Borboleta", "h": "Braços como asas, mova devagar e leve, voando em curvas" },
    { "w": "Abelha", "h": "Zumbido com a boca fechada e voe fazendo ziguezague" },
    { "w": "Cobra", "h": "Deite e rasteje se contorcendo, língua saindo e entrando" },
    { "w": "Tartaruga", "h": "Ande bem devagar, encolha a cabeça pros ombros como casco" },
    { "w": "Urso", "h": "Braços erguidos como garras e ande pesado, rosnando sem som" },
    { "w": "Rato", "h": "Mãos como patinhas no peito, mova o nariz rapidinho, andar sorrateiro" },
    { "w": "Pássaro", "h": "Braços como asas batendo e pescoço bicando o chão" },
    { "w": "Formiga", "h": "Ande agachado carregando algo pesado acima da cabeça, em fila" },
    { "w": "Cisne", "h": "Estique o pescoço curvado e ande elegante com passos leves" },
    { "w": "Zebra", "h": "Cruze os braços em listras imaginárias e galope devagar" },
    { "w": "Ovelha", "h": "Encolha os ombros balindo baixinho e mastigue bem devagar" },
    { "w": "Tucano", "h": "Faça um bico enorme com as duas mãos na frente do rosto" },
    { "w": "Esquilo", "h": "Segure algo pequeno perto da boca e mova a cauda atrás rapidinho" }
  ],
  "medio": [
    { "w": "Coruja", "h": "Gire a cabeça bem devagar e pisque os olhos bem abertos" },
    { "w": "Gavião", "h": "Braços como asas grandes, olhar fixo caçando algo no chão" },
    { "w": "Escorpião", "h": "Curve o braço acima da cabeça como ferrão e ande de lado" },
    { "w": "Girafa", "h": "Estique bem o pescoço e ande devagar olhando de cima" },
    { "w": "Aranha", "h": "Dedos como pernas mexendo rápido e mova-se agachado pro lado" },
    { "w": "Canguru", "h": "Mãos como patinhas no peito e dê pulos grandes com as pernas" },
    { "w": "Camaleão", "h": "Mova os olhos pra direções opostas e ande bem devagarzinho" },
    { "w": "Polvo", "h": "Balance os braços soltos como tentáculos ondulando ao mesmo tempo" },
    { "w": "Tubarão", "h": "Mão na testa como barbatana e nade em círculos ameaçadores" },
    { "w": "Golfinho", "h": "Junte as mãos e faça arcos pra cima saltando da água" },
    { "w": "Morcego", "h": "Agache de cabeça pra baixo (imagine) e bata os braços voando" },
    { "w": "Tamanduá", "h": "Faça um focinho comprido com o braço e lamba formigas do chão" },
    { "w": "Bicho-preguiça", "h": "Mova-se o mais devagar possível, quase parado, pendurado num galho" },
    { "w": "Pavão", "h": "Abra os braços atrás como leque de penas e rebole andando" },
    { "w": "Caranguejo", "h": "Ande de lado com as mãos fazendo pinça na frente" },
    { "w": "Jacaré", "h": "Braços juntos na frente como boca grande, rastejando no chão" },
    { "w": "Lobo", "h": "Uive pro alto e ande em quatro apoios, rosnando baixinho" },
    { "w": "Águia", "h": "Braços bem abertos planando e mergulhe pra pegar uma presa" },
    { "w": "Flamingo", "h": "Fique numa perna só, pescoço curvado, bicando a água" },
    { "w": "Hipopótamo", "h": "Ande pesado e devagar, boca bem aberta como bocejo enorme" },
    { "w": "Rinoceronte", "h": "Aponte um chifre com o dedo na testa e corra pesado" },
    { "w": "Foca", "h": "Deite de bruços, bata palmas com o corpo e late curto" },
    { "w": "Coala", "h": "Abrace uma árvore imaginária e durma agarrado nela" },
    { "w": "Iguana", "h": "Fique imóvel tomando sol e mova a cabeça bem devagar" }
  ],
  "dificil": [
    { "w": "Ornitorrinco", "h": "Faça um bico achatado com as mãos e nade rente ao chão" },
    { "w": "Água-viva", "h": "Braços moles balançando pra cima e pra baixo, flutuando devagar" },
    { "w": "Beija-flor", "h": "Vibre as mãos rapidíssimo perto do peito e fique parado no ar" },
    { "w": "Louva-a-deus", "h": "Junte as mãos na frente do peito como se rezasse, cabeça virando devagar" },
    { "w": "Vaga-lume", "h": "Pisque uma luz imaginária na barriga enquanto voa baixinho" },
    { "w": "Cupim", "h": "Ande em fila mordiscando madeira, corpo mole se arrastando" },
    { "w": "Sanguessuga", "h": "Grude no braço com a boca e se contraia esticando o corpo" },
    { "w": "Lesma", "h": "Arraste-se devagar deitado, deixando um rastro atrás de você" },
    { "w": "Axolote", "h": "Sorria bobo, mova-se flutuando com bochechas cheias tipo guelras" },
    { "w": "Tatu-bola", "h": "Enrole-se numa bolinha bem apertada, braços e pernas pro dentro" },
    { "w": "Camarão", "h": "Curve o corpo pra frente e ande pulando de costas na água" },
    { "w": "Enguia elétrica", "h": "Balance o corpo todo trêmulo, como se desse choque nos outros" },
    { "w": "Equidna", "h": "Enrole-se numa bola espinhenta protegendo a barriga" },
    { "w": "Narval", "h": "Aponte um chifre comprido na testa e nade em ondas" },
    { "w": "Quati", "h": "Ande com o rabo listrado empinado, cheirando o chão curioso" }
  ]
}
```

- [ ] **Step 5: Reescrever `src/data/words/acoes.json`**

```json
{
  "id": "acoes",
  "name": "Ações",
  "icon": "🏃",
  "facil": [
    { "w": "Dançar", "h": "Balance o corpo no ritmo, sem som, como se tivesse fone de ouvido" },
    { "w": "Pular", "h": "Flexione os joelhos e salte no lugar repetidamente" },
    { "w": "Aplaudir", "h": "Bata palmas animado, olhando pra um palco imaginário" },
    { "w": "Chorar", "h": "Esfregue os olhos e balance os ombros soluçando sem som" },
    { "w": "Correr", "h": "Balance os braços e pernas rápido no lugar, sem sair do lugar" },
    { "w": "Nadar", "h": "Faça braçadas largas pra frente, cabeça virando pra respirar" },
    { "w": "Cantar", "h": "Segure um microfone imaginário e mexa a boca com emoção" },
    { "w": "Escovar o cabelo", "h": "Puxe uma escova imaginária da raiz até a ponta do cabelo" },
    { "w": "Espirrar", "h": "Feche os olhos, jogue a cabeça pra trás e solte um espirro mudo" },
    { "w": "Tossir", "h": "Cubra a boca com o punho e sacuda o corpo tossindo" },
    { "w": "Beijar", "h": "Faça bico com a boca e incline a cabeça pra frente" },
    { "w": "Abraçar", "h": "Envolva os braços em alguém imaginário e aperte com carinho" },
    { "w": "Beliscar", "h": "Junte dois dedos e aperte a própria bochecha ou braço" },
    { "w": "Tomar banho", "h": "Esfregue o corpo todo com as mãos como se ensaboasse" },
    { "w": "Dormir", "h": "Junte as mãos e apoie a cabeça inclinada, olhos fechados" },
    { "w": "Cozinhar", "h": "Mexa uma panela imaginária com uma colher, provando de vez em quando" },
    { "w": "Dirigir", "h": "Segure um volante imaginário e vire o corpo nas curvas" },
    { "w": "Varrer", "h": "Segure uma vassoura imaginária e empurre o chão de um lado a outro" },
    { "w": "Pescar", "h": "Jogue uma linha imaginária pra frente e puxe como se fisgasse algo" },
    { "w": "Tirar foto", "h": "Levante as mãos como se segurasse uma câmera e aperte o botão" },
    { "w": "Escrever", "h": "Segure uma caneta imaginária e mova a mão numa folha" },
    { "w": "Ler", "h": "Segure um livro aberto imaginário e mova os olhos linha por linha" },
    { "w": "Bater continência", "h": "Leve a mão reta até a testa com postura firme" },
    { "w": "Passar roupa", "h": "Deslize um ferro imaginário pra frente e pra trás sobre um pano" },
    { "w": "Trocar uma lâmpada", "h": "Suba num banquinho e gire algo redondo acima da cabeça" },
    { "w": "Fazer flexão", "h": "Apoie as mãos no chão e dobre os braços repetidamente" },
    { "w": "Jogar boliche", "h": "Balance o braço pra trás e solte uma bola pesada rolando" }
  ],
  "medio": [
    { "w": "Roncar", "h": "Deite, feche os olhos e faça o peito subir e descer bem forte" },
    { "w": "Medir", "h": "Estique uma fita métrica imaginária e aponte o número" },
    { "w": "Acampar", "h": "Monte uma barraca imaginária e sente perto de uma fogueira" },
    { "w": "Emagrecer", "h": "Mostre uma calça folgada na cintura e aperte o cinto mais" },
    { "w": "Babar", "h": "Deixe a boca entreaberta e limpe a baba escorrendo do queixo" },
    { "w": "Fofocar", "h": "Cubra a boca com a mão e cochiche no ouvido de alguém" },
    { "w": "Meditar", "h": "Sente de pernas cruzadas, mãos nos joelhos, respire bem devagar" },
    { "w": "Fazer selfie", "h": "Estique o braço com o celular e sorria de vários ângulos" },
    { "w": "Estacionar", "h": "Segure o volante imaginário e vire pra trás olhando o retrovisor" },
    { "w": "Pechinchar", "h": "Balance a mão negando o preço e mostre menos dedos" },
    { "w": "Bocejar", "h": "Abra bem a boca, estique os braços e feche os olhos devagar" },
    { "w": "Soluçar", "h": "Dê pequenos pulos no peito e leve a mão à boca surpreso" },
    { "w": "Tropeçar", "h": "Finja pisar em algo e cambaleie pra frente quase caindo" },
    { "w": "Assobiar", "h": "Faça bico com os lábios e sopre balançando a cabeça no ritmo" },
    { "w": "Engasgar", "h": "Aperte o próprio pescoço e tussa desesperado pedindo ajuda" },
    { "w": "Maquiar", "h": "Passe um pincel imaginário no rosto e pisque pra colocar rímel" },
    { "w": "Tricotar", "h": "Mexa as mãos como se cruzasse duas agulhas com linha" },
    { "w": "Surfar", "h": "Fique de pé com os joelhos dobrados, braços abertos equilibrando" },
    { "w": "Escalar", "h": "Estique os braços pra cima buscando apoios numa parede imaginária" },
    { "w": "Fazer malabarismo", "h": "Jogue bolinhas imaginárias pro alto revezando as duas mãos" },
    { "w": "Regar plantas", "h": "Incline um regador imaginário sobre plantas baixinhas" },
    { "w": "Tocar violão", "h": "Dedilhe cordas imaginárias com uma mão e segure o braço com a outra" },
    { "w": "Fazer ioga", "h": "Fique numa posição equilibrada numa perna só, braços esticados" },
    { "w": "Amarrar o cadarço", "h": "Abaixe, cruze os dedos como cadarços e dê um laço" },
    { "w": "Fazer origami", "h": "Dobre um papel imaginário várias vezes com cuidado" }
  ],
  "dificil": [
    { "w": "Procrastinar", "h": "Comece uma tarefa imaginária e largue pra mexer no celular, adiando" },
    { "w": "Hipnotizar", "h": "Balance um relógio imaginário na frente dos olhos de alguém" },
    { "w": "Filosofar", "h": "Segure o queixo pensativo, olhe pro alto e gesticule falando sério" },
    { "w": "Improvisar", "h": "Encolha os ombros e finja inventar algo na hora, sem plano" },
    { "w": "Traduzir", "h": "Aponte pra uma pessoa, fale, aponte pra outra e repita diferente" },
    { "w": "Negociar", "h": "Aperte as mãos com alguém e finja discutir números com os dedos" },
    { "w": "Subornar", "h": "Esfregue os dedos como dinheiro e entregue um envelope escondido" },
    { "w": "Plagiar", "h": "Copie o que alguém faz ao lado e finja que é seu" },
    { "w": "Hesitar", "h": "Dê um passo pra frente e volte, balançando a cabeça em dúvida" },
    { "w": "Sonambulismo", "h": "Ande de olhos fechados, braços esticados pra frente, bem devagar" },
    { "w": "Ventriloquia", "h": "Fale sem mexer os lábios enquanto mexe a boca de um boneco imaginário" },
    { "w": "Fazer lobby", "h": "Cochiche no ouvido de alguém importante enquanto aponta pra um papel" },
    { "w": "Fazer contorcionismo", "h": "Dobre o corpo numa posição bem torta e impossível" },
    { "w": "Discursar em público", "h": "Gesticule bastante falando pra uma plateia imaginária, sem som" },
    { "w": "Arbitrar uma luta", "h": "Separe dois lutadores imaginários erguendo o braço de um deles" }
  ]
}
```

- [ ] **Step 6: Reescrever `src/data/words/comida.json`**

```json
{
  "id": "comida",
  "name": "Comida",
  "icon": "🍕",
  "facil": [
    { "w": "Banana", "h": "Descasque uma banana imaginária puxando as tiras pra baixo e morda" },
    { "w": "Pizza", "h": "Puxe uma fatia triangular esticando o queijo com a mão" },
    { "w": "Sorvete", "h": "Lamba uma casquinha imaginária de cima pra baixo, com pressa antes de derreter" },
    { "w": "Maçã", "h": "Morda uma fruta redonda imaginária com um crec bem grande" },
    { "w": "Chocolate", "h": "Quebre um pedaço imaginário da barra e derreta na boca com prazer" },
    { "w": "Café", "h": "Segure uma xícara pelo pires, sopre e tome pequenos goles" },
    { "w": "Chá", "h": "Mergulhe um saquinho num copo imaginário e sopre antes de beber" },
    { "w": "Torta", "h": "Corte um triângulo com garfo e faca imaginários e coma" },
    { "w": "Sanduíche", "h": "Empilhe camadas com as mãos e morda com a boca bem aberta" },
    { "w": "Melancia", "h": "Cuspa sementes imaginárias enquanto morde uma fatia grande e suculenta" },
    { "w": "Pipoca", "h": "Jogue pipocas imaginárias uma a uma na boca, de longe" },
    { "w": "Churrasco", "h": "Vire um espeto imaginário sobre o fogo e prove com os dedos" },
    { "w": "Ovo frito", "h": "Quebre um ovo imaginário numa frigideira e vire com a espátula" },
    { "w": "Espaguete", "h": "Enrole o macarrão imaginário no garfo e sorva fazendo barulho" },
    { "w": "Milho", "h": "Segure uma espiga com as duas mãos e morda de um lado a outro" },
    { "w": "Coco", "h": "Bata com um facão imaginário até abrir e beba pela casca" },
    { "w": "Abacaxi", "h": "Torça a coroa de folhas pra tirar e morda com cuidado" },
    { "w": "Picolé", "h": "Segure pelo palito e lamba de baixo pra cima, com gelo pingando" },
    { "w": "Bolo", "h": "Sopre velinhas imaginárias e corte uma fatia grande com uma pá" },
    { "w": "Suco", "h": "Esprema uma fruta imaginária com as mãos e beba num copo" },
    { "w": "Hambúrguer", "h": "Empilhe camadas grossas e aperte com as duas mãos antes de morder" },
    { "w": "Pão francês", "h": "Aperte as pontas de um pão crocante e morda com barulho" },
    { "w": "Iogurte", "h": "Coma com uma colherzinha de um potinho pequeno, fazendo careta azeda" },
    { "w": "Torrada", "h": "Espalhe manteiga imaginária numa fatia crocante e morda" },
    { "w": "Salada", "h": "Misture folhas imaginárias numa tigela grande com um garfo e faca" },
    { "w": "Refrigerante", "h": "Abra uma lata imaginária, ouça o gás e beba com pressa" }
  ],
  "medio": [
    { "w": "Panquecas", "h": "Vire uma panqueca no ar jogando a frigideira pra cima" },
    { "w": "Feijoada", "h": "Mexa uma panela grande e fumegante com uma colher de pau" },
    { "w": "Brigadeiro", "h": "Enrole uma bolinha entre as mãos e passe no granulado" },
    { "w": "Coxinha", "h": "Modele o formato de gota com as mãos e morda pontuda" },
    { "w": "Açaí", "h": "Coma com uma colher pequena de um potinho gelado, bem devagar" },
    { "w": "Sushi", "h": "Pegue um pedacinho com hashi (dois dedos) e mergulhe no molho" },
    { "w": "Fondue", "h": "Espete algo num garfo comprido e mergulhe num pote quente" },
    { "w": "Tapioca", "h": "Espalhe massa numa frigideira circular com movimentos suaves" },
    { "w": "Pastel", "h": "Puxe uma massa fina crocante e limpe o óleo escorrendo" },
    { "w": "Caldo de cana", "h": "Gire uma manivela imaginária espremendo cana e beba gelado" },
    { "w": "Pamonha", "h": "Desenrole a palha de milho antes de morder por dentro" },
    { "w": "Quentão", "h": "Sopre uma caneca fumegante segurando com as duas mãos, tremendo de frio" },
    { "w": "Cachorro-quente", "h": "Aperte molhos em zigue-zague sobre um pão comprido" },
    { "w": "Estrogonofe", "h": "Mexa devagar numa panela cremosa e prove com a colher" },
    { "w": "Pão de queijo", "h": "Amasse uma bolinha e puxe fios de queijo ao morder" },
    { "w": "Moqueca", "h": "Mexa uma panela de barro cheirosa e prove com a colher" },
    { "w": "Vatapá", "h": "Mexa uma massa grossa e amarela numa panela, cheirando forte" },
    { "w": "Waffle", "h": "Feche uma forma quadriculada imaginária e espere assar" },
    { "w": "Bolo de pote", "h": "Coma com uma colher comprida dentro de um potinho, camada por camada" }
  ],
  "dificil": [
    { "w": "Rodízio de pizza", "h": "Acene chamando o garçom repetidamente, pegando fatia após fatia sem parar" },
    { "w": "Comida apimentada", "h": "Morda algo e abane a boca aberta, os olhos lacrimejando" },
    { "w": "Vegetariano", "h": "Empurre um prato de carne pra longe e pegue só verduras" },
    { "w": "Degustação de vinho", "h": "Gire a taça, cheire fundo e prove um golinho, pensativo" },
    { "w": "Comida estragada", "h": "Cheire algo, faça careta de nojo e afaste com a mão" },
    { "w": "Dieta detox", "h": "Bata um copo verde num liquidificador imaginário e beba de cara feia" },
    { "w": "Glúten", "h": "Aponte pra um pão, balance a cabeça negando e empurre pra longe" },
    { "w": "Fermentação", "h": "Faça uma massa crescer com as mãos, abrindo os braços aos poucos" },
    { "w": "Trufa", "h": "Enrole uma bolinha pequena e escura entre os dedos, delicada" },
    { "w": "Molho tártaro", "h": "Misture algo picadinho num pote pequeno com uma colher" },
    { "w": "Risoto", "h": "Mexa devagar e sem parar uma panela cremosa, provando aos poucos" }
  ]
}
```

- [ ] **Step 7: Reescrever `src/data/words/conceitos.json`**

```json
{
  "id": "conceitos",
  "name": "Conceitos",
  "icon": "💭",
  "facil": [
    { "w": "Amor", "h": "Desenhe um coração com as mãos no peito" },
    { "w": "Sono", "h": "Esfregue os olhos e boceje encostando a cabeça nas mãos" },
    { "w": "Tristeza", "h": "Deixe os ombros caídos e limpe uma lágrima no rosto" },
    { "w": "Sorte", "h": "Cruze os dedos e olhe pro alto pedindo, sorrindo animado" },
    { "w": "Música", "h": "Balance a cabeça no ritmo e finja tocar um instrumento" },
    { "w": "Sol", "h": "Faça um círculo grande sobre a cabeça com os braços e abane o calor" },
    { "w": "Chuva", "h": "Mova os dedos caindo de cima e abra um guarda-chuva imaginário" },
    { "w": "Estrela", "h": "Aponte pro céu piscando os olhos, desenhando pontas com os dedos" },
    { "w": "Natal", "h": "Faça uma barba grande com a mão e distribua presentes imaginários" },
    { "w": "Aniversário", "h": "Sopre velinhas imaginárias num bolo e bata palmas cantando sem som" },
    { "w": "Frio", "h": "Cruze os braços tremendo e esfregue as mãos" },
    { "w": "Calor", "h": "Abane o rosto com a mão e puxe a camisa afastando do corpo" },
    { "w": "Medo", "h": "Encolha o corpo, tampe os olhos e trema" },
    { "w": "Fome", "h": "Esfregue a barriga vazia e olhe faminto pra algo de comer" },
    { "w": "Sede", "h": "Segure a garganta seca e finja beber água com pressa" },
    { "w": "Cansaço", "h": "Arraste os pés e deixe o corpo mole, suspirando fundo" },
    { "w": "Alegria", "h": "Pule animado com um grande sorriso e bata palmas" },
    { "w": "Raiva", "h": "Feche os punhos com força e franzir a testa, respirando forte" }
  ],
  "medio": [
    { "w": "Saudade", "h": "Olhe pra uma foto imaginária e leve a mão ao peito suspirando" },
    { "w": "Ciúme", "h": "Cruze os braços emburrado olhando de lado, batendo o pé" },
    { "w": "Preguiça", "h": "Deite mole numa cadeira imaginária e boceje sem ânimo de levantar" },
    { "w": "Vergonha", "h": "Cubra o rosto com as mãos e olhe de canto, encolhido" },
    { "w": "Alergia", "h": "Espirre repetidamente e coce o nariz e os olhos com força" },
    { "w": "Pesadelo", "h": "Debata-se dormindo e acorde de susto sentando de repente" },
    { "w": "Magia", "h": "Agite uma varinha imaginária e faça algo sumir com um gesto" },
    { "w": "Fofoca", "h": "Cochiche no ouvido de alguém tampando a boca, olhando pros lados" },
    { "w": "Salário", "h": "Conte notas imaginárias e mostre decepção olhando o valor" },
    { "w": "Ressaca", "h": "Aperte a cabeça com as duas mãos e ande cambaleando devagar" },
    { "w": "Sombra", "h": "Aponte pro chão ao seu lado e copie seus próprios movimentos atrás" },
    { "w": "Arco-íris", "h": "Desenhe um arco grande e colorido no céu com o braço" },
    { "w": "Terremoto", "h": "Balance todo o corpo e os braços como se o chão tremesse" },
    { "w": "Enjoo", "h": "Segure a barriga, tampe a boca e cambaleie enjoado" },
    { "w": "Casamento", "h": "Ande devagar como se estivesse no altar segurando um buquê" },
    { "w": "Formatura", "h": "Jogue um capelo imaginário pro alto comemorando" },
    { "w": "Mudança", "h": "Carregue caixas pesadas empilhadas e finja tropeçar com o peso" },
    { "w": "Engarrafamento", "h": "Bata a mão na buzina repetidamente, impaciente, olhando pros lados" },
    { "w": "Wi-fi caindo", "h": "Levante o celular procurando sinal, cara de frustração" },
    { "w": "Bateria descarregada", "h": "Mostre o celular apagando e desespere-se procurando uma tomada" },
    { "w": "Videochamada", "h": "Acene pra uma tela imaginária e aponte a câmera, sem som" },
    { "w": "Entrevista de emprego", "h": "Aperte a mão de alguém nervoso, ajeitando a gravata" },
    { "w": "Inveja", "h": "Olhe de lado pra algo de outra pessoa fazendo careta amarga" },
    { "w": "Timidez", "h": "Encolha os ombros e esconda o rosto atrás das mãos" },
    { "w": "Curiosidade", "h": "Incline a cabeça e espie por trás de algo com os olhos arregalados" },
    { "w": "Confiança", "h": "Levante o queixo, mãos na cintura, peito estufado" }
  ],
  "dificil": [
    { "w": "Democracia", "h": "Levante a mão votando e conte os votos com os dedos" },
    { "w": "Inflação", "h": "Mostre um preço subindo com a mão e uma cara de choque" },
    { "w": "Nostalgia", "h": "Olhe pra uma foto antiga imaginária sorrindo com os olhos marejados" },
    { "w": "Karma", "h": "Jogue algo pra frente e finja que volta e te acerta" },
    { "w": "Reencarnação", "h": "Caia devagar no chão e levante como se fosse outro bicho" },
    { "w": "Telepatia", "h": "Aponte pra própria cabeça e depois pra de outra pessoa, sem falar" },
    { "w": "Hipnose", "h": "Balance um pêndulo imaginário na frente dos olhos de alguém, que fica mole" },
    { "w": "Sarcasmo", "h": "Bata palmas devagar e revire os olhos, tom de deboche no rosto" },
    { "w": "Metáfora", "h": "Aponte pro coração dizendo que é como algo, comparando com as mãos" },
    { "w": "Paradoxo", "h": "Aponte pra direita e pra esquerda ao mesmo tempo, confuso" },
    { "w": "Justiça", "h": "Segure uma balança imaginária equilibrando os dois lados" },
    { "w": "Liberdade", "h": "Abra os braços bem largos e respire fundo olhando pro céu" },
    { "w": "Crise existencial", "h": "Segure a cabeça com as duas mãos olhando pro nada, confuso" },
    { "w": "Efeito dominó", "h": "Empurre uma peça imaginária e acompanhe a queda em cadeia com o dedo" },
    { "w": "Fuso horário", "h": "Aponte pro relógio de pulso e mostre horas diferentes em cada braço" },
    { "w": "Gravidade", "h": "Solte algo da mão e aponte caindo, depois tente flutuar e não consegue" },
    { "w": "Fotossíntese", "h": "Abra os braços como folhas recebendo sol e aponte pra raiz" },
    { "w": "Déjà vu", "h": "Repita exatamente o mesmo gesto duas vezes, com cara de confuso" },
    { "w": "Amnésia", "h": "Coce a cabeça confuso olhando pros lados sem reconhecer nada" },
    { "w": "Buraco negro", "h": "Faça um círculo com os braços puxando tudo pra dentro" },
    { "w": "Inteligência artificial", "h": "Ande travado feito robô e digite rápido num teclado imaginário" },
    { "w": "Criptomoeda", "h": "Desenhe uma moeda no ar e mostre ela sumindo e reaparecendo" },
    { "w": "Fake news", "h": "Aponte pro celular balançando a cabeça negando, cara de desconfiado" },
    { "w": "Ansiedade", "h": "Morda as unhas e balance a perna rápido, olhando o relógio" },
    { "w": "Empatia", "h": "Coloque a mão no ombro de alguém e imite a expressão triste dela" },
    { "w": "Burocracia", "h": "Carimbe papéis imaginários repetidamente numa pilha enorme, sem parar" },
    { "w": "Juramento", "h": "Levante a mão direita com a outra sobre um livro imaginário" },
    { "w": "Herança", "h": "Abra um envelope imaginário e comemore surpreso com o conteúdo" },
    { "w": "Divórcio", "h": "Tire uma aliança imaginária do dedo e jogue pra longe" },
    { "w": "Imposto de renda", "h": "Empilhe recibos imaginários e sue frio calculando com a calculadora" },
    { "w": "Aposentadoria", "h": "Jogue uma pasta de trabalho pro alto e sente numa cadeira de praia" },
    { "w": "Sinfonia", "h": "Reja com as duas mãos guiando uma orquestra imaginária" },
    { "w": "Golpe de estado", "h": "Empurre alguém de uma cadeira imaginária e sente no lugar" },
    { "w": "Sonho lúcido", "h": "Belisque o próprio braço dentro do sonho e continue flutuando" },
    { "w": "Ilusão de ótica", "h": "Aponte pra algo, esfregue os olhos e aponte de novo confuso" },
    { "w": "Meia-idade", "h": "Olhe no espelho puxando a pele do rosto e suspire" },
    { "w": "Procrastinação", "h": "Comece algo e largue pra ficar rolando no celular, sem culpa" },
    { "w": "Existencialismo", "h": "Olhe pro espelho imaginário questionando quem é, cara pensativa" },
    { "w": "Solidão", "h": "Sente sozinho abraçando os próprios joelhos, olhar distante" }
  ]
}
```

- [ ] **Step 8: Reescrever `src/data/words/filmes.json`**

```json
{
  "id": "filmes",
  "name": "Filmes",
  "icon": "🎬",
  "facil": [
    { "w": "O Rei Leão", "h": "Erga um bebê leão imaginário no alto de um penhasco" },
    { "w": "Titanic", "h": "Abra os braços na proa de um navio com o vento no rosto" },
    { "w": "Homem-Aranha", "h": "Lance teias com o pulso e finja escalar uma parede" },
    { "w": "Frozen", "h": "Congele algo com as mãos e jogue os cabelos pra trás cantando" },
    { "w": "Toy Story", "h": "Fique duro feito boneco e ganhe vida quando ninguém olha" },
    { "w": "Shrek", "h": "Ande pesado e verde, tampe o nariz perto de um pântano" },
    { "w": "Procurando Nemo", "h": "Nade rapidinho com uma nadadeira pequena, procurando algo perdido" },
    { "w": "Batman", "h": "Abra uma capa imaginária nos braços e faça pose séria" },
    { "w": "King Kong", "h": "Bata no peito com os punhos e escale um prédio imaginário" },
    { "w": "Velozes e Furiosos", "h": "Segure um volante e troque marchas bruscamente, cara de sério" },
    { "w": "A Bela e a Fera", "h": "Dance rodopiando com alguém peludo e enorme" },
    { "w": "Moana", "h": "Reme um barco imaginário encarando o mar com coragem" },
    { "w": "Aladdin", "h": "Esfregue uma lâmpada imaginária e peça três desejos a um gênio" },
    { "w": "Os Incríveis", "h": "Estique um braço bem longe como elástico e faça pose de herói" },
    { "w": "Carros", "h": "Faça barulho de motor com a boca e vire um volante com as mãos" },
    { "w": "Divertida Mente", "h": "Alterne rapidamente entre uma cara feliz, triste e brava" },
    { "w": "Ratatouille", "h": "Cozinhe imitando um ratinho em cima do ombro guiando as mãos" }
  ],
  "medio": [
    { "w": "Harry Potter", "h": "Aponte uma varinha imaginária e faça uma cicatriz na testa com o dedo" },
    { "w": "Guerra nas Estrelas", "h": "Segure um sabre de luz imaginário e respire pesado feito robô" },
    { "w": "Jurassic Park", "h": "Ande pisando forte feito dinossauro gigante e rosne" },
    { "w": "De Volta para o Futuro", "h": "Aperte um botão num carro imaginário e finja viajar no tempo" },
    { "w": "Os Vingadores", "h": "Junte um punho fechado como se batesse um martelo imaginário no chão" },
    { "w": "Matrix", "h": "Incline o corpo bem pra trás desviando de algo devagar" },
    { "w": "E.T.", "h": "Aponte o dedo pro céu e depois pro peito, olhos bem abertos" },
    { "w": "Zootopia", "h": "Ande como um bicho de terno investigando algo com uma lupa" },
    { "w": "Encanto", "h": "Faça um gesto mágico abrindo portas de uma casa imaginária" },
    { "w": "A Princesa e o Sapo", "h": "Beije um sapo imaginário e finja se transformar em outra coisa" },
    { "w": "Minha Mãe é uma Peça", "h": "Ajeite um cabelo enorme e fale gesticulando muito, escandalosa" },
    { "w": "As Branquelas", "h": "Passe uma maquiagem branca grossa no rosto rindo bastante" },
    { "w": "Duro de Matar", "h": "Ande descalço sobre vidros imaginários fazendo careta de dor, arma em punho" },
    { "w": "Náufrago", "h": "Abrace uma bola imaginária como se fosse seu amigo numa ilha" },
    { "w": "O Mágico de Oz", "h": "Bata os saltos de sapato imaginários três vezes desejando voltar pra casa" },
    { "w": "Branca de Neve", "h": "Morda uma maçã imaginária e caia no chão de repente" },
    { "w": "Tubarão", "h": "Faça uma barbatana com a mão na testa e nade ameaçador" },
    { "w": "Rocky", "h": "Soque o ar repetidamente e levante os braços no alto de uma escada" },
    { "w": "Piratas do Caribe", "h": "Cambaleie bêbado com uma espada e um chapéu de pirata imaginário" },
    { "w": "Jumanji", "h": "Role um dado gigante imaginário e finja ser sugado pra dentro" },
    { "w": "A Múmia", "h": "Ande enfaixado, braços esticados pra frente, arrastando os pés" }
  ],
  "dificil": [
    { "w": "O Poderoso Chefão", "h": "Faça bochechas cheias e afague um gato imaginário no colo, sério" },
    { "w": "Cidade de Deus", "h": "Segure uma câmera fotográfica imaginária correndo por um beco" },
    { "w": "O Auto da Compadecida", "h": "Finja estar morto de repente e levante fazendo cara de espanto" },
    { "w": "Central do Brasil", "h": "Escreva uma carta imaginária pra alguém, sentado numa mesinha na rua" },
    { "w": "Um Sonho de Liberdade", "h": "Cave um túnel imaginário escondido atrás de um pôster" },
    { "w": "O Sexto Sentido", "h": "Aponte pro nada sussurrando assustado que vê algo que ninguém vê" },
    { "w": "Forrest Gump", "h": "Corra sem parar por muito tempo, cara de inocente e feliz" },
    { "w": "Gladiador", "h": "Levante uma espada imaginária e bata no peito pra plateia" },
    { "w": "Psicose", "h": "Levante uma faca imaginária no chuveiro fazendo gestos rápidos e assustadores" },
    { "w": "Cantando na Chuva", "h": "Abra um guarda-chuva e rodopie pulando em poças imaginárias" },
    { "w": "A Paixão de Cristo", "h": "Carregue uma cruz pesada nos ombros, cambaleando devagar" },
    { "w": "Sharknado", "h": "Aponte pro céu assustado e faça um tubarão nadando no ar" },
    { "w": "Garota Exemplar", "h": "Sorria falso pra câmera e depois faça cara de raiva escondida" },
    { "w": "Extraordinário", "h": "Cubra parte do rosto com a mão e depois mostre orgulhoso" },
    { "w": "Tropa de Elite", "h": "Aponte uma arma imaginária e grite ordens sem emitir som, postura rígida" },
    { "w": "A Origem", "h": "Gire um pião imaginário na mesa e observe atentamente se ele cai" },
    { "w": "Coringa", "h": "Pinte um sorriso enorme com os dedos e dance de forma estranha" },
    { "w": "Clube da Luta", "h": "Aperte os punhos e sacuda a cabeça como se apanhasse de si mesmo" },
    { "w": "Pantera Negra", "h": "Cruze os braços em X no peito com postura de rei guerreiro" },
    { "w": "Interestelar", "h": "Flutue devagar olhando pra um relógio e chore vendo o tempo passar" }
  ]
}
```

- [ ] **Step 9: Reescrever `src/data/words/lugares.json`**

```json
{
  "id": "lugares",
  "name": "Lugares",
  "icon": "📍",
  "facil": [
    { "w": "Casa", "h": "Desenhe um telhado triangular com os braços acima da cabeça" },
    { "w": "Igreja", "h": "Junte as mãos rezando e balance como se tocasse um sino" },
    { "w": "Praia", "h": "Espalhe protetor solar no corpo e finja pegar uma onda" },
    { "w": "Escola", "h": "Escreva num quadro imaginário e levante a mão pra falar" },
    { "w": "Hospital", "h": "Meça a pressão de alguém e finja aplicar uma injeção" },
    { "w": "Padaria", "h": "Amasse pão imaginário e finja pegar pãezinhos quentes com uma pinça" },
    { "w": "Fazenda", "h": "Ordenhe uma vaca imaginária puxando as mãos pra baixo alternadamente" },
    { "w": "Piscina", "h": "Corra e finja pular de cabeça n'água, depois nade" },
    { "w": "Cinema", "h": "Coma pipoca imaginária olhando fixo pra uma tela grande no escuro" },
    { "w": "Mercado", "h": "Empurre um carrinho imaginário e pegue produtos das prateleiras" },
    { "w": "Parque", "h": "Balance-se num balanço imaginário e escorregue num escorregador" },
    { "w": "Farmácia", "h": "Aponte pra garganta tossindo e peça um remédio no balcão" },
    { "w": "Banheiro", "h": "Escove os dentes e finja puxar a descarga" },
    { "w": "Restaurante", "h": "Sente à mesa, abra um cardápio imaginário e chame o garçom" },
    { "w": "Quarto", "h": "Deite numa cama imaginária e puxe o cobertor até o queixo" },
    { "w": "Cozinha", "h": "Abra uma geladeira imaginária e mexa uma panela no fogão" },
    { "w": "Academia", "h": "Levante um peso imaginário fazendo força, suando bastante" }
  ],
  "medio": [
    { "w": "Aeroporto", "h": "Arraste uma mala imaginária correndo e mostre um passaporte" },
    { "w": "Circo", "h": "Equilibre-se numa corda bamba imaginária com os braços abertos" },
    { "w": "Zoológico", "h": "Aponte pra jaulas imaginárias e imite sons de vários bichos" },
    { "w": "Shopping", "h": "Carregue muitas sacolas imaginárias e ande de escada rolante" },
    { "w": "Jardim", "h": "Regue flores imaginárias agachado e cheire uma delas" },
    { "w": "Cachoeira", "h": "Erga os braços deixando água cair de cima com força" },
    { "w": "Lago", "h": "Reme um barco imaginário devagar num lugar calmo" },
    { "w": "Montanha-russa", "h": "Levante os braços gritando de susto numa descida imaginária" },
    { "w": "Museu", "h": "Ande na ponta dos pés observando quadros imaginários na parede" },
    { "w": "Estádio", "h": "Levante uma bandeira imaginária torcendo e comemore um gol sem som" },
    { "w": "Delegacia", "h": "Algeme os próprios pulsos e sente numa cela imaginária" },
    { "w": "Biblioteca", "h": "Faça sinal de silêncio e passe o dedo em livros numa prateleira" },
    { "w": "Salão de beleza", "h": "Corte cabelo imaginário com tesoura no ar e seque com secador" },
    { "w": "Rodoviária", "h": "Segure uma passagem imaginária correndo atrás de um ônibus" },
    { "w": "Motel", "h": "Ande na ponta dos pés escondido, olhando pros lados, sorrateiro" },
    { "w": "Pedágio", "h": "Estenda a mão pela janela do carro pagando uma moeda" },
    { "w": "Consultório", "h": "Sente numa maca esperando nervoso, olhando pro relógio" },
    { "w": "Presídio", "h": "Segure grades imaginárias com as duas mãos, olhando triste" },
    { "w": "Estação de trem", "h": "Corra segurando uma mala pra alcançar um trem que já anda" },
    { "w": "Feira livre", "h": "Aperte frutas imaginárias em barracas e regateie o preço" }
  ],
  "dificil": [
    { "w": "Hidrelétrica", "h": "Faça uma represa com os braços segurando muita água imaginária" },
    { "w": "Geleira", "h": "Trema de frio devagar quebrando um pedaço de gelo com o pé" },
    { "w": "Vulcão", "h": "Jogue os braços pra cima explodindo com fumaça saindo" },
    { "w": "Deserto", "h": "Ande arrastando os pés na areia quente, abanando o calor" },
    { "w": "Cemitério", "h": "Ande devagar carregando flores e coloque numa lápide imaginária" },
    { "w": "Labirinto", "h": "Ande esbarrando em paredes invisíveis, virando em becos sem saída" },
    { "w": "Observatório", "h": "Olhe através de um telescópio imaginário apontado pro céu" },
    { "w": "Plataforma de petróleo", "h": "Gire uma broca imaginária no chão e olhe o mar ao redor" },
    { "w": "Fronteira", "h": "Mostre um documento imaginário pra um guarda parado numa cancela" },
    { "w": "Cartório", "h": "Carimbe e assine um papel imaginário com uma caneta" },
    { "w": "Zona portuária", "h": "Puxe uma corda grossa amarrando um navio imaginário no cais" },
    { "w": "Fórum", "h": "Bata um martelo imaginário na mesa dando uma sentença" },
    { "w": "Alfândega", "h": "Abra uma mala imaginária pra inspeção, cara de nervoso" },
    { "w": "Reserva florestal", "h": "Ande na ponta dos pés entre árvores, observando bichos com binóculos" },
    { "w": "Estação espacial", "h": "Flutue devagar apertando botões numa parede cheia de luzes" }
  ]
}
```

- [ ] **Step 10: Reescrever `src/data/words/objetos.json`**

```json
{
  "id": "objetos",
  "name": "Objetos",
  "icon": "🧰",
  "facil": [
    { "w": "Escada", "h": "Suba degraus imaginários com as mãos segurando os corrimãos" },
    { "w": "Faca", "h": "Corte algo imaginário na mesa com movimento de serra" },
    { "w": "Chave", "h": "Gire uma chave imaginária numa fechadura, empurrando a porta" },
    { "w": "Sapato", "h": "Amarre os cadarços imaginários e bata os pés no chão" },
    { "w": "Relógio", "h": "Aponte pro pulso e mova o dedo em círculo como ponteiro" },
    { "w": "Bolsa", "h": "Pendure algo no ombro e revire dentro procurando alguma coisa" },
    { "w": "Colar", "h": "Feche um fecho atrás do pescoço e mostre orgulhoso no peito" },
    { "w": "Brinco", "h": "Prenda algo pequeno na orelha com dois dedos" },
    { "w": "Espelho", "h": "Olhe fixo pra um ponto imaginário e ajeite o cabelo" },
    { "w": "Livro", "h": "Abra as mãos como páginas e finja virar uma folha" },
    { "w": "Balão", "h": "Encha as bochechas soprando algo que cresce na sua mão" },
    { "w": "Bola", "h": "Quique algo imaginário no chão repetidamente com uma mão" },
    { "w": "Tesoura", "h": "Cruze dois dedos abrindo e fechando como lâminas" },
    { "w": "Colher", "h": "Leve a mão em concha até a boca repetidamente" },
    { "w": "Martelo", "h": "Bata um punho fechado sobre a outra mão repetidamente" },
    { "w": "Escova de dente", "h": "Esfregue os dentes com o dedo em movimento circular rápido" },
    { "w": "Celular", "h": "Deslize o dedo numa tela imaginária na palma da mão" },
    { "w": "Sofá", "h": "Afunde-se sentando confortável e estique as pernas" },
    { "w": "Óculos", "h": "Faça círculos com os dedos e coloque na frente dos olhos" },
    { "w": "Cadeira", "h": "Dobre os joelhos como se sentasse em algo atrás de você" },
    { "w": "Fogão", "h": "Gire um botão imaginário e acenda uma chama com a mão" },
    { "w": "Copo", "h": "Leve a mão fechada até a boca inclinando pra trás" },
    { "w": "Lápis", "h": "Segure entre dois dedos e risque uma linha no ar" },
    { "w": "Vela", "h": "Sopre uma chama pequena na ponta de um dedo esticado" },
    { "w": "Presente", "h": "Amarre um laço imaginário em cima de uma caixa" },
    { "w": "Guarda-chuva", "h": "Abra algo imaginário acima da cabeça de repente" },
    { "w": "Telefone", "h": "Leve a mão fechada ao ouvido e à boca, falando" },
    { "w": "Controle remoto", "h": "Aponte pra frente apertando botões repetidamente com o polegar" },
    { "w": "Rolo de papel higiênico", "h": "Desenrole algo comprido girando a mão repetidamente" },
    { "w": "Notebook", "h": "Abra uma tampa imaginária e digite rápido com os dedos" },
    { "w": "Pipa", "h": "Segure uma linha esticada olhando pra cima, puxando de leve" },
    { "w": "Berço", "h": "Balance os braços dobrados como se ninasse um bebê" },
    { "w": "Cobertor", "h": "Puxe algo até o queixo e se enrole todo tremendo" },
    { "w": "Janela", "h": "Empurre algo pra cima e debruce-se olhando pra fora" },
    { "w": "Lanterna", "h": "Aponte uma luz imaginária pra frente andando no escuro" },
    { "w": "Travesseiro", "h": "Bata de leve algo fofo e apoie a cabeça de lado" },
    { "w": "Mochila", "h": "Pendure as duas alças nos ombros e ajuste o peso" },
    { "w": "Chapéu", "h": "Coloque algo na cabeça e ajuste a aba tocando a ponta" },
    { "w": "Escova de cabelo", "h": "Puxe cerdas imaginárias da raiz até a ponta do cabelo" },
    { "w": "Caneta", "h": "Clique a ponta com o polegar e escreva riscando o ar" },
    { "w": "Garrafa", "h": "Gire uma tampa imaginária e vire a boca pra cima bebendo" },
    { "w": "Toalha", "h": "Esfregue o corpo todo se secando depois do banho" },
    { "w": "Batom", "h": "Gire a base e passe nos lábios olhando num espelho imaginário" }
  ],
  "medio": [
    { "w": "Chuveiro elétrico", "h": "Puxe uma correntinha acima da cabeça e tome banho tremendo de choque" },
    { "w": "Iô-iô", "h": "Solte e puxe algo pra cima e pra baixo preso num dedo" },
    { "w": "Trampolim", "h": "Salte com as pernas dobrando bem alto repetidamente no lugar" },
    { "w": "Compasso", "h": "Gire uma ponta ao redor da outra desenhando um círculo no ar" },
    { "w": "Tocha", "h": "Segure uma chama acesa no alto do braço esticado, andando" },
    { "w": "Andador infantil", "h": "Ande curvado empurrando algo baixo com as duas mãos, passos curtos" },
    { "w": "Aspirador de pó", "h": "Empurre algo pra frente e pra trás no chão, fazendo barulho de sucção" },
    { "w": "Liquidificador", "h": "Gire a mão rapidamente dentro de um copo imaginário" },
    { "w": "Furadeira", "h": "Trema o braço apertando um gatilho imaginário contra a parede" },
    { "w": "Extintor", "h": "Aperte um gatilho e mire um jato pra frente apagando algo" },
    { "w": "Cadeado", "h": "Encaixe algo pequeno numa argola e gire fechando" },
    { "w": "Abridor de lata", "h": "Gire algo em volta de uma tampa redonda com força" },
    { "w": "Varal", "h": "Estique braços pendurando roupas imaginárias com pregadores" },
    { "w": "Rodo", "h": "Empurre algo com cabo comprido de um lado a outro no chão molhado" },
    { "w": "Ventilador", "h": "Gire a cabeça de um lado a outro balançando o cabelo" },
    { "w": "Máquina de lavar", "h": "Gire o corpo todo repetidamente feito roupa dando voltas" },
    { "w": "Micro-ondas", "h": "Aperte botões rápidos e espere girando o dedo em círculo" },
    { "w": "Termômetro", "h": "Coloque algo embaixo do braço e espere, tremendo de febre" },
    { "w": "Binóculos", "h": "Faça círculos com as duas mãos na frente dos olhos" },
    { "w": "Bússola", "h": "Segure a mão plana e gire devagar até apontar num sentido" },
    { "w": "Escada rolante", "h": "Fique parado com o corpo subindo devagar, sem mexer as pernas" },
    { "w": "Cofrinho", "h": "Deixe cair uma moeda imaginária por uma fenda em cima da mão" },
    { "w": "Máscara de mergulho", "h": "Aperte algo no rosto cobrindo os olhos e nariz, respirando por um tubo" },
    { "w": "Grampeador", "h": "Aperte com força usando o punho fechado sobre papéis" },
    { "w": "Ferro de passar", "h": "Deslize algo quente e pesado pra frente e pra trás" },
    { "w": "Serrote", "h": "Puxe e empurre o braço repetidamente cortando algo de madeira" },
    { "w": "Fita métrica", "h": "Puxe uma fita comprida esticando entre as duas mãos" }
  ],
  "dificil": [
    { "w": "Frigorífico", "h": "Abra uma porta pesada e trema de frio pegando algo congelado" },
    { "w": "Alambique", "h": "Mexa um líquido borbulhando dentro de um pote com fumaça saindo" },
    { "w": "Ábaco", "h": "Deslize bolinhas de um lado a outro numa haste com o dedo" },
    { "w": "Periscópio", "h": "Levante um tubo até os olhos e espie por cima de algo" },
    { "w": "Estetoscópio", "h": "Coloque algo nos ouvidos e pressione a outra ponta no peito de alguém" },
    { "w": "Pêndulo", "h": "Balance um braço esticado de um lado a outro, ritmado" },
    { "w": "Ampulheta", "h": "Vire algo de cabeça pra baixo e observe cair devagarinho" },
    { "w": "Catavento", "h": "Gire os dedos em círculo rápido, imitando pás girando no vento" },
    { "w": "Ventosa", "h": "Grude a palma da mão numa superfície e puxe com força pra soltar" },
    { "w": "Manivela", "h": "Gire o braço em círculos repetidamente na altura da cintura" },
    { "w": "Torniquete", "h": "Aperte algo em volta do próprio braço bem forte, girando" },
    { "w": "Diapasão", "h": "Bata dois dedos em forma de V e aproxime do ouvido vibrando" },
    { "w": "Astrolábio", "h": "Segure um disco na altura dos olhos e alinhe com uma estrela" },
    { "w": "Bigorna", "h": "Bata um martelo pesado repetidamente sobre uma superfície dura" },
    { "w": "Sextante", "h": "Levante algo até o olho, alinhando com o horizonte no mar" },
    { "w": "Retroprojetor", "h": "Coloque uma folha transparente numa luz e aponte pra parede" }
  ]
}
```

- [ ] **Step 11: Reescrever `src/data/words/personagens.json`**

```json
{
  "id": "personagens",
  "name": "Personagens",
  "icon": "🦸",
  "facil": [
    { "w": "Pernalonga", "h": "Mastigue uma cenoura imaginária apoiado numa perna com orelhas compridas" },
    { "w": "Pinóquio", "h": "Aponte pro nariz crescendo cada vez que fala uma mentira" },
    { "w": "Papai Noel", "h": "Faça uma barriga grande, ria 'hoho' e distribua presentes" },
    { "w": "Super-Homem", "h": "Voe com um punho esticado à frente e a capa balançando" },
    { "w": "Mickey Mouse", "h": "Faça orelhas redondas com as mãos e ande animado" },
    { "w": "Bob Esponja", "h": "Ande quadrado e rígido dando risada esganiçada sem som" },
    { "w": "Cinderela", "h": "Corra descalça deixando cair um sapatinho no meio do passo" },
    { "w": "Hulk", "h": "Infle o peito com raiva e rasgue uma camisa imaginária" },
    { "w": "Woody", "h": "Aponte um dedo em forma de arma dizendo uma frase de cowboy" },
    { "w": "Coringa", "h": "Desenhe um sorriso enorme no rosto com os dedos e ria de forma estranha" },
    { "w": "Pikachu", "h": "Faça orelhas pontudas com as mãos e solte um choque com as bochechas" },
    { "w": "Homem de Ferro", "h": "Estenda as duas mãos pra frente como se disparasse energia e voe" },
    { "w": "Cebolinha", "h": "Fale trocando os erres por l, correndo atrás de alguém pra brigar" },
    { "w": "Mônica", "h": "Abrace um coelho de pelúcia imaginário com força e mostre o dente da frente" },
    { "w": "Popeye", "h": "Aperte uma lata de espinafre imaginária e mostre um bíceps enorme" },
    { "w": "Elsa", "h": "Faça um gesto congelando algo com as mãos e jogue os cabelos" },
    { "w": "Buzz Lightyear", "h": "Abra asas nas costas e estenda o braço apontando pro infinito" }
  ],
  "medio": [
    { "w": "Sherlock Holmes", "h": "Examine uma lupa imaginária de perto e fume um cachimbo pensativo" },
    { "w": "Wolverine", "h": "Estenda três dedos de cada mão como garras afiadas e rosne" },
    { "w": "Darth Vader", "h": "Respire pesado e levante a mão como se sufocasse alguém à distância" },
    { "w": "Yoda", "h": "Ande curvado apoiado num bastão, falando as frases ao contrário" },
    { "w": "Jack Sparrow", "h": "Cambaleie bêbado segurando uma garrafa e ajeite um chapéu torto" },
    { "w": "Capitão América", "h": "Levante um escudo redondo imaginário protegendo o rosto" },
    { "w": "Capitão Gancho", "h": "Levante uma mão em forma de gancho e ajeite um bigode" },
    { "w": "Hermione", "h": "Levante a mão bem alto ansiosa pra responder e aponte uma varinha" },
    { "w": "Gandalf", "h": "Bata um bastão no chão gritando algo em silêncio, cara séria" },
    { "w": "Frajola", "h": "Ande na ponta dos pés tentando pegar algo pequeno escondido" },
    { "w": "Piu-Piu", "h": "Pisque rápido e dê bicos curtos, andando com passinhos rápidos" },
    { "w": "Fred Flintstone", "h": "Bata os pés fazendo um carro imaginário andar com as pernas" },
    { "w": "Rocky Balboa", "h": "Soque o ar animado subindo escadas com os braços erguidos" },
    { "w": "Loki", "h": "Sorria de canto malicioso e faça um gesto de fazer sumir algo" },
    { "w": "Groot", "h": "Ande duro e devagar, braços rígidos, repetindo o mesmo gesto" },
    { "w": "James Bond", "h": "Ajeite a gravata, aponte uma arma imaginária de lado, sério" },
    { "w": "Chaves", "h": "Chupe o dedo polegar sentado dentro de um barril imaginário" },
    { "w": "Chapolin", "h": "Bata o peito com um martelo imaginário gritando sem medo" },
    { "w": "Saci-Pererê", "h": "Pule numa perna só segurando um cachimbo e um gorro vermelho" },
    { "w": "Thor", "h": "Gire um martelo pesado imaginário e jogue um raio pro alto" },
    { "w": "Aquaman", "h": "Faça um gesto chamando peixes e nade com um tridente" },
    { "w": "Peter Pan", "h": "Voe batendo de leve os braços e finja polvilhar pó mágico" },
    { "w": "Capitã Marvel", "h": "Estenda os punhos brilhando energia e voe séria" }
  ],
  "dificil": [
    { "w": "Hannibal Lecter", "h": "Sorria devagar e assustador, mostrando os dentes com calma" },
    { "w": "Freddy Krueger", "h": "Estenda os dedos como lâminas afiadas e ria assustador no escuro" },
    { "w": "Katniss Everdeen", "h": "Puxe uma corda de arco imaginário e mire com o olho fechado" },
    { "w": "Neo", "h": "Incline o corpo bem pra trás desviando de algo em câmera lenta" },
    { "w": "Sarah Connor", "h": "Segure uma arma imaginária com as duas mãos, postura firme" },
    { "w": "Norman Bates", "h": "Levante uma faca imaginária escondida atrás de uma cortina de banheiro" },
    { "w": "Lord Voldemort", "h": "Aponte uma varinha sem nariz, apertando os olhos com maldade" },
    { "w": "Dom Quixote", "h": "Cavalgue um cavalo magro imaginário atacando um moinho de vento" },
    { "w": "Curupira", "h": "Ande com os pés virados pra trás, deixando pegadas confusas" },
    { "w": "Mula sem cabeça", "h": "Ande relinchando sem cabeça, correndo em disparada soltando fogo" },
    { "w": "Zé Gotinha", "h": "Pule animado feito uma gota d'água e aponte pro braço pra vacina" },
    { "w": "Emília (Sítio)", "h": "Ande de boneca de pano, cabeça mole balançando de um lado a outro" },
    { "w": "Frankenstein", "h": "Ande travado com braços esticados pra frente, parafusos no pescoço" },
    { "w": "Drácula", "h": "Cubra o rosto com uma capa imaginária e mostre presas afiadas" },
    { "w": "Zorro", "h": "Desenhe um Z no ar com uma espada imaginária" }
  ]
}
```

- [ ] **Step 12: Reescrever `src/data/words/profissoes.json`**

```json
{
  "id": "profissoes",
  "name": "Profissões",
  "icon": "👷",
  "facil": [
    { "w": "Fotógrafo", "h": "Levante uma câmera imaginária e aperte o botão pedindo sorriso" },
    { "w": "Pescador", "h": "Jogue uma linha imaginária e puxe algo fisgado com força" },
    { "w": "Palhaço", "h": "Aperte um nariz vermelho imaginário e tropece de propósito" },
    { "w": "Professor", "h": "Escreva num quadro imaginário e aponte pra alguém responder" },
    { "w": "Médico", "h": "Ausculte o peito de alguém com um estetoscópio imaginário" },
    { "w": "Bombeiro", "h": "Segure uma mangueira imaginária jorrando água com força" },
    { "w": "Policial", "h": "Aponte pra frente mandando parar e finja algemar alguém" },
    { "w": "Cozinheiro", "h": "Mexa uma panela com uma colher e prove com um beijo nos dedos" },
    { "w": "Cabeleireiro", "h": "Corte cabelo imaginário com tesoura no ar e penteie" },
    { "w": "Dentista", "h": "Peça pra abrir bem a boca e examine com um espelhinho" },
    { "w": "Motorista", "h": "Segure um volante virando nas curvas e buzine" },
    { "w": "Cantor", "h": "Segure um microfone e finja cantar bem alto, emocionado" },
    { "w": "Jogador de futebol", "h": "Chute uma bola imaginária e comemore um gol correndo" },
    { "w": "Pintor", "h": "Passe um pincel imaginário numa parede, de cima a baixo" },
    { "w": "Garçom", "h": "Equilibre uma bandeja imaginária numa mão e anote um pedido" },
    { "w": "Faxineiro", "h": "Esfregue o chão com um pano e escorra um balde de água" },
    { "w": "Padeiro", "h": "Sove uma massa grande na bancada com as duas mãos" },
    { "w": "Marceneiro", "h": "Lixe uma tábua de madeira com movimentos firmes de vai e vem" },
    { "w": "Pedreiro", "h": "Espalhe massa de cimento com uma colher grande numa parede" },
    { "w": "Piloto de avião", "h": "Segure um manche imaginário e anuncie a decolagem com um microfone" },
    { "w": "Enfermeiro", "h": "Aplique uma injeção imaginária com cuidado no braço de alguém" }
  ],
  "medio": [
    { "w": "Jardineiro", "h": "Cave a terra com uma pá imaginária e plante uma muda" },
    { "w": "Maquiadora", "h": "Passe pincéis imaginários no rosto de alguém com cuidado" },
    { "w": "Astronauta", "h": "Ande flutuando devagar como sem gravidade, com passos pesados" },
    { "w": "Cientista", "h": "Misture líquidos imaginários em tubos de ensaio, olhando de perto" },
    { "w": "Juiz", "h": "Bata um martelo imaginário na mesa dando uma decisão" },
    { "w": "Veterinário", "h": "Examine a pata de um bicho imaginário com cuidado" },
    { "w": "Arqueólogo", "h": "Escave a terra com uma escovinha, revelando algo antigo" },
    { "w": "Eletricista", "h": "Aperte fios imaginários com um alicate e tome um pequeno choque" },
    { "w": "Encanador", "h": "Aperte um cano imaginário vazando com uma chave inglesa" },
    { "w": "Alfaiate", "h": "Meça um tecido imaginário e costure com agulha e linha" },
    { "w": "Salva-vidas", "h": "Apite forte e nade rápido puxando alguém pra fora d'água" },
    { "w": "Apicultor", "h": "Vista uma máscara imaginária e mexa devagar perto de abelhas" },
    { "w": "DJ", "h": "Gire discos imaginários com as duas mãos e balance a cabeça" },
    { "w": "Árbitro", "h": "Apite e mostre um cartão imaginário erguido no alto" },
    { "w": "Repórter", "h": "Segure um microfone falando rápido apontando pra uma câmera" },
    { "w": "Mágico", "h": "Tire algo de uma cartola imaginária com um gesto elegante" },
    { "w": "Carteiro", "h": "Pedale uma bicicleta imaginária entregando cartas nas casas" },
    { "w": "Nutricionista", "h": "Aponte pra um prato imaginário separando o que pode e o que não pode" },
    { "w": "Fisioterapeuta", "h": "Dobre e estique a perna de alguém com cuidado, contando repetições" },
    { "w": "Bibliotecário", "h": "Carimbe um livro imaginário e faça sinal de silêncio" },
    { "w": "Costureira", "h": "Passe uma linha por uma agulha e costure com pontinhos rápidos" }
  ],
  "dificil": [
    { "w": "Presidente da República", "h": "Assine um decreto imaginário e acene pra uma multidão" },
    { "w": "Diplomata", "h": "Aperte a mão de alguém formalmente com um sorriso educado e discreto" },
    { "w": "Leiloeiro", "h": "Fale rapidíssimo apontando pra pessoas e bata um martelinho" },
    { "w": "Perito criminal", "h": "Examine algo no chão com uma lupa, tirando fotos com cuidado" },
    { "w": "Sommelier", "h": "Gire uma taça, cheire e prove um golinho fazendo cara séria" },
    { "w": "Tabelião", "h": "Carimbe e assine documentos imaginários empilhados na mesa" },
    { "w": "Meteorologista", "h": "Aponte pra um mapa imaginário mostrando nuvens e sol" },
    { "w": "Lobista", "h": "Cochiche no ouvido de alguém importante entregando um envelope" },
    { "w": "Coach", "h": "Bata palmas motivando alguém, apontando o dedo animado" },
    { "w": "Influenciador digital", "h": "Sorria pro celular na mão fazendo pose de vários ângulos" },
    { "w": "Despachante", "h": "Empilhe papéis carimbando um por um, apressado" },
    { "w": "Sindicalista", "h": "Levante um cartaz imaginário e grite palavras de ordem sem som" },
    { "w": "Analista de sistemas", "h": "Digite rápido olhando fixo pra uma tela, tomando café sem parar" },
    { "w": "Cenógrafo", "h": "Monte um cenário imaginário arrastando objetos grandes pelo palco" },
    { "w": "Curador de museu", "h": "Ajeite um quadro na parede e recue pra admirar de longe" }
  ]
}
```

- [ ] **Step 13: Atualizar `WordCard` em `src/store/gameStore.ts`**

Trocar (linhas 52-55):

```ts
export interface WordCard {
  w: string;
  c: string;
}
```

por:

```ts
export interface WordCard {
  w: string;
  c: string;
  h?: string;
}
```

- [ ] **Step 14: Atualizar o teste de `buildPool` em `src/store/gameStore.test.ts`**

No bloco `describe("buildPool", ...)` (linhas 41-52), substituir por:

```ts
describe("buildPool", () => {
  it("retorna palavras das categorias selecionadas no nível, com dica", () => {
    const pool = buildPool("facil", new Set(["animais"]));
    expect(pool.length).toBeGreaterThan(10);
    expect(pool.every((p) => p.c === "animais")).toBe(true);
    expect(pool.every((p) => typeof p.h === "string" && p.h.length > 0)).toBe(true);
  });

  it("inclui palavras personalizadas quando 'custom' está ativo, sem dica", () => {
    const pool = buildPool("dificil", new Set(["custom"]), ["Piada interna"]);
    expect(pool).toEqual([{ w: "Piada interna", c: "custom" }]);
  });
});
```

- [ ] **Step 15: Rodar os testes e o build**

Run: `npm test`
Expected: PASS — todos os testes, incluindo o novo `src/data/index.test.ts` e o `buildPool` atualizado.

Run: `npm run build`
Expected: build limpo, sem erros de tipo (confirma que os 9 JSON e o restante do código batem com o novo `Category`/`WordCard`).

- [ ] **Step 16: Commit**

```bash
git add src/data/index.ts src/data/index.test.ts src/data/words/*.json src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "Migra palavras para {w,h} com dicas de atuação e mais palavras nas categorias existentes"
```

---

### Task 2: Nova categoria Esportes

**Files:**
- Create: `src/data/words/esportes.json`
- Modify: `src/data/index.ts` (import + `CATEGORIES`)
- Test: `src/data/index.test.ts` (mesmo teste de schema da Task 1 já cobre a categoria nova automaticamente)

**Interfaces:**
- Consumes: `WordEntry`, `Category` de `src/data/index.ts` (Task 1).
- Produces: categoria `"esportes"` disponível em `CATEGORIES`.

- [ ] **Step 1: Criar `src/data/words/esportes.json`**

```json
{
  "id": "esportes",
  "name": "Esportes",
  "icon": "🏅",
  "facil": [
    { "w": "Futebol", "h": "Chute uma bola imaginária e comemore um gol correndo de braços abertos" },
    { "w": "Natação", "h": "Faça braçadas fortes na água e vire o rosto pra respirar" },
    { "w": "Vôlei", "h": "Salte e bata numa bola imaginária por cima de uma rede" },
    { "w": "Basquete", "h": "Quique uma bola imaginária correndo e arremesse pra cima" },
    { "w": "Corrida", "h": "Agache na posição de largada e dispare correndo forte" }
  ],
  "medio": [
    { "w": "Boxe", "h": "Solte socos rápidos no ar, esquivando a cabeça de um lado a outro" },
    { "w": "Surfe", "h": "Fique de pé equilibrando os braços numa prancha imaginária" },
    { "w": "Skate", "h": "Dobre os joelhos equilibrando sobre uma tábua com rodinhas" },
    { "w": "Ciclismo", "h": "Pedale rápido segurando um guidão imaginário, corpo inclinado" },
    { "w": "Ginástica", "h": "Estique os braços e finja dar uma cambalhota no ar" }
  ],
  "dificil": [
    { "w": "Esgrima", "h": "Estique um braço com uma espada fina, avançando e recuando" },
    { "w": "Arco e flecha", "h": "Puxe uma corda esticada até o rosto e solte mirando longe" },
    { "w": "Halterofilismo", "h": "Agache e erga um peso pesadíssimo acima da cabeça, tremendo" },
    { "w": "Hipismo", "h": "Sente como se montasse um cavalo e salte um obstáculo alto" },
    { "w": "Curling", "h": "Empurre uma pedra imaginária no gelo e esfregue o chão na frente dela" }
  ]
}
```

- [ ] **Step 2: Registrar em `src/data/index.ts`**

Adicionar o import junto dos outros (após a linha do `import conceitos ...`):

```ts
import esportes from "./words/esportes.json";
```

E incluir no array `CATEGORIES` (após `conceitos`):

```ts
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
  esportes,
];
```

- [ ] **Step 3: Rodar os testes e o build**

Run: `npm test`
Expected: PASS — `src/data/index.test.ts` valida `esportes` automaticamente (dica não vazia, níveis não vazios).

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 4: Commit**

```bash
git add src/data/words/esportes.json src/data/index.ts
git commit -m "Adiciona categoria Esportes"
```

---

### Task 3: Nova categoria Desenhos e Animações

**Files:**
- Create: `src/data/words/desenhos.json`
- Modify: `src/data/index.ts` (import + `CATEGORIES`)

**Interfaces:**
- Consumes: `WordEntry`, `Category` de `src/data/index.ts` (Task 1).
- Produces: categoria `"desenhos"` disponível em `CATEGORIES`.

- [ ] **Step 1: Criar `src/data/words/desenhos.json`**

```json
{
  "id": "desenhos",
  "name": "Desenhos e Animações",
  "icon": "📺",
  "facil": [
    { "w": "Peppa Pig", "h": "Pule bem alto em poças de lama imaginárias, rindo igual porquinho" },
    { "w": "Patrulha Canina", "h": "Ande de quatro latindo e finja apertar um walkie-talkie na patinha" },
    { "w": "Masha e o Urso", "h": "Corra fazendo bagunça enquanto um urso grande tenta te alcançar" },
    { "w": "Os Simpsons", "h": "Faça um topete pontudo com os dedos e fale sem som, exagerado" },
    { "w": "Pica-Pau", "h": "Bata a cabeça repetidamente pra frente rindo alto e estridente" }
  ],
  "medio": [
    { "w": "Naruto", "h": "Corra bem inclinado pra frente com os braços esticados pra trás" },
    { "w": "Dragon Ball", "h": "Junte as mãos na lateral do corpo carregando energia e solte pra frente" },
    { "w": "Pokémon", "h": "Jogue uma bolinha imaginária pra frente capturando uma criatura" },
    { "w": "Avatar - A Lenda de Aang", "h": "Mova os braços como se controlasse vento, água, terra e fogo" },
    { "w": "Scooby-Doo", "h": "Trema de medo escondido atrás de alguém, latindo alto de susto" }
  ],
  "dificil": [
    { "w": "Death Note", "h": "Escreva um nome imaginário num caderno com um sorriso maligno" },
    { "w": "One Piece", "h": "Estique um braço bem longe como borracha, apontando um tesouro" },
    { "w": "Ataque dos Titãs", "h": "Estique os braços gigantes e pise pesado sobre um muro imaginário" },
    { "w": "Neon Genesis Evangelion", "h": "Sente dentro de um robô gigante imaginário apertando alavancas nervoso" },
    { "w": "Rick and Morty", "h": "Arrote alto no meio da fala e abra um portal verde com as mãos" }
  ]
}
```

- [ ] **Step 2: Registrar em `src/data/index.ts`**

Adicionar o import (após `import esportes ...` da Task 2):

```ts
import desenhos from "./words/desenhos.json";
```

E incluir no array `CATEGORIES` (após `esportes`):

```ts
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
  esportes,
  desenhos,
];
```

- [ ] **Step 3: Rodar os testes e o build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 4: Commit**

```bash
git add src/data/words/desenhos.json src/data/index.ts
git commit -m "Adiciona categoria Desenhos e Animações"
```

---

### Task 4: Preferência `hintsEnabled` em `src/store/settings.ts`

**Files:**
- Modify: `src/store/settings.ts`
- Test: `src/store/settings.test.ts`

**Interfaces:**
- Produces: `PersistedSettings.hintsEnabled: boolean`, incluído em `DEFAULT_SETTINGS` (default `true`) e validado em `loadSettings()`.
- Consumes: helper `bool()` já existente em `settings.ts`.

- [ ] **Step 1: Escrever os testes de `hintsEnabled`**

Em `src/store/settings.test.ts`, adicionar ao final do arquivo (antes do fechamento do arquivo, como um novo `describe`):

```ts
describe("loadSettings — hintsEnabled", () => {
  it("vem ligado por padrão", () => {
    expect(loadSettings().hintsEnabled).toBe(true);
  });

  it("aceita desligar", () => {
    writeJson({ hintsEnabled: false });
    expect(loadSettings().hintsEnabled).toBe(false);
  });

  it("ignora valor que não é booleano", () => {
    writeJson({ hintsEnabled: "sim" });
    expect(loadSettings().hintsEnabled).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar os testes e ver que falham**

Run: `npm test -- --run settings.test.ts`
Expected: FAIL — `loadSettings().hintsEnabled` é `undefined` porque o campo ainda não existe.

- [ ] **Step 3: Adicionar o campo em `PersistedSettings` e `DEFAULT_SETTINGS`**

Em `src/store/settings.ts`, na interface (linha 40, logo após `bonusEnabled: boolean;`):

```ts
  bonusEnabled: boolean;
  hintsEnabled: boolean;
```

Em `DEFAULT_SETTINGS` (linha 62, logo após `bonusEnabled: true,`):

```ts
  bonusEnabled: true,
  hintsEnabled: true,
```

- [ ] **Step 4: Validar em `loadSettings()`**

Logo após a linha `bonusEnabled: bool(s.bonusEnabled, DEFAULT_SETTINGS.bonusEnabled),` (linha 151), adicionar:

```ts
    bonusEnabled: bool(s.bonusEnabled, DEFAULT_SETTINGS.bonusEnabled),
    hintsEnabled: bool(s.hintsEnabled, DEFAULT_SETTINGS.hintsEnabled),
```

- [ ] **Step 5: Rodar os testes e o build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build limpo (o teste de round-trip que espalha `DEFAULT_SETTINGS` continua batendo, já que `hintsEnabled` está incluso nos defaults).

- [ ] **Step 6: Commit**

```bash
git add src/store/settings.ts src/store/settings.test.ts
git commit -m "Adiciona preferência hintsEnabled (dica de atuação)"
```

---

### Task 5: Ligar `hintsEnabled` ao store do jogo

**Files:**
- Modify: `src/store/gameStore.ts`
- Test: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `PersistedSettings.hintsEnabled` (Task 4).
- Produces: `GameData.hintsEnabled: boolean`, action `setHintsEnabled(v: boolean): void` que persiste via `persist(get)`.

- [ ] **Step 1: Escrever o teste de persistência**

Em `src/store/gameStore.test.ts`, dentro do `describe("preferências", ...)` (após o teste "mudanças de configuração sobrevivem ao recarregar", linha ~414), adicionar:

```ts
  it("hintsEnabled sobrevive ao recarregar", () => {
    reset();
    expect(s().hintsEnabled).toBe(true);
    useGame.getState().setHintsEnabled(false);
    expect(s().hintsEnabled).toBe(false);
    const saved = JSON.parse(kv.get("mimica_settings")!);
    expect(saved.hintsEnabled).toBe(false);
  });
```

- [ ] **Step 2: Rodar o teste e ver que falha**

Run: `npm test -- --run gameStore.test.ts`
Expected: FAIL — `setHintsEnabled` ainda não existe (erro de tipo/runtime: `useGame.getState().setHintsEnabled is not a function`).

- [ ] **Step 3: Adicionar o campo, a action e a implementação**

Em `src/store/gameStore.ts`, na interface `GameData` (linha 70, logo após `bonusEnabled: boolean;`):

```ts
  bonusEnabled: boolean;
  hintsEnabled: boolean;
```

Na interface `GameActions` (linha 131, logo após `setBonusEnabled: (v: boolean) => void;`):

```ts
  setBonusEnabled: (v: boolean) => void;
  setHintsEnabled: (v: boolean) => void;
```

Em `pickSettings` (linha 228, logo após `bonusEnabled: s.bonusEnabled,`):

```ts
    bonusEnabled: s.bonusEnabled,
    hintsEnabled: s.hintsEnabled,
```

Em `makeInitialState` (linha 258, logo após `bonusEnabled: s.bonusEnabled,`):

```ts
    bonusEnabled: s.bonusEnabled,
    hintsEnabled: s.hintsEnabled,
```

Na implementação das actions (logo após `setBonusEnabled`, linha ~433):

```ts
  setBonusEnabled: (bonusEnabled) => {
    set({ bonusEnabled });
    persist(get);
  },
  setHintsEnabled: (hintsEnabled) => {
    set({ hintsEnabled });
    persist(get);
  },
```

- [ ] **Step 4: Rodar os testes e o build**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 5: Commit**

```bash
git add src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "Liga hintsEnabled ao store do jogo"
```

---

### Task 6: Toggle "Dica de atuação" na tela de configurações

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `g.hintsEnabled: boolean`, `g.setHintsEnabled(v: boolean): void` (Task 5); componente `Switch` de `src/components/ui.tsx` (já existente, sem mudanças); componente local `Row` de `HomeScreen.tsx` (já existente).

- [ ] **Step 1: Adicionar o toggle no painel "Regras"**

Em `src/screens/HomeScreen.tsx`, dentro do `<Panel>` "Regras" (a partir da linha 233), adicionar uma nova `Row` como primeiro item, antes de "✨ Palavras bônus":

```tsx
        <Panel>
          <SectionTitle>Regras</SectionTitle>
          <div className="flex flex-col gap-3 text-[13px]">
            <Row label="💡 Dica de atuação">
              <Switch
                label="Dica de atuação"
                on={g.hintsEnabled}
                onToggle={() => g.setHintsEnabled(!g.hintsEnabled)}
              />
            </Row>
            <Row label="✨ Palavras bônus (valem 3)">
```

(o restante do painel continua igual — só a nova `Row` entra antes da existente.)

- [ ] **Step 2: Rodar o build**

Run: `npm run build`
Expected: build limpo — não há teste de componente para `HomeScreen`, então a verificação aqui é o type-check e uma checagem visual manual.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`

Abrir a URL local no navegador, ir na tela de configurações e confirmar que o toggle "Dica de atuação" aparece no painel Regras, começa ligado, e alterna ao tocar (visualmente idêntico aos outros switches).

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "Adiciona toggle de dica de atuação nas configurações"
```

---

### Task 7: Mostrar a dica no ingresso da tela de jogo

**Files:**
- Modify: `src/screens/GameScreen.tsx`

**Interfaces:**
- Consumes: `g.hintsEnabled: boolean`, `g.current?.h: string | undefined` (Tasks 1 e 5).

- [ ] **Step 1: Adicionar a linha de dica no ticket**

Em `src/screens/GameScreen.tsx`, dentro do bloco do ticket (a partir da linha 101), logo após a `div` da palavra grande (linhas 112-114), adicionar:

```tsx
            <div className="font-display tracking-tight-display text-[34px] leading-[1.05] break-words">
              {g.current?.w.toUpperCase() ?? "…"}
            </div>
            {g.hintsEnabled && g.current?.h && (
              <p className="text-[12px] italic text-mutedc px-2 leading-snug">
                💡 {g.current.h}
              </p>
            )}
          </div>
```

(a `</div>` final acima já existe no arquivo — fica fechando o mesmo container `flex-1 flex flex-col items-center justify-center gap-2.5 px-5 py-6 text-center` que hoje termina logo depois da palavra.)

- [ ] **Step 2: Rodar o build**

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev`

Abrir a URL local, iniciar uma partida e confirmar:
- a dica aparece abaixo da palavra, em itálico, com o ícone 💡;
- desligando "Dica de atuação" nas configurações (Task 6) e voltando pro jogo, a dica some;
- escolhendo só a categoria "Personalizadas" (com alguma palavra própria cadastrada), a dica não aparece pra essas palavras (não têm `h`).

- [ ] **Step 4: Commit**

```bash
git add src/screens/GameScreen.tsx
git commit -m "Mostra a dica de atuação no ingresso da tela de jogo"
```

---

## Self-Review

**Cobertura do spec:**
- Estrutura `{w,h}` e `WordEntry` → Task 1.
- `buildPool` retornando `h`, `WordCard.h?` → Task 1.
- Palavras personalizadas sem dica → Task 1 (teste do `buildPool`) e Task 7 (verificação manual).
- Todas as ~470 palavras existentes com dica → Task 1 (9 arquivos reescritos por completo).
- `hintsEnabled` persistido com default `true` → Tasks 4 e 5.
- Toggle nas configurações → Task 6.
- Exibição condicional no ticket → Task 7.
- 2 categorias novas (Esportes, Desenhos e Animações) com ~15 palavras por nível já com dica → Tasks 2 e 3.
- +10 a 15 palavras novas nas 9 categorias existentes → Task 1 (12 palavras novas por categoria, todas com dica).
- Testes cobrindo tudo + `npm run build` ao final de cada task.

**Placeholders:** nenhum `TBD`/"implementar depois" — todo JSON, diff e teste está com conteúdo completo.

**Consistência de tipos:** `WordEntry { w, h }` (Task 1) é usado sem alteração em todas as 11 categorias (Tasks 1-3); `WordCard { w, c, h? }` (Task 1) é o único tipo consumido por `GameScreen.tsx` (Task 7); `hintsEnabled` tem o mesmo nome em `PersistedSettings` (Task 4), `GameData`/`GameActions`/`pickSettings`/`makeInitialState` (Task 5) e no JSX (Tasks 6-7) — sem divergência de nome entre tasks.
