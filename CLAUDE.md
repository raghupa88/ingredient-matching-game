# Ingredient Matching Game — CLAUDE.md

## Dev Setup

```bash
npm install          # installs all workspaces
npm run dev          # starts frontend (5173) + backend (3002)
npm test             # runs all workspace tests
```

## Ports

| Service     | Port |
|-------------|------|
| Frontend    | 5173 (Vite dev) |
| Backend     | 3002 |
| MCP Server  | stdio (no HTTP port) |

## Architecture

- **npm workspaces** monorepo: `frontend/`, `backend/`, `mcp-server/`
- **APM skills** live in `skills/` as pure CommonJS modules
- **APM prompts** live in `prompts/` as Markdown templates with `{{variable}}` syntax
- `apm.yml` declares all skills, prompts, hooks, middleware, and env vars
- `backend/src/services/apmLoader.ts` resolves skill load order via topological sort

## APM Skill Load Order

As declared in `apm-lock.yml`:
1. `ingredient-matcher` (no deps)
2. `score-calculator` (no deps)
3. `cultural-tagger` (no deps)
4. `dish-randomizer` (no deps)
5. `game-validator` (depends on `ingredient-matcher`)
6. `difficulty-scaler` (depends on `score-calculator`)

## Tamil Food Priority

Tamil Nadu dishes are weighted **3×** in dish-randomizer. Region field "Tamil Nadu" triggers this weight. Other South Indian dishes are weight 1.

## MCP Tools (13)

`start_game`, `validate_answer`, `reset_game`, `get_hint`, `get_cultural_context`, `update_score`, `get_leaderboard`, `get_player_stats`, `get_dish_info`, `list_dishes`, `random_dish`, `adjust_difficulty`, `get_difficulty_recommendation`

## MCP Resources (4)

`game://session/{id}`, `game://leaderboard`, `game://dishes`, `game://stats/{playerId}`

## Scoring

- Base: 100 pts
- Time bonus: `timeRemaining × 2`
- Difficulty multiplier: easy×1, medium×1.5, hard×2
- Hint penalty: −10 pts per hint
- Partial credit (>50% match): up to 50% of full score

## Session TTL

Sessions expire after 1 hour. Eviction runs on every new session creation.

## Key Constraints

- Never use client-supplied scores for leaderboard — always use server-tracked session score
- `sessionId` is required on all game routes (400 if missing)
- Fuzzy match threshold for ingredient credit: 80% Levenshtein similarity
- Dish randomizer uses per-session history (not a global singleton)
