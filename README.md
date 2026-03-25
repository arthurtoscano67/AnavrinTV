# OnReel Platform Monorepo

Production-first Sui + Walrus + Seal video platform foundation.

## Workspaces
- `apps/web`: consumer client (wallet + playback UI)
- `apps/admin`: admin dashboard
- `services/api`: platform API and admin config plane
- `services/workflow`: queue orchestrator and retry engine
- `services/*`: specialized workers (media, walrus, chain, indexer, ads, payout, moderation, notifications)
- `packages/shared`: shared domain model + fee/override engine
- `packages/move/onreel_core`: Move modules for ownership, access, treasury, config
- `infra/db/migrations`: PostgreSQL schema

## Quick start
1. `npm install`
2. create DB and run migration SQL files in `infra/db/migrations`
3. run services:
   - `npm run dev:api`
   - `npm run dev:workflow`
   - `npm run dev:web`

## Rule precedence (deterministic)
`GLOBAL < CREATOR_TIER < CAMPAIGN < INDIVIDUAL < MANUAL < EMERGENCY`

All fee simulations and effective configuration responses include a resolution trace.
