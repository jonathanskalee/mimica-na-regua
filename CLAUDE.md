# Mímica na Régua

Jogo de mímica em português (pt-BR) para jogar em grupo pelo celular. PWA instalável.

## Stack

- Vite 6 + React 18 + TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/vite`; tokens do tema em `src/index.css` no bloco `@theme`)
- Zustand para estado global do jogo
- vite-plugin-pwa (manifest + service worker, autoUpdate)
- Vitest para testes
- Fontes self-hosted via `@fontsource/anton` e `@fontsource/poppins` (importadas em `src/main.tsx`)

## Comandos

- `npm run dev` — dev server acessível na rede local (`--host`), para testar no celular
- `npm run build` — type-check + build de produção
- `npm test` — roda os testes uma vez
- `npm run icons` — regera os ícones do PWA a partir de `scripts/gen-icons.mjs`
- **Sempre rodar `npm test` e `npm run build` antes de considerar uma tarefa concluída.**

## Estrutura

```
src/
  data/
    words/*.json      # banco de palavras por categoria {id, name, icon, facil[], medio[], dificil[]}
    index.ts          # tipos, CATEGORIES, buildPool()
  lib/
    fx.ts             # sons (WebAudio), vibração, storage seguro, wake lock
    clock.ts          # fonte de tempo — o seam que deixa o relógio ser testado
  store/
    gameStore.ts      # o store Zustand: estado + actions (efeitos ficam aqui)
    teams.ts          # fila de vezes, campeão, empate — puro
    tilt.ts           # decisão do modo testa a partir do ângulo — puro
    settings.ts       # leitura/escrita das preferências, com merge defensivo
  hooks/
    useGameClock.ts   # empurra o relógio (poll + visibilitychange)
    useDeviceTilt.ts  # permissão iOS, listener do sensor, ângulo ao vivo
  components/         # peças de UI reutilizáveis (ui.tsx, Curtain, Scoreboard, …)
  screens/            # uma tela por arquivo + OnboardingOverlay
  App.tsx             # roteia telas pelo campo `screen` do store
scripts/gen-icons.mjs # arte e geração dos ícones do PWA
legacy/mimica-v3.html # versão HTML original — referência histórica, tudo já migrado
```

## Regras do projeto

1. **Lógica de jogo vive no store, nunca nos componentes.** Componentes só leem estado e chamam actions. Regra sobre *onde a lógica mora*, não sobre um arquivo único: o que é decisão pura (fila de times, ângulo do tilt, validação de preferências) fica em módulos separados de `src/store/`, com teste próprio.
2. **Palavras são dados**: novas palavras/categorias entram em `src/data/words/*.json`. Uma categoria nova = novo arquivo JSON + import em `src/data/index.ts`.
3. Textos da interface em **português (pt-BR)**, tom leve e informal.
4. Mobile-first: alvos de toque ≥ 44px, testar em viewport 390×844.
5. Identidade visual: tema "teatro/marquee" — fundo vinho escuro, dourado `#f2c14e`, fonte display Anton, corpo Poppins. Não usar azul/roxo genérico.
6. Nunca usar `localStorage` direto — usar `store` de `src/lib/fx.ts` (tem fallback em memória).
7. TypeScript strict; sem `any` novos (o cast em `vite.config.ts` para `test` é a exceção conhecida).
8. Commits pequenos e descritivos em português.
9. **Toda configuração nova precisa persistir**: adicione o campo em `PersistedSettings` (`src/store/settings.ts`) com seu validador, inclua-o em `pickSettings`, e chame `persist(get)` no fim do setter.
10. **Nunca ler `Date.now()` dentro do store** — use `now()` de `src/lib/clock.ts`, ou receba `nowMs` por parâmetro. É o que permite testar pausa, expiração e aba em segundo plano sem timers falsos.
11. **Copie antes de mutar**: `Set`s e arrays do estado (`used`, `teamScores`, `teamNames`) são compartilhados entre telas e vezes.

## Identidade visual

Cada tela é um momento do espetáculo: Home é o **cartaz**, Ready é a **cortina fechada**,
Game é o **palco**, Results é o **intervalo**, Champion é a **ovação**.

- **Elemento-assinatura**: a cortina de veludo (`src/components/Curtain.tsx`), que fecha na tela
  de preparação e abre no "VAI!". É o único momento coreografado — o resto fica quieto de propósito.
- **Apoio**: a palavra vive num ingresso de papel com recortes laterais e picote (classe `.ticket`).
- Movimento é orçamento curto: cortina, flip do ingresso, flash de acerto/pulo, lâmpadas,
  refletor e confete. Nada além disso, e tudo desligado em `prefers-reduced-motion`.
- Números de placar e cronômetro usam a classe `.tabular` para não mudar de largura.

## Estado atual

Tudo do legacy foi migrado, mais o que veio depois:

- Modos Corrida (tempo total) e Relâmpago (tempo por palavra, com limite de palavras ∞/10/15/20)
- **Modo Times**: 2–4 times com nome e cor, 1–3 rodadas, placar parcial entre vezes, tela de
  campeão com confete e empate tratado, revanche. As palavras não se repetem entre os times.
- **Modo testa (tilt)** com calibração e permissão iOS
- 3 níveis, 11 categorias (~670 palavras), sem repetição na sessão
- Palavras bônus (15%, valem 3), limite de pulos (∞/3/5), penalidade de pulo
- **Dica de atuação** por palavra (visível só pra quem mimica), com toggle `hintsEnabled` nas configurações
- Relógio por timestamp — não atrasa quando a aba perde o foco
- Flash verde/vermelho, pause com overlay, sons WebAudio, vibração, wake lock
- Onboarding de 3 cards na primeira abertura
- **Todas as preferências persistem** em `mimica_settings`; recordes por modo × nível (não contam
  em partidas de times) e palavras personalizadas em chaves próprias
- PWA completo: ícones normal e maskable, fontes precacheadas para funcionar offline

82 testes cobrem store, times, tilt e preferências.

## Pendências

- **Modo testa não foi validado num aparelho real.** A decisão (`tiltDecision`) está coberta por
  testes, mas o caminho completo — permissão do iOS, que exige HTTPS, e a ergonomia dos limiares —
  precisa de um celular. Abra a URL de rede do `npm run dev` pelo celular para testar.
- **Deploy** — ver a seção abaixo; ainda não é um repositório git.

## Deploy (Vercel)

1. Criar repositório no GitHub e fazer push.
2. Em vercel.com: Add New Project → importar o repo → framework "Vite" é detectado automaticamente → Deploy.
3. Cada `git push` na branch main publica automaticamente.
4. No celular, abrir a URL e usar "Adicionar à tela de início" para instalar como app.
