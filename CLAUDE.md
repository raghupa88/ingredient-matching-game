# Ingredient Matching Game — CLAUDE.md

## Dev Setup

```bash
npm install          # installs all workspaces
npm run dev          # starts frontend (5173) + backend (3002)
npm test             # runs all workspace tests
npm run build:extension   # compiles the Copilot VS Code extension
```

## Ports

| Service     | Port |
|-------------|------|
| Frontend    | 5173 (Vite dev) |
| Backend     | 3002 |
| MCP Server  | stdio (no HTTP port) |

## Architecture

- **npm workspaces** monorepo: `frontend/`, `backend/`, `mcp-server/`, `copilot-extension/`
- **APM agents** declared in `apm.yml` — each is an AI model (Claude Code session or Copilot) with assigned MCP tools and a system prompt from `prompts/`
- **APM skills** live in `skills/` as pure CommonJS modules — these are the tool *handlers* agents call
- **APM prompts** live in `prompts/` as Markdown templates — used as agent `instructions`
- `apm.yml` is the single source of truth for agents, skills, prompts, and MCP server
- `backend/src/services/apmLoader.ts` resolves skill load order via topological sort
- `.mcp.json` — project-level MCP config read by Claude Code to auto-discover the game MCP server
- `copilot-extension/` — VS Code extension that reads `apm.yml` and registers each agent as a Copilot Chat participant

## Agent Architecture (True APM)

```
apm.yml agents
  └── Claude Code reads .mcp.json → discovers MCP server tools → acts as agent
  └── Copilot Chat reads copilot-extension/ → @hint-agent, @game-agent, etc.

Each agent:
  type: claude                        ← AI is Claude Code session or Copilot
  mcp_tools: [get_hint, ...]          ← which MCP tools it can call
  instructions: ./prompts/hint.md     ← system prompt / persona
  depends_on: [other-agent]           ← orchestration order
```

No separate `ANTHROPIC_API_KEY` needed — Claude Code or Copilot provides the LLM.

## Claude Code MCP Setup

`.mcp.json` at repo root is auto-read by Claude Code. After `npm run build --workspace=mcp-server`:
```bash
# Claude Code will discover ingredient-game MCP server automatically
# You can then ask Claude Code to act as any agent:
# "Act as hint-agent. Player has found rice and urad dal for Idli."
```

## Copilot Chat Agent Setup

```bash
npm run build:extension        # compile the extension
# In VS Code: Extensions → Install from VSIX → copilot-extension/
# Or press F5 in copilot-extension/ to launch Extension Development Host
```

Then in Copilot Chat:
```
@hint-agent give me a clue for the missing ingredient in Sambar
@cultural-agent what is the significance of Pongal in Tamil Nadu?
@game-agent start a new game on hard difficulty
@scoring-agent I got rice, urad dal, and salt — how did I do on Idli?
@difficulty-agent my last 3 scores were 80, 90, 75 — should I try easy?
```

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

---

## Production-Grade Standards

Every change in this repo must meet the following standards. These apply to all AI-assisted and human contributions equally.

### Git Workflow

- **Never push directly to `main`.** Always create a feature branch and open a PR.
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- PRs must pass all tests before merge. No force-pushes to main.

### Security

- **Input validation at every API boundary.** Use `400` for bad input, never let raw user strings reach business logic unchecked.
- **No secrets in code.** API keys, tokens, and credentials go in `.env` (gitignored). Use `.env.example` for documentation.
- **CORS is restricted** to known origins (`localhost:5173`, `localhost:4173`). Never revert to `cors()` with no arguments.
- **No client-supplied scores** accepted on `/api/game/scores`. Always use server-tracked session score.
- **`sessionId` required** on every game route — return 400 immediately if missing.
- Sanitize and clamp all user strings (e.g. `playerId` capped at 50 chars).
- Do not log sensitive fields (session tokens, player PII) to console in production.

### Error Handling

- All Express routes must be wrapped in `try/catch` and call `next(err)` on failure.
- The global error handler in `backend/src/index.ts` is the single place that formats error responses — do not return raw error objects from route handlers.
- Frontend must never show raw stack traces to the user. Use the `error` state in `GameContext` to render human-readable messages.
- MCP tools must catch all exceptions and return `{ isError: true, content: [...] }` — never let an unhandled throw escape a tool handler.

### TypeScript

- `strict: true` is enabled in all `tsconfig.json` files — do not disable it.
- No `any` unless absolutely unavoidable, and always with a comment explaining why.
- All public function signatures must have explicit return types.
- Prefer `unknown` over `any` for external/unvalidated data, then narrow with type guards.

### Testing

- Every new skill function needs a corresponding test in `skills/__tests__/`.
- Every new backend route needs at least one happy-path and one sad-path integration test in `backend/src/__tests__/`.
- Frontend state changes must be covered by `GameContext` reducer tests.
- Do not delete or weaken existing tests to make a change pass — fix the code instead.
- Target: all 118 existing tests must remain green on every PR.

### Code Style

- No comments that describe *what* code does — only *why* when non-obvious.
- No `console.log` left in production paths. Use structured logging or remove before PR.
- Keep constants in one place: game constants in `frontend/src/types/game.ts`, scoring constants in `skills/score-calculator.js`. Do not duplicate them.
- APM skill files must remain pure CommonJS with zero external dependencies.

### API Design

- All responses follow the `{ success: boolean, data: T }` envelope — do not break this contract.
- HTTP status codes must be correct: `400` for bad input, `404` for not found, `500` for server errors. Never return `200` with an error body.
- `sessionId` must never be in query params or URL paths — always in the request body (POST) to avoid logging in access logs.

### Performance

- Session eviction (`evictStaleSessions`) runs on every `createSession` call. Do not remove it — it prevents unbounded memory growth.
- Dish randomizer uses per-session history (`sessionHistories` Map), not a global Set. Preserving this prevents cross-session contamination.
- Do not add synchronous blocking operations to request handlers.

### Dependency Management

- Run `npm audit` before merging any PR that adds or upgrades a dependency.
- Skills in `skills/` must have **zero runtime dependencies** — they are loaded dynamically and must be self-contained.
- MCP server dependencies must stay minimal — only `@modelcontextprotocol/sdk` and `uuid`.

### Documentation

- Keep `CLAUDE.md` updated whenever architecture changes — it is the AI context file.
- Keep `.github/copilot-instructions.md` in sync with `CLAUDE.md` for Copilot Chat.
- Update `apm-lock.yml` when agents or skills are added or their dependencies change.
- Update `.env.example` when new env vars are introduced.
