import { createBrowserRouter } from "react-router";
import AppLayout from "./components/AppLayout";
import CampaignHub from "./pages/CampaignHub";
import CampaignHubActive from "./pages/CampaignHubActive";
import PlayerDetail from "./pages/PlayerDetail";
import LogBattle from "./pages/LogBattle";
import CreateCampaign from "./pages/CreateCampaign";
import JoinCampaign from "./pages/JoinCampaign";
import Roster from "./pages/Roster";
import AddUnit from "./pages/AddUnit";
import UnitDetail from "./pages/UnitDetail";
import RulesBrowser from "./pages/RulesBrowser";
import RuleDetail from "./pages/RuleDetail";
import CodexHome from "./pages/CodexHome";
import SpaceMarinesChapters from "./pages/SpaceMarinesChapters";
import FactionCodex from "./pages/FactionCodex";
import DatasheetView from "./pages/DatasheetView";
import GameTracker from "./pages/GameTracker";
import Settings from "./pages/Settings";
import CampaignHistory from "./pages/CampaignHistory";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import PostBattleWizard from "./pages/PostBattleWizard";
import RequisitionSpending from "./pages/RequisitionSpending";
import RequisitionStore from "./pages/RequisitionStore";
import BattleDetail from "./pages/BattleDetail";
import TacticalCheatSheet from "./pages/TacticalCheatSheet";
import HallOfFame from "./pages/HallOfFame";
import CampaignMap from "./pages/CampaignMap";
import BattleLobby from "./pages/BattleLobby";
import CombatTracker from "./pages/CombatTracker";
import { redirect } from "react-router";
import { loadUser } from "../lib/storage";

// Detect GitHub Pages base path from Vite's import.meta.env.BASE_URL
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    // All pages wrapped in AppLayout (includes bottom nav + splash overlay)
    {
      Component: AppLayout,
      children: [
        // Root redirects based on auth state
        { path: "/", loader: () => redirect(loadUser() ? "/home" : "/sign-in") },
        // Campaign
        { path: "/home", Component: CampaignHub },
        { path: "/sign-up", Component: SignUp },
        { path: "/sign-in", Component: SignIn },
        { path: "/campaign/active", Component: CampaignHubActive },
        { path: "/create-campaign", Component: CreateCampaign },
        { path: "/join-campaign", Component: JoinCampaign },
        { path: "/player/:playerId", Component: PlayerDetail },
        { path: "/log-battle", Component: LogBattle },
        { path: "/post-battle", Component: PostBattleWizard },
        { path: "/battle/:id", Component: BattleDetail },
        { path: "/requisition", Component: RequisitionSpending },
        { path: "/requisition-store", Component: RequisitionStore },
        { path: "/roster", Component: Roster },
        { path: "/add-unit", Component: AddUnit },
        { path: "/unit/:unitId", Component: UnitDetail },
        { path: "/cheat-sheet", Component: TacticalCheatSheet },
        // Codex (browse any faction — no campaign required)
        { path: "/codex", Component: CodexHome },
        { path: "/space-marines-chapters", Component: SpaceMarinesChapters },
        { path: "/codex/:factionId", Component: FactionCodex },
        { path: "/datasheet/:factionId/:datasheetName", Component: DatasheetView },
        // Rules (no campaign required)
        { path: "/rules", Component: RulesBrowser },
        { path: "/rule/:ruleId", Component: RuleDetail },
        // Game Tracker (standalone, no campaign required)
        { path: "/tracker", Component: GameTracker },
        // Settings
        { path: "/settings", Component: Settings },
        { path: "/campaign-history", Component: CampaignHistory },
        { path: "/hall-of-fame", Component: HallOfFame },
        { path: "/campaign-map", Component: CampaignMap },
        { path: "/battle-lobby", Component: BattleLobby },
        { path: "/battle-live/:opponentId", Component: CombatTracker },
        { path: "*", lazy: () => import('./pages/NotFound').then(m => ({ Component: m.default })) },
      ],
    },
  ],
  { basename }
);
