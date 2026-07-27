import { Analytics } from "@vercel/analytics/react";
import { useGame } from "./store/gameStore";
import HomeScreen from "./screens/HomeScreen";
import ReadyScreen from "./screens/ReadyScreen";
import GameScreen from "./screens/GameScreen";
import ResultsScreen from "./screens/ResultsScreen";
import ChampionScreen from "./screens/ChampionScreen";
import OnboardingOverlay from "./screens/OnboardingOverlay";

export default function App() {
  const screen = useGame((s) => s.screen);
  const showOnboarding = useGame((s) => s.showOnboarding);

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{ height: "100dvh" }}>
      {screen === "home" && <HomeScreen />}
      {screen === "ready" && <ReadyScreen />}
      {screen === "game" && <GameScreen />}
      {screen === "results" && <ResultsScreen />}
      {screen === "champion" && <ChampionScreen />}
      {showOnboarding && screen === "home" && <OnboardingOverlay />}
      <Analytics />
    </div>
  );
}
