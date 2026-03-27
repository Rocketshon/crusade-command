# Changelog

All notable changes to Warcaster are documented here.

---

## Round 12 — Adversarial Hardening (2026-03-25)
**12 bugs fixed**

### Button Spam Prevention
- **CreateCampaign**: `isSubmitting` guard prevents double-tap creating two campaigns
- **JoinCampaign**: `isJoining` guard prevents duplicate player rows on double-tap
- **PostBattleWizard**: `useRef` guard prevents double XP/RP award on rapid tap (React state was stale)
- **DatasheetView**: Add to Roster button disabled during success toast
- **DiceRoller**: `useRef` guard prevents overlapping interval/timeout pairs on mash

### Data Integrity
- **LogBattle**: Negative VP scores clamped to 0 with `Math.max(0, ...)`
- **sync.ts**: Local data captured BEFORE cloud overwrite in `syncAll` — prevents data loss on two-tab race
- **CrusadeContext**: `addUnit` moved `setUnits` out of `setCurrentPlayer` updater — React Strict Mode safe
- **BattleLobby/CombatTracker**: Guards undefined `battleId`, prevents writing engagements to wrong battle

### Feature Flag Route Gating
- CampaignMap, HallOfFame, BattleLobby, RequisitionStore redirect to `/home` when flag is disabled

### Input Validation
- CreateCampaign: supply limit clamped to `[1, 9999]`, included in `isFormValid`

---

## Round 11 — Combat Math + Player Lifecycle (2026-03-25)
**5 bugs fixed**

- **CombatTracker**: LETHAL HITS crits no longer double-counted in step-by-step wound rolls
- **CrusadeContext**: `crusade_points` now scales with XP gained (was always +1)
- **CrusadeContext**: `removePlayer` now purges that player's units from local state
- **sync.ts**: `.single()` → `.maybeSingle()` on campaign fetch for RLS safety
- **PostBattleWizard**: Battle recap shows correct XP values on re-entry
- **sync.test.ts**: Updated mock for `.maybeSingle()` change

---

## Round 10 — Type Safety + Feature Flags + Game Rules (2026-03-25)
**7 bugs fixed**

- **Roster, AddUnit, CampaignHubActive, UnitDetail**: `useCampaignGuard` destructured with proper discriminated union narrowing
- **AddUnit**: Ternary removed from `useMemo` dependency array (null crash risk)
- **Roster**: Empty-state container got `pb-24`
- **Feature flags**: Wired `isFeatureEnabled()` to 6 features (toggleable from Settings dev panel)
- **combatEngine**: DEVASTATING WOUNDS implemented — critical wound 6s bypass saves
- **BattleDetail**: Nested `.map()` → `.flatMap()` (fixes React key warnings)
- **offlineQueue**: Removed `console.log` from production hot paths

---

## Round 9 — Rules of Hooks + iOS Keyboard (2026-03-25)
**6 bugs fixed**

- **AddUnit**: `useMemo` hooks moved above early return (was crashing on second render)
- **11 files**: Added `inputMode="numeric"` to all number inputs (iOS shows number pad)
- **sync.ts**: `migrateLocalData` no longer mutates objects or saves locally before cloud confirms
- **RequisitionSpending**: RP deducted only after scar is actually removed
- **BattleDetail**: Story localStorage pruned to 20 most recent, cleared on campaign leave
- **PostBattleWizard**: Direct cloud push after `applyChanges` prevents data loss on quick navigation

---

## Round 8 — Logic Bugs + Mobile Padding (2026-03-25)
**22 bugs fixed**

### Logic (8)
- **LogBattle**: `isSubmitting` reset in `finally` block (no more bricked forms)
- **CrusadeContext**: `spendRequisition` uses ref to eliminate TOCTOU double-spend
- **CampaignMap**: In-flight guard prevents duplicate territory creation
- **useRealtimeSubscription**: `playerIds` read at callback time, not subscribe time
- **QuickDiceRoller**: `crypto.randomUUID()` replaces module-level counter
- **PostBattleWizard**: `sessionStorage` guard written before state update
- **CombatTracker**: Uses specific `battleId` from nav state, not `battles[0]`
- **BattleLobby**: Passes `battleId` in navigation state

### Mobile (14 pages)
- Added `pb-24` to: AddUnit, BattleDetail, CampaignHistory, CampaignHub, CreateCampaign, GameTracker, JoinCampaign, PostBattleWizard, QuickBattle, QuickDiceRoller, RequisitionSpending, RuleDetail, Settings, SpaceMarinesChapters

---

## Convention-Day Polish (2026-03-25)
**8 critical bugs + Regular Mode feature**

### Bug Fixes
- **AuthContext**: 10-second timeout on sign-in for slow WiFi + toast confirmation
- **JoinCampaign**: Helper text shows which field is missing when button is disabled
- **DatasheetView**: `alert()` replaced with `toast.error()`
- **LogBattle**: Auto-saves form draft to `sessionStorage`
- **LogBattle**: Agenda validation (2 required, or skip for casual games)
- **PostBattleWizard**: Step 4 warns "Confirm & Apply Changes" with amber text
- **CampaignHubActive**: All Battles / My Battles toggle on recent battles feed
- **CrusadeContext**: `crusade_points` increments on battle participation

### New Feature
- **Quick Battle Mode**: Non-Crusade hub with faction picker, standalone dice roller, access to datasheets/rules/tracker

---

## Enterprise Infrastructure (2026-03-25)
**17 enterprise items**

- GitHub Actions CI pipeline (lint → typecheck → test → build → deploy)
- Code coverage with `@vitest/coverage-v8` and thresholds
- Integration tests for campaign lifecycle and sync layer
- Playwright E2E test setup (auth, campaign, rules specs)
- Security audit script (npm audit + secret scan)
- Performance budget (bundle size check, 1500KB JS limit)
- CSP headers via meta tag
- CODEOWNERS file
- Feature flags (8 toggles, backed by localStorage)
- Telemetry (local event/session tracking, 500 event cap)
- Error monitoring (`captureException` + global handlers)
- Developer tools panel in Settings
- i18n framework (react-i18next + English locale)
- Component catalog at `/dev/components`
- API contracts documentation
- Disaster recovery documentation
- Load testing config (k6)

---

## Round 7 — Sync + Navigation + Lifecycle (2026-03-25)
**7 bugs fixed**

- **PostBattleWizard**: Rules of Hooks violation — hooks moved above early return
- **CrusadeContext**: `joinCampaign` replaces players with cloud data instead of appending to stale list
- **useRealtimeSubscription**: Battle UPDATE events now handled (was INSERT only)
- **LogBattle**: External opponent toggle when campaign has other players
- **useCampaignGuard**: 500ms delay before redirect for cloud pull to complete
- **PlayerDetail**: `supply_used` uses `player.supply_used` for other profiles
- **offlineQueue**: Cleanup resilience improved

---

## Round 6 — Combat Log + Feature Completeness (2026-03-25)
**10 bugs fixed**

- **RequisitionStore**: "Increase Supply Limit" now actually updates `supply_limit`
- **PostBattleWizard**: Bound to specific battle ID via navigation state
- **CombatTracker**: Combat log engagements now persisted to `Battle.combat_log`
- **CombatTracker**: Guard when current player has zero units
- **CrusadeContext**: `awardXP` no longer increments `battles_survived` for destroyed units
- **RequisitionStore**: History scoped per campaign ID
- **BottomNav**: `/hall-of-fame` and `/campaign-map` highlight Campaign tab
- **Settings**: Sign out clears localStorage campaign state
- **LogBattle**: Duplicate validation block removed
- **CampaignMap**: Error state with retry button on Supabase failure

---

## Round 5 — Realtime + Sync + PWA (2026-03-25)
**10 bugs fixed**

- **CrusadeContext**: Realtime subscription uses `playerIdsRef` — no more churn on player state change
- **sync.ts**: `status` and `faction_legacy` fields now synced to Supabase
- **sw.js**: MP4 removed from cache-first regex (videos update on deploy)
- **offlineQueue**: `initOfflineQueue` returns cleanup function
- **manifest.json**: `start_url` and `scope` set to `/crusade-command/`
- **sync.ts**: `agendas` and `combat_log` now pushed to Supabase
- **PlayerDetail**: Duplicate `getResultLabel` removed, uses shared export
- **FactionPickerDemo**: Dead file deleted
- **Settings**: `updateUsername` wired through AuthContext
- **PWA icons**: PNG icons generated, apple-touch-icon added

---

## Round 4 — Battle Flow + UI (2026-03-24)
**11 bugs fixed**

- **CrusadeContext**: `battles_played` and `battles_survived` now increment on units
- **LogBattle**: Opponent deselect clears stale `opponentName`
- **BattleDetail**: XP label changed to "Current XP" (not snapshot)
- **5 pages**: `pb-8` → `pb-24` (LogBattle, PlayerDetail, CodexHome, FactionCodex, RulesBrowser)
- **BattleLobby**: "No opponents" message for solo campaigns
- **Settings**: Profile name save wired to Supabase + AuthContext
- **CampaignHubActive**: Clipboard failure shows toast error
- **PostBattleWizard**: Absolute dropdowns changed to `overflow-y-visible`
- **PlayerDetail**: Added `relative` to unit card div for gradient accent line

---

## Round 3 — Auth + Data + Performance (2026-03-24)
**13 bugs fixed**

- **AuthContext**: Username UNIQUE constraint handling, duplicate profile error code `23505`
- **realtime.ts**: Unit subscription filters by `playerIds` (was receiving ALL campaigns)
- **sync.ts**: Eliminated double round-trip to `cc_campaign_players`
- **CombatTracker**: `parseDiceString` for variable attack counts ("D6", "2D6+1")
- **RequisitionStore**: RP deducted only after scar picker completes
- **CombatTracker**: Helpful message + refresh when opponent units haven't synced
- **HallOfFame**: Static `factionBgColors` map replaces dynamic Tailwind purge issue
- **CampaignMap**: `isSupabaseConfigured()` guard on direct Supabase calls
- **offlineQueue**: `break` on first failure preserves mutation ordering
- **battleNarrator**: Security warning comment about client-exposed API key
- **DiceRoller**: Timer cleanup refs on unmount
- **PostBattleWizard**: Fallback `fieldedUnits` filtered to current player only
- **PostBattleWizard**: RP not awarded — added `awardRequisition(1)` for wins

---

## Round 2 — Navigation + Forms + Lifecycle (2026-03-24)
**10 bugs fixed**

- **Roster**: Unit list filtered by `player_id` (was showing all players' units)
- **PostBattleWizard**: `changesApplied` guard with `sessionStorage` for back-nav protection
- **routes.ts**: Added `*` catch-all 404 route
- **CampaignHubActive**: Recent battles filtered to current player
- **JoinCampaign**: Guard against joining when already in a campaign
- **PostBattleWizard**: Campaign guard added (unprotected route)
- **LogBattle**: Submit-disable guard on rapid tap
- **CreateCampaign**: `min={1}` validation on supply limit
- **EditRoster**: Dead file identified
- **SignIn/SignUp**: "Coming soon" OAuth buttons noted

---

## Round 1 — Core Bugs (2026-03-24)
**15 bugs fixed**

- **CrusadeContext**: `spendRequisition` side-effect in state updater — unreliable return value
- **PostBattleWizard**: RP reward displayed but never actually awarded
- **PlayerDetail**: Shows all units instead of viewed player's units
- **CrusadeContext**: `supply_used` desyncs from actual unit list
- **PostBattleWizard**: XP calculation uses stale unit data from mount time
- **DatasheetView**: "Add to Roster" always shows success even without campaign
- **Settings**: Clipboard write success shown before Promise resolves
- **AppLayout**: Stale closure in splash timeout calls `onDone` twice
- **Roster**: Supply bar sums all units, not filtered by current player
- **FactionCodex**: `Math.random()` in render causing position jumps
- **ranks.ts**: Duplicate `formatRecord` with incompatible signature
- **AppLayout**: BottomNav renders during splash screen
- **CrusadeContext**: Nested `setCurrentPlayer` inside `setCampaign` updater

---

## 15 Major Features (2026-03-24)

1. **Needs Attention Badges** — Amber alerts on campaign dashboard, roster, and bottom nav
2. **Unit Status System** — Ready/scarred/recovering/destroyed with color-coded dots + filter chips
3. **Sticky Supply Meter** — Color thresholds (green/amber/red) on roster page
4. **Expandable Roster Cards** — XP bars, honour/scar chips, tap-to-expand
5. **Campaign Master Controls** — Supply/RP adjustment, advance round, announcements, remove players
6. **Agenda Selection** — 8 standard Crusade agendas, 2-pick, skip for casual
7. **Requisition Store** — 9 requisitions with eligibility checks, spend confirmation, transaction history
8. **Hall of Fame** — Hero cards, player leaderboard, faction win rates, achievements
9. **Faction Legacy** — World Eaters skulls, Death Guard plagues, Grey Knights grid, and more
10. **Campaign Map** — Hex-grid territory tracker with CM controls
11. **Battle Lobby** — See all campaign players and their armies
12. **Live Combat Tracker** — Unit-vs-unit, weapon selection, combat resolution
13. **Dice Roller** — 3D animated digital mode + manual entry mode
14. **Combat Log** — Engagement feed with damage tracking
15. **AI Battle Narrator** — Claude Haiku generates Black Library-style battle stories

---

## Supabase Backend (2026-03-24)

- Real authentication (username-based, Supabase Auth)
- Cloud persistence (campaigns, players, units, battles)
- Real-time multiplayer (Supabase Realtime subscriptions)
- Offline-first with sync queue
- Cross-device campaign joining via join codes

---

## Data Quality (2026-03-23 – 2026-03-24)

- 788 data fixes across 25 factions (weapon names, keywords, ability text)
- 90 aircraft stats added
- 1,188 Haiku-audited issues addressed
- Sonnet-processed all rules text with section headers
- Core rules converted to clickable accordion dropdowns
- All boarding actions and crusade rules re-scraped from source data

---

## Initial Release (2026-03-09)

- Full Warhammer 40K Crusade campaign manager
- 25 factions with datasheets, rules, detachments
- Campaign creation and management
- Unit roster tracking (XP, honours, scars, ranks)
- Battle logging with post-battle wizard
- Core rules and faction rules browser
- PWA with offline support
- Dark theme (Battle Forge-inspired)
