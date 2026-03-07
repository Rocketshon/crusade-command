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
import Settings from "./pages/Settings";
import CampaignHistory from "./pages/CampaignHistory";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import PostBattleWizard from "./pages/PostBattleWizard";
import RequisitionSpending from "./pages/RequisitionSpending";
import BattleDetail from "./pages/BattleDetail";
import Splash from "./pages/Splash";

// Detect GitHub Pages base path from Vite's import.meta.env.BASE_URL
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    // Splash screen — no nav bar
    { path: "/", Component: Splash },

    // All other pages wrapped in AppLayout (includes bottom nav)
    {
      Component: AppLayout,
      children: [
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
        { path: "/roster", Component: Roster },
        { path: "/add-unit", Component: AddUnit },
        { path: "/unit/:unitId", Component: UnitDetail },
        // Codex (browse any faction — no campaign required)
        { path: "/codex", Component: CodexHome },
        { path: "/space-marines-chapters", Component: SpaceMarinesChapters },
        { path: "/codex/:factionId", Component: FactionCodex },
        { path: "/datasheet/:factionId/:datasheetName", Component: DatasheetView },
        // Rules (no campaign required)
        { path: "/rules", Component: RulesBrowser },
        { path: "/rule/:ruleId", Component: RuleDetail },
        // Settings
        { path: "/settings", Component: Settings },
        { path: "/campaign-history", Component: CampaignHistory },
      ],
    },
  ],
  { basename }
);
