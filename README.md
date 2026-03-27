# Crusade Command -- Army Builder

A simple Warhammer 40,000 army builder with Standard and Crusade modes. Build your army list, browse faction datasheets, and track crusade progression -- all from your phone.

Built by [Obelus Labs](https://github.com/Rocketshon).

## Features

- **Army Building** -- Standard mode for matched play lists, Crusade mode for narrative campaigns
- **Codex Browser** -- Browse datasheets for all factions with stats, weapons, and abilities
- **Crusade Tracking** -- XP, ranks, battle honours, and battle scars per unit
- **Rules Reference** -- Core rules, faction rules, stratagems, and enhancements
- **PWA** -- Installable, works offline, full-screen on mobile

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Vite
- **Hosting:** GitHub Pages

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

## Architecture

```
src/
  app/
    components/    # Shared UI components (BottomNav, WeaponStatTable, etc.)
    pages/         # Route-level page components
    routes.ts      # React Router route definitions
    App.tsx        # Root component with providers
  lib/
    ArmyContext.tsx # Army state management (units, mode, faction)
    factions.ts    # Faction metadata and ID mapping
    formatText.ts  # Text formatting utilities
  data/            # Auto-generated faction data (units, rules, general)
  types/           # TypeScript interfaces
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run unit and integration tests |
| `npm run lint` | Run ESLint |

## License

Private project. All rights reserved.

## Disclaimer

This is a fan-made tool for personal use. Warhammer 40,000 and all associated names, logos, and images are trademarks or registered trademarks of Games Workshop Ltd. This project is not affiliated with or endorsed by Games Workshop.

---

If this tool helped your crusade, consider giving it a star -- it helps others discover it.
