import { useState } from "react";
import { getRecord, useGame } from "../store/gameStore";
import { buildPool, CATEGORIES, Level, LEVEL_LABELS, Mode } from "../data";
import { MAX_TEAM_NAME, TEAM_COLORS } from "../store/teams";
import { unlockAudio, sfx, vibrate } from "../lib/fx";
import { useLiveBeta, useTiltPermission } from "../hooks/useDeviceTilt";
import { TILT_HIT_DELTA, TILT_PASS_DELTA } from "../store/tilt";
import {
  BigButton,
  MarqueeBulbs,
  Panel,
  Pill,
  SectionTitle,
  Segmented,
  Sheet,
  Switch,
} from "../components/ui";

export default function HomeScreen() {
  const g = useGame();
  const requestTilt = useTiltPermission();
  const [sheet, setSheet] = useState<null | "custom" | "records" | "tilt">(null);
  const [customText, setCustomText] = useState(g.customWords.join("\n"));

  const poolSize = buildPool(g.level, g.cats, g.customWords).length;
  const timeValue = g.mode === "total" ? g.roundSeconds : g.wordSeconds;
  const catCount = CATEGORIES.length + (g.customWords.length ? 1 : 0);

  const summary = [
    g.mode === "total" ? `Corrida ${g.roundSeconds}s` : `Relâmpago ${g.wordSeconds}s/palavra`,
    `Nível ${LEVEL_LABELS[g.level]}`,
    g.teamsEnabled
      ? `${g.teamCount} times × ${g.teamRounds} rodada${g.teamRounds > 1 ? "s" : ""}`
      : "Solo",
  ].join(" · ");

  const startMatch = () => {
    unlockAudio(); // única janela em que o navegador deixa criar o áudio
    g.startMatch();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 flex flex-col items-center gap-4">
        {/* cartaz */}
        <header className="flex flex-col items-center gap-2.5 text-center">
          <MarqueeBulbs count={7} />
          <h1 className="font-display tracking-tight-display text-[42px] text-gold drop-shadow-[0_0_18px_rgba(242,193,78,.35)] leading-none">
            MÍMICA NA RÉGUA
          </h1>
          <div className="hairline w-48" />
          <p className="text-mutedc text-xs max-w-[280px]">
            Monte a partida do seu jeito e faça o time adivinhar sem falar nadinha.
          </p>
        </header>

        {/* modo */}
        <Panel>
          <SectionTitle>Modo de jogo</SectionTitle>
          <Segmented<Mode>
            label="Modo de jogo"
            value={g.mode}
            onChange={g.setMode}
            options={[
              { value: "total", label: "🏃 Corrida", hint: "Tempo total da rodada" },
              { value: "perword", label: "⚡ Relâmpago", hint: "Tempo por palavra" },
            ]}
          />
          <div className="flex items-center gap-2 text-[13px]">
            <span className="flex-1">
              {g.mode === "total" ? "⏱ Tempo da rodada (s)" : "⚡ Tempo por palavra (s)"}
            </span>
            <button
              onClick={() => g.adjustTime(-1)}
              aria-label="Diminuir tempo"
              className="w-11 h-11 rounded-xl bg-gold/15 text-gold font-bold text-lg"
            >
              –
            </button>
            <span className="font-display tabular text-gold min-w-9 text-center text-lg">
              {timeValue}
            </span>
            <button
              onClick={() => g.adjustTime(1)}
              aria-label="Aumentar tempo"
              className="w-11 h-11 rounded-xl bg-gold/15 text-gold font-bold text-lg"
            >
              +
            </button>
          </div>

          {g.mode === "perword" && (
            <>
              <div className="hairline" />
              <div className="flex flex-col gap-2">
                <span className="text-[13px]">🎬 Palavras por vez</span>
                <Segmented<number>
                  label="Palavras por vez"
                  value={g.wordLimit}
                  onChange={g.setWordLimit}
                  options={[
                    { value: 0, label: "∞" },
                    { value: 10, label: "10" },
                    { value: 15, label: "15" },
                    { value: 20, label: "20" },
                  ]}
                />
                <p className="text-[11px] text-mutedc">
                  {g.wordLimit === 0
                    ? g.teamsEnabled
                      ? "Sem escolha, cada vez dura 10 palavras."
                      : "A rodada só acaba quando você encerrar."
                    : `A vez acaba depois de ${g.wordLimit} palavras.`}
                </p>
              </div>
            </>
          )}
        </Panel>

        {/* nível */}
        <Panel>
          <SectionTitle>Nível</SectionTitle>
          <Segmented<Level>
            label="Nível"
            value={g.level}
            onChange={g.setLevel}
            activeClass={(l) =>
              l === "facil"
                ? "bg-ok text-white"
                : l === "medio"
                  ? "bg-[#d38b2c] text-cardink"
                  : "bg-danger text-white"
            }
            options={[
              { value: "facil", label: "1", hint: "Fácil" },
              { value: "medio", label: "2", hint: "Médio" },
              { value: "dificil", label: "3", hint: "Difícil" },
            ]}
          />
        </Panel>

        {/* times */}
        <Panel>
          <div className="flex items-center gap-2">
            <SectionTitle>Times</SectionTitle>
            <div className="flex-1" />
            <Switch
              label="Jogar em times"
              on={g.teamsEnabled}
              onToggle={() => g.setTeamsEnabled(!g.teamsEnabled)}
            />
          </div>

          {g.teamsEnabled ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="flex-1">Quantos times</span>
                <div className="w-[150px]">
                  <Segmented<number>
                    label="Quantidade de times"
                    value={g.teamCount}
                    onChange={g.setTeamCount}
                    options={[
                      { value: 2, label: "2" },
                      { value: 3, label: "3" },
                      { value: 4, label: "4" },
                    ]}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="flex-1">Rodadas por time</span>
                <div className="w-[150px]">
                  <Segmented<number>
                    label="Rodadas por time"
                    value={g.teamRounds}
                    onChange={g.setTeamRounds}
                    options={[
                      { value: 1, label: "1" },
                      { value: 2, label: "2" },
                      { value: 3, label: "3" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {Array.from({ length: g.teamCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: TEAM_COLORS[i] }}
                    />
                    <input
                      value={g.teamNames[i]}
                      maxLength={MAX_TEAM_NAME}
                      aria-label={`Nome do time ${i + 1}`}
                      onChange={(e) => g.setTeamName(i, e.target.value)}
                      className="flex-1 bg-black/25 border border-gold/25 rounded-xl px-3 py-2.5 text-[13px] text-cardlight outline-none focus:border-gold"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-mutedc">
              Ligue para revezar entre 2 e 4 times, com placar e tela de campeão.
            </p>
          )}
        </Panel>

        {/* categorias */}
        <Panel>
          <SectionTitle aside={`${poolSize} palavras`}>Categorias</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Pill dashed active={g.cats.size >= catCount} onClick={g.toggleAllCats}>
              ✔ Todas
            </Pill>
            {CATEGORIES.map((c) => (
              <Pill key={c.id} active={g.cats.has(c.id)} onClick={() => g.toggleCat(c.id)}>
                {c.icon} {c.name}
              </Pill>
            ))}
            {g.customWords.length > 0 && (
              <Pill active={g.cats.has("custom")} onClick={() => g.toggleCat("custom")}>
                📝 Minhas palavras
              </Pill>
            )}
          </div>
        </Panel>

        {/* regras */}
        <Panel>
          <SectionTitle>Regras</SectionTitle>
          <div className="flex flex-col gap-3 text-[13px]">
            <Row label="✨ Palavras bônus (valem 3)">
              <Switch
                label="Palavras bônus"
                on={g.bonusEnabled}
                onToggle={() => g.setBonusEnabled(!g.bonusEnabled)}
              />
            </Row>
            <Row label="⏭ Limite de pulos">
              <div className="w-[132px]">
                <Segmented<number>
                  label="Limite de pulos"
                  value={g.skipLimit}
                  onChange={g.setSkipLimit}
                  options={[
                    { value: -1, label: "∞" },
                    { value: 3, label: "3" },
                    { value: 5, label: "5" },
                  ]}
                />
              </div>
            </Row>
            <Row label="🚫 Pular desconta 1 ponto">
              <Switch
                label="Pular desconta ponto"
                on={g.skipPenalty}
                onToggle={() => g.setSkipPenalty(!g.skipPenalty)}
              />
            </Row>
          </div>
        </Panel>

        {/* dispositivo */}
        <Panel>
          <SectionTitle>No celular</SectionTitle>
          <div className="flex flex-col gap-3 text-[13px]">
            <Row label="🔊 Sons">
              <Switch
                label="Sons"
                on={g.soundOn}
                onToggle={() => {
                  const next = !g.soundOn;
                  if (next) unlockAudio();
                  g.setSoundOn(next);
                  if (next) sfx.ok();
                }}
              />
            </Row>
            <Row label="📳 Vibração">
              <Switch
                label="Vibração"
                on={g.vibeOn}
                onToggle={() => {
                  const next = !g.vibeOn;
                  g.setVibeOn(next);
                  if (next) vibrate(60);
                }}
              />
            </Row>
            <Row label="🤳 Modo testa (inclinar)">
              <Switch
                label="Modo testa"
                on={g.tiltEnabled}
                onToggle={async () => {
                  if (g.tiltEnabled) {
                    g.setTiltEnabled(false);
                    return;
                  }
                  // A permissão do iOS só é concedida dentro deste toque.
                  const permission = await requestTilt();
                  if (permission === "granted") g.setTiltEnabled(true);
                }}
              />
            </Row>
            {g.tiltPermission === "denied" && (
              <p className="text-[11px] text-danger">
                O celular negou o acesso ao sensor de movimento. Libere nas configurações do
                navegador para usar o modo testa.
              </p>
            )}
            {g.tiltPermission === "unsupported" && (
              <p className="text-[11px] text-mutedc">
                Este aparelho não tem sensor de inclinação — o modo testa só funciona no celular.
              </p>
            )}
            {g.tiltEnabled && (
              <button
                onClick={() => setSheet("tilt")}
                className="self-start text-[12px] text-gold underline"
              >
                Calibrar a posição neutra
              </button>
            )}
          </div>
        </Panel>

        <div className="flex gap-5 text-xs text-mutedc pb-2">
          <button className="underline" onClick={() => setSheet("records")}>
            🏆 Recordes
          </button>
          <button className="underline" onClick={() => setSheet("custom")}>
            📝 Minhas palavras
          </button>
          <button className="underline" onClick={g.replayOnboarding}>
            ❓ Como joga
          </button>
        </div>
      </div>

      {/* barra fixa */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-bg1 via-bg1/95 to-transparent flex justify-center">
        <div className="w-full max-w-[360px]">
          <BigButton onClick={startMatch}>JOGAR</BigButton>
          <p className="text-center text-[11px] text-mutedc mt-2">{summary}</p>
        </div>
      </div>

      {sheet === "custom" && (
        <CustomWordsSheet
          text={customText}
          onText={setCustomText}
          onClose={() => setSheet(null)}
          onSave={(words) => {
            g.setCustomWords(words);
            setSheet(null);
          }}
        />
      )}

      {sheet === "records" && <RecordsSheet onClose={() => setSheet(null)} />}
      {sheet === "tilt" && <TiltSheet onClose={() => setSheet(null)} />}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1">{label}</span>
      {children}
    </div>
  );
}

function CustomWordsSheet({
  text,
  onText,
  onClose,
  onSave,
}: {
  text: string;
  onText: (v: string) => void;
  onClose: () => void;
  onSave: (words: string[]) => void;
}) {
  const words = [...new Set(text.split("\n").map((s) => s.trim()).filter(Boolean))];

  return (
    <Sheet title="📝 Minhas palavras" onClose={onClose}>
      <p className="text-xs text-mutedc">
        Uma por linha. Elas entram como a categoria "Minhas palavras", em qualquer nível.
      </p>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={"Churrasco do tio\nAquela viagem\nO apelido do chefe"}
        className="bg-black/30 border border-gold/25 rounded-xl p-3 text-sm text-cardlight min-h-32 outline-none focus:border-gold"
      />
      <div className="text-[11px] text-mutedc">
        {words.length === 0
          ? "Nenhuma palavra ainda."
          : `${words.length} ${words.length === 1 ? "palavra" : "palavras"}`}
      </div>
      <div className="flex gap-2.5">
        <button className="flex-1 panel rounded-xl py-3.5 text-sm font-semibold" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="flex-1 bg-gold text-cardink rounded-xl py-3.5 text-sm font-bold"
          onClick={() => onSave(words)}
        >
          Salvar
        </button>
      </div>
    </Sheet>
  );
}

function RecordsSheet({ onClose }: { onClose: () => void }) {
  const clearRecords = useGame((s) => s.clearRecords);
  const [cleared, setCleared] = useState(false);
  const modes: Mode[] = ["total", "perword"];
  const levels: Level[] = ["facil", "medio", "dificil"];

  return (
    <Sheet title="🏆 Melhores pontuações" onClose={onClose}>
      {modes.map((m) =>
        levels.map((l) => (
          <div key={m + l} className="panel rounded-xl px-4 py-3 flex items-center text-sm">
            <span className="flex-1">
              {m === "total" ? "🏃 Corrida" : "⚡ Relâmpago"} · {LEVEL_LABELS[l]}
            </span>
            <span className="font-display tabular text-gold text-xl">
              {cleared ? "—" : getRecord(m, l) || "—"}
            </span>
          </div>
        ))
      )}
      <p className="text-[11px] text-mutedc">
        Um recorde por modo e nível. Partidas em times não contam.
      </p>
      <div className="flex gap-2.5">
        <button
          className="flex-1 panel rounded-xl py-3.5 text-sm font-semibold text-danger"
          onClick={() => {
            clearRecords();
            setCleared(true);
          }}
        >
          Apagar recordes
        </button>
        <button
          className="flex-1 bg-gold text-cardink rounded-xl py-3.5 text-sm font-bold"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </Sheet>
  );
}

function TiltSheet({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const beta = useLiveBeta(true);

  return (
    <Sheet title="🤳 Calibrar o modo testa" onClose={onClose}>
      <p className="text-xs text-mutedc">
        Segure o celular na testa, do jeito que vai jogar, e toque em calibrar. A partir daí,
        inclinar {TILT_HIT_DELTA}° pra baixo conta como acerto e {Math.abs(TILT_PASS_DELTA)}° pra
        cima pula.
      </p>

      <div className="panel rounded-xl py-6 flex flex-col items-center gap-1">
        <span className="text-[11px] uppercase tracking-[.24em] text-golddim">Ângulo agora</span>
        <span className="font-display tabular text-4xl text-gold">
          {beta === null ? "—" : `${beta}°`}
        </span>
        <span className="text-[11px] text-mutedc">
          Neutro calibrado: {Math.round(g.tiltBaseBeta)}°
        </span>
      </div>

      {beta === null && (
        <p className="text-[11px] text-mutedc">
          Sem leitura do sensor. Isso é esperado no computador — abra pelo celular para calibrar.
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          className="flex-1 panel rounded-xl py-3.5 text-sm font-semibold"
          onClick={() => g.resetTiltCalibration()}
        >
          Voltar ao padrão
        </button>
        <button
          disabled={beta === null}
          className="flex-1 bg-gold text-cardink rounded-xl py-3.5 text-sm font-bold disabled:opacity-40"
          onClick={() => {
            if (beta !== null) g.calibrateTilt(beta);
            onClose();
          }}
        >
          Calibrar
        </button>
      </div>
    </Sheet>
  );
}
