import { createBrowserRouter, redirect } from 'react-router';
import AppLayout from './components/AppLayout';
import Home from './pages/Home';
import Army from './pages/Army';
import AddUnit from './pages/AddUnit';
import UnitDetail from './pages/UnitDetail';
import CodexHome from './pages/CodexHome';
import FactionCodex from './pages/FactionCodex';
import DatasheetView from './pages/DatasheetView';
import SpaceMarinesChapters from './pages/SpaceMarinesChapters';
import RulesBrowser from './pages/RulesBrowser';
import RuleDetail from './pages/RuleDetail';
import PhaseNavigator from './pages/PhaseNavigator';

const base = import.meta.env.GITHUB_PAGES ? '/crusade-command/' : '/';

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, loader: () => redirect("/home") },
      { path: "home", Component: Home },
      { path: "army", Component: Army },
      { path: "add-unit", Component: AddUnit },
      { path: "unit/:unitId", Component: UnitDetail },
      { path: "codex", Component: CodexHome },
      { path: "codex/:factionId", Component: FactionCodex },
      { path: "datasheet/:factionId/:datasheetName", Component: DatasheetView },
      { path: "space-marines-chapters", Component: SpaceMarinesChapters },
      { path: "battle-aid", Component: PhaseNavigator },
      { path: "rules", Component: RulesBrowser },
      { path: "rule/:ruleId", Component: RuleDetail },
      { path: "*", lazy: () => import('./pages/NotFound').then(m => ({ Component: m.default })) },
    ],
  },
], { basename: base });
