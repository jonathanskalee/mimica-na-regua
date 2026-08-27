# Dicas de atuação e mais palavras

## Contexto

Duas melhorias pedidas pelo usuário:

1. Quem está mimicando às vezes trava sem saber *como* atuar a palavra sorteada. Uma dica curta de atuação, visível só pra quem está atuando (a pessoa segurando o celular), ajuda sem estragar o jogo pra quem está adivinhando.
2. O banco de palavras (~470 palavras em 9 categorias) pode crescer: mais palavras nas categorias existentes e categorias novas.

As duas se cruzam na camada de dados: toda palavra nova já nasce com dica, e as ~470 palavras existentes ganham dica como parte deste trabalho.

## Estrutura de dados

Hoje cada nível de categoria é `string[]`:

```json
"facil": ["Girafa", "Leão"]
```

Passa a ser um array de objetos `{ w, h }`:

```json
"facil": [
  { "w": "Girafa", "h": "Estique bem o pescoço e ande devagar, olhando de cima" },
  { "w": "Leão", "h": "Rugido silencioso + jeito de andar de gato grandão" }
]
```

- `Category` (`src/data/index.ts`): `facil`, `medio`, `dificil` passam de `string[]` para `{ w: string; h: string }[]`.
- `buildPool()` retorna itens `{ w, c, h }` — mantém `w` (palavra) e `c` (id da categoria) como hoje, adiciona `h` (dica).
- Palavras personalizadas (`customWords`, digitadas pelo jogador) continuam simples strings e **não têm dica** — `buildPool` as inclui como `{ w, c: "custom" }` sem `h`.
- `WordCard` (`src/store/gameStore.ts`) ganha campo opcional `h?: string`.
- Todas as ~470 palavras já cadastradas nos 9 arquivos JSON existentes ganham uma dica escrita como parte da implementação (não é trabalho do usuário).

## Configuração: dica opcional

Novo campo persistido, seguindo o padrão existente de `src/store/settings.ts`:

- `PersistedSettings.hintsEnabled: boolean`, default `true`.
- Validado com o helper `bool()` já existente.
- Entra em `DEFAULT_SETTINGS`, `loadSettings()` e `pickSettings`.
- Setter no store (`gameStore.ts`) chama `persist(get)` ao alterar, como os demais toggles (`soundOn`, `vibeOn`, `bonusEnabled`).
- Novo toggle na tela de configurações (`HomeScreen.tsx`), ao lado dos outros (som, vibração, bônus): rótulo "Dica de atuação".

## Exibição em jogo

Em `GameScreen.tsx`, dentro do ticket, abaixo da palavra grande:

```
GIRAFA
💡 estique o pescoço e ande devagar, olhando de cima
```

- Texto menor, itálico, cor discreta (`text-mutedc`), ícone 💡 de prefixo.
- Renderiza apenas quando `g.hintsEnabled && g.current?.h` — some automaticamente para palavras personalizadas (sem `h`) e quando a preferência está desligada.
- Sem novo elemento de layout: cabe no espaço já existente do ticket (`min-h-[196px]`). Ajustar padding/tamanho de fonte do bloco de texto se palavras longas + dica ficarem apertadas.
- A dica é visível para quem estiver olhando a tela do celular (quem atua) — não há mecanismo de ocultar/revelar por toque; a visibilidade natural do jogo (só quem segura o celular vê a tela) já cumpre o papel de mantê-la "privada".

## Conteúdo novo

- **2 categorias novas**, já com hints desde o início:
  - **Esportes** 🏅
  - **Desenhos e Animações** 📺
  - Cada uma com ~15 palavras por nível (facil/medio/dificil) — cerca de 90 a 100 palavras novas no total entre as duas.
  - Registradas em `src/data/index.ts` (import do JSON + inclusão em `CATEGORIES`), do mesmo jeito que as categorias atuais.
- **+10 a 15 palavras novas** em cada uma das 9 categorias já existentes (`acoes`, `animais`, `comida`, `conceitos`, `filmes`, `lugares`, `objetos`, `personagens`, `profissoes`), distribuídas entre os 3 níveis, cada uma já com `{ w, h }`.

## Testes

- Testes de `buildPool` cobrindo o novo formato `{w,h}`, incluindo o caso de palavra personalizada sem `h`.
- Testes de `settings.ts` para `hintsEnabled`: default, leitura válida, merge defensivo com valor corrompido, `pickSettings`.
- Rodar `npm test` e `npm run build` (type-check) ao final — mudança de tipo em `Category` deve estourar em qualquer lugar que ainda espere `string[]`, então o type-check pega qualquer ponto esquecido.

## Fora de escopo

- Não há toggle de "esconder até pedir ajuda" — a dica é sempre visível quando a preferência está ligada (decisão explícita do usuário).
- Não há hint para palavras personalizadas — não há dado de onde tirar a dica.
- Não estamos mudando o algoritmo de sorteio/anti-repetição de palavras, só o formato do dado.
