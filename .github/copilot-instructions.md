# Ingredient Matching Game — Copilot Instructions

This is a Tamil-first ingredient puzzle game with full APM (Agent Package Manager) integration. Use this file as your context when suggesting code or reviewing changes.

## What this repo is

A monorepo with four npm workspaces:
- `frontend/` — React 18 + TypeScript + Vite (port 5173)
- `backend/` — Express + TypeScript (port 3002)
- `mcp-server/` — MCP server with 13 tools + 4 resources (stdio transport)
- `copilot-extension/` — VS Code extension registering Copilot Chat agents from `apm.yml`

AI agents are defined in `apm.yml` under the `agents:` key. Each agent uses Claude Code or Copilot as the LLM — no separate API key is needed. Skills in `skills/` are the MCP tool handlers agents call.

## Git workflow

- **Never suggest pushing directly to `main`.** Always suggest a feature branch + PR.
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes.

## Code standards to enforce in every suggestion

### Security
- Validate all inputs at API boundaries — return `400` for bad input before it reaches business logic.
- Never accept client-supplied scores on `/api/game/scores`. The server reads from session state.
- `sessionId` is required on all game routes — always check and return `400` if missing.
- CORS must stay restricted to known origins. Never suggest `app.use(cors())` with no arguments.
- No secrets in code. All sensitive values belong in `.env` (gitignored).
- Sanitize user strings: `playerId` is capped at 50 chars.

### TypeScript
- `strict: true` is on everywhere. Do not suggest disabling it.
- Prefer `unknown` over `any` for external data; narrow with type guards.
- All exported functions need explicit return types.

### Error handling
- All Express route handlers must use `try/catch` → `next(err)`.
- The global error handler in `backend/src/index.ts` formats all error responses. Do not return raw errors from route handlers.
- MCP tools must return `{ isError: true, content: [{ type: 'text', text: msg }] }` on failure.
- Frontend errors surface through `GameContext` error state, not alert() or console.error.

### Testing
- New skill functions → test in `skills/__tests__/` (Jest, plain JS).
- New backend routes → test in `backend/src/__tests__/` (Jest + supertest).
- New frontend state → test in `frontend/src/__tests__/` (Vitest + React Testing Library).
- Do not delete or weaken existing tests to make a change pass.

### API contract
- All responses: `{ success: boolean, data: T }` envelope.
- HTTP status: `400` bad input, `404` not found, `500` server error. Never `200` with an error body.
- `sessionId` must be in request body (POST), never in URL params or query strings.

### APM / skills rules
- Skills in `skills/` must be pure CommonJS with **zero external dependencies**.
- When adding a skill, declare it in `apm.yml` under `skills:` and update `apm-lock.yml`.
- When adding an agent, declare it in `apm.yml` under `agents:` and add the participant to `copilot-extension/package.json` → `contributes.chatParticipants`.
- Preserve the per-session history Map in `dish-randomizer.js` — do not replace with a module-level global.

### Performance & memory
- `evictStaleSessions()` in `gameService.ts` must run on every `createSession` — do not remove it.
- Do not add synchronous blocking calls to Express request handlers.
- Session TTL is 1 hour (`SESSION_TTL_MS = 3_600_000`). Do not shorten it without a reason.

### Tamil food priority
- Tamil Nadu dishes are weighted **3×** in `dish-randomizer.js`. Preserve this when adding new dishes.
- New dishes in `backend/src/data/dishes.json` must include `tamilName` (Tamil script), `region`, `funFact`, `ingredients[]`, and `decoys[]`.

### Dish data rules
- Every dish `id` must be **unique** — duplicates silently break the per-session history deduplication in `dish-randomizer.js`.
- `ingredients` lists the raw constituents of the dish (e.g. `"idli rice"` + `"urad dal"`, not `"idli batter"`).
- `decoys` are plausible-but-wrong ingredients that are mixed into the tile set in **both** game modes:
  - Mode 1 (Tile Flip): decoys appear as clickable tiles the player must avoid.
  - Mode 2 (Dish Guess): decoys are shown in the ingredient list alongside real ingredients, making the dish harder to identify.
- Decoys must never overlap with `ingredients` for the same dish.
- Decoy count shown per difficulty (controlled by `difficulty-scaler` skill): easy = 2, medium = 4, hard = 7.

### Constants — single source of truth
| Constant | Location |
|----------|----------|
| `TOTAL_ROUNDS = 5` | `frontend/src/types/game.ts` |
| `BASE_SCORE`, `HINT_PENALTY`, `TIME_BONUS_PER_SECOND` | `skills/score-calculator.js` |
| `FUZZY_THRESHOLD = 0.8` | `skills/game-validator.js` |
| `TAMIL_WEIGHT = 3` | `skills/dish-randomizer.js` |
| `SESSION_TTL_MS` | `backend/src/services/gameService.ts` |

Never duplicate these — import or reference the canonical location.

## Files that need updating together

When you change one, suggest updating the others:

| Change | Also update |
|--------|-------------|
| Add/rename agent in `apm.yml` | `apm-lock.yml`, `copilot-extension/package.json`, `CLAUDE.md` |
| Add/rename skill in `apm.yml` | `apm-lock.yml`, add test in `skills/__tests__/` |
| Add env var | `.env.example` |
| Change API response shape | Frontend `api.ts` types, integration tests |
| Change scoring formula | `skills/score-calculator.js` tests |
| Change port | `backend/src/index.ts`, `frontend/vite.config.ts`, `apm.yml` env section, `CLAUDE.md` |
