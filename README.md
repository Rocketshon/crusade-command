# Crusade Command

A real-time companion app for Warhammer 40,000 Crusade campaigns. Track rosters, log battles, manage requisitions, and run live combat with your friends — all from your phone.

Built by [Obelus Labs](https://github.com/Rocketshon).

## Features

- **Campaign Management** — Create/join campaigns with join codes, track rounds, manage supply limits
- **Roster Builder** — Add units from any faction, track XP, ranks, battle honours, and battle scars
- **Live Combat Tracker** — Unit-vs-unit engagement logging with weapon selection and dice roller
- **AI Battle Narrator** — Claude-powered narrative stories generated from combat logs
- **Requisition Store** — Spend RP on Crusade requisitions with eligibility checks
- **Hall of Fame** — Leaderboards, hero cards, faction win rates, campaign achievements
- **Campaign Map** — Hex-grid territory tracker for narrative campaigns
- **Faction Legacy** — Faction-specific trackers (World Eaters skulls, Death Guard plagues, etc.)
- **Rules Reference** — Full core rules, faction rules, and datasheets browser
- **Real-time Multiplayer** — Supabase-backed sync with offline-first architecture
- **PWA** — Installable, works offline, full-screen on mobile

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite
- **Backend:** Supabase (Auth, Postgres, Realtime, RLS)
- **Hosting:** GitHub Pages
- **AI:** Claude API (Haiku) for battle narratives

## Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start dev server
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `VITE_CLAUDE_API_KEY` | Anthropic API key (optional, for AI narrator) |

## Database Setup

Run the SQL migrations in `supabase/migrations/` in your Supabase SQL Editor, in order:
1. `001_create_tables.sql` — Core tables (profiles, campaigns, players, units, battles)
2. `002_add_feature_columns.sql` — Feature columns (status, agendas, combat_log, etc.)
3. `003_fix_rls_policies.sql` — Row Level Security policies

## Architecture

```
src/
  app/
    components/    # Shared UI components (BottomNav, DiceRoller, etc.)
    pages/         # Route-level page components
    routes.ts      # React Router route definitions
    App.tsx        # Root component with providers
  lib/
    hooks/         # Custom React hooks (useCampaignGuard, useSyncEffect, etc.)
    AuthContext.tsx # Supabase auth provider
    CrusadeContext.tsx # Campaign state management
    sync.ts        # Offline-first cloud sync engine
    realtime.ts    # Supabase Realtime subscriptions
    offlineQueue.ts # Offline mutation queue
    storage.ts     # localStorage abstraction
    combatEngine.ts # Dice math and combat resolution
    battleNarrator.ts # Claude API integration for stories
  data/            # Auto-generated faction data (units, rules, general)
  types/           # TypeScript interfaces
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run unit and integration tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run lint` | Run ESLint |
| `npm run audit:security` | Security scan |
| `npm run audit:bundle` | Bundle size check |

## Testing

- **99 unit/integration tests** via Vitest (combat engine, storage, sync, ranks, offline queue)
- **E2E tests** via Playwright (auth, campaign flows, rules browsing)
- **Coverage thresholds** enforced at 60% for branches, functions, lines, and statements

## CI/CD

GitHub Actions pipeline runs on every push to `main`:
1. Lint (ESLint)
2. Type check (tsc --noEmit)
3. Unit + integration tests with coverage
4. Production build
5. Bundle size check
6. Deploy to GitHub Pages

## Deployment

Deployed via GitHub Actions to GitHub Pages on push to `main`.

## Docs

- [API Contracts](docs/api-contracts.md) — Full database schema and sync protocol
- [Disaster Recovery](docs/disaster-recovery.md) — Backup and recovery procedures
- [Load Testing](docs/load-testing.md) — k6 configuration and Supabase limits

## License

Private project. All rights reserved.

## Disclaimer

This is a fan-made tool for personal use. Warhammer 40,000 and all associated names, logos, and images are trademarks or registered trademarks of Games Workshop Ltd. This project is not affiliated with or endorsed by Games Workshop.

---

If this tool helped your crusade, consider giving it a star — it helps others discover it.
