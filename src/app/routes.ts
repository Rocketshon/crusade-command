import { createBrowserRouter, redirect } from 'react-router';
import AppLayout from './components/AppLayout';
import ArmyBuilder from './pages/ArmyBuilder';
import ArmyCrusadeSetup from './pages/ArmyCrusadeSetup';
import ArmyUnitDetail from './pages/ArmyUnitDetail';
import PostBattle from './pages/PostBattle';
import BattleHistory from './pages/BattleHistory';
import ModeSelect from './pages/ModeSelect';
import MyModels from './pages/MyModels';
import CodexHome from './pages/CodexHome';
import FactionCodex from './pages/FactionCodex';
import DatasheetView from './pages/DatasheetView';
import SpaceMarinesChapters from './pages/SpaceMarinesChapters';
import PhaseNavigator from './pages/PhaseNavigator';
import RulesBrowser from './pages/RulesBrowser';
import RuleDetail from './pages/RuleDetail';
import Settings from './pages/Settings';
import News from './pages/News';
import DiceCalculator from './pages/DiceCalculator';
import LoreQuiz from './pages/LoreQuiz';

const base = import.meta.env.BASE_URL;

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, loader: () => redirect("/army") },
      // Mode picker
      { path: "mode-select", Component: ModeSelect },
      // Army
      { path: "army", Component: ArmyBuilder },
      { path: "army/crusade-setup", Component: ArmyCrusadeSetup },
      { path: "army/unit/:unitId", Component: ArmyUnitDetail },
      { path: "army/post-battle", Component: PostBattle },
      { path: "army/history", Component: BattleHistory },
      // My Models (collection)
      { path: "models", Component: MyModels },
      // Battle Aid
      { path: "battle-aid", Component: PhaseNavigator },
      // Codex
      { path: "codex", Component: CodexHome },
      { path: "codex/:factionId", Component: FactionCodex },
      { path: "datasheet/:factionId/:datasheetName", Component: DatasheetView },
      { path: "space-marines-chapters", Component: SpaceMarinesChapters },
      // Rules
      { path: "rules", Component: RulesBrowser },
      { path: "rule/:ruleId", Component: RuleDetail },
      // News / Tools
      { path: "news", Component: News },
      { path: "dice-calculator", Component: DiceCalculator },
      { path: "lore-quiz", Component: LoreQuiz },
      // Settings
      { path: "settings", Component: Settings },
      // 404
      { path: "*", lazy: () => import('./pages/NotFound').then(m => ({ Component: m.default })) },
    ],
  },
], { basename: base });
