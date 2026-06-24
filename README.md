# Ingredient Matching Game

A Tamil-first ingredient puzzle game with full APM (Agent Package Manager) integration.

## Overview

Two game modes:
- **Mode 1** — Flip tiles to find and select all matching ingredients for a named dish
- **Mode 2** — Given a list of ingredients, type the dish name

30-second rounds, 5 rounds per game, three difficulty levels (Easy / Medium / Hard). Tamil Nadu dishes are featured prominently, weighted 3× in dish selection.

## Quick Start

```bash
npm install
npm run dev
```

Opens frontend at `http://localhost:5173`. Backend runs at `http://localhost:3002`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express + TypeScript |
| MCP Server | `@modelcontextprotocol/sdk` (stdio transport) |
| Skills | Pure CommonJS JS modules |
| Config | `apm.yml` + `apm-lock.yml` |

## APM Integration

All APM features are implemented:

- **Skills** (`skills/`) — 6 JS modules: `game-validator`, `ingredient-matcher`, `score-calculator`, `difficulty-scaler`, `dish-randomizer`, `cultural-tagger`
- **Prompts** (`prompts/`) — 5 Markdown templates with `{{variable}}` substitution
- **MCP Server** — 13 tools + 4 resources over stdio transport
- **Hooks** — pre/post skill and prompt hooks declared in `apm.yml`
- **Middleware** — rate-limiter and response-formatter
- **Dependency graph** — topological sort at startup, locked in `apm-lock.yml`
- **Runtime config** — node version, timeout, retries in `apm.yml`
- **Env vars** — declared in `apm.yml`, documented in `.env.example`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game/session` | Create game session |
| `POST` | `/api/game/round` | Start next round |
| `POST` | `/api/game/validate` | Submit answer |
| `POST` | `/api/game/reset` | Reset session |
| `POST` | `/api/game/scores` | Submit final score |
| `GET`  | `/api/game/scores` | Get leaderboard |
| `POST` | `/api/hint` | Get a hint (−10 pts) |
| `GET`  | `/api/hint/cultural/:dishId` | Get cultural context |
| `GET`  | `/api/apm/skills` | List loaded skills |
| `GET`  | `/api/apm/prompts` | List loaded prompts |

## Dish Dataset

38 dishes across three tiers:
- **Tamil Nadu** (~20 dishes) — Idli, Dosa, Sambar, Chettinad Chicken, Pongal, Rasam, Puliyodarai, Avial, Kozhukattai, Murukku, and more
- **Other South Indian** (~10 dishes) — Kerala Fish Curry, Hyderabadi Biryani, Pesarattu, Bisi Bele Bath, and more
- **International** (~8 dishes) — Pad Thai, Sushi, Pizza Margherita, and more

Each dish includes Tamil name (Tamil script), region, fun fact, difficulty, ingredients, and decoys.

## Testing

```bash
npm test              # all tests
npm test --workspace=backend    # backend only
npm test --workspace=frontend   # frontend only
```

## MCP Inspector

```bash
npx @modelcontextprotocol/inspector node mcp-server/src/index.js
```
