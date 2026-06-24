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
