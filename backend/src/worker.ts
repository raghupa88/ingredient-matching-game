/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { v4 as uuidv4 } from 'uuid';

// Static skill imports — Workers cannot use fs or dynamic require()
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ingredientMatcher = require('../../skills/ingredient-matcher.js') as {
  normalizeIngredient: (s: string) => string;
  exactMatch: (a: string, b: string) => boolean;
  fuzzyMatch: (a: string, b: string) => { match: boolean; ratio: number };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gameValidator = require('../../skills/game-validator.js') as {
  validateIngredients: (selected: string[], correct: string[]) => { isCorrect: boolean; partialRatio: number; misses: string[]; extras: string[] };
  validateDishName: (answer: string, dishName: string) => { isCorrect: boolean; confidence: number };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const scoreCalculator = require('../../skills/score-calculator.js') as {
  calculateScore: (opts: { timeRemaining: number; difficulty: string; hintsUsed: number; partialRatio: number }) => number;
  applyPenalty: (score: number, penalty: number) => number;
  HINT_PENALTY: number;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const difficultyScaler = require('../../skills/difficulty-scaler.js') as {
  scaleTiles: (dish: DishRecord, difficulty: string) => Tile[];
  getDecoySet: (dish: DishRecord, difficulty: string) => string[];
  recommendDifficulty: (scores: number[]) => { recommendation: string; reason: string };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dishRandomizer = require('../../skills/dish-randomizer.js') as {
  pickRound: (dishes: DishRecord[], difficulty: string, usedDishIds: string[], sessionId: string) => DishRecord;
  resetHistory: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const culturalTagger = require('../../skills/cultural-tagger.js') as {
  getTag: (dish: DishRecord) => string;
  getTamilName: (dish: DishRecord) => string;
  getFunFact: (dish: DishRecord) => string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dishesData = require('./data/dishes.json') as DishRecord[];

// Suppress unused-variable warnings for skills not yet used in Worker routes
void ingredientMatcher;
void culturalTagger;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DishRecord {
  id: string;
  name: string;
  tamilName: string;
  region: string;
  funFact: string;
  ingredients: string[];
}

interface Tile { name: string; isCorrect: boolean; }

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 1 | 2;

interface Round {
  roundId: string;
  dishId: string;
  dishName: string;
  tamilName: string;
  region: string;
  funFact: string;
  mode: Mode;
  difficulty: Difficulty;
  tiles: Tile[];
  ingredientList: string[];
  correctIngredients: string[];
}

interface Session {
  sessionId: string;
  playerId: string;
  mode: Mode;
  difficulty: Difficulty;
  score: number;
  roundsPlayed: number;
  recentScores: number[];
  hintsUsed: number;
  usedDishIds: string[];
  currentRound: Round | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// WorkerApmLoader — statically wired, no fs/require at runtime
// ---------------------------------------------------------------------------

class WorkerApmLoader {
  private skillMap: Record<string, Record<string, (...args: unknown[]) => unknown>>;

  constructor() {
    this.skillMap = {
      'ingredient-matcher': ingredientMatcher as unknown as Record<string, (...args: unknown[]) => unknown>,
      'game-validator': gameValidator as unknown as Record<string, (...args: unknown[]) => unknown>,
      'score-calculator': scoreCalculator as unknown as Record<string, (...args: unknown[]) => unknown>,
      'difficulty-scaler': difficultyScaler as unknown as Record<string, (...args: unknown[]) => unknown>,
      'dish-randomizer': dishRandomizer as unknown as Record<string, (...args: unknown[]) => unknown>,
      'cultural-tagger': culturalTagger as unknown as Record<string, (...args: unknown[]) => unknown>,
    };
  }

  invokeSkill(skillName: string, methodName: string, ...args: unknown[]): unknown {
    const skill = this.skillMap[skillName];
    if (!skill) throw new Error(`Skill ${skillName} not registered`);
    const fn = skill[methodName];
    if (typeof fn !== 'function') throw new Error(`Export ${methodName} not found in skill ${skillName}`);
    return fn(...args);
  }

  listSkills(): { name: string; status: string }[] {
    return Object.keys(this.skillMap).map(name => ({ name, status: 'ready' }));
  }
}

const workerApm = new WorkerApmLoader();

// ---------------------------------------------------------------------------
// KV-backed session and leaderboard state
// Shared across all Worker instances via Cloudflare KV.
// ---------------------------------------------------------------------------

type LeaderboardEntry = { playerId: string; score: number; timestamp: string };

const SESSION_TTL = 3600; // seconds — KV TTL replaces manual eviction

async function getSession(sessionId: string, kv: KVNamespace): Promise<Session> {
  if (!sessionId) throw new Error('sessionId is required');
  const data = await kv.get<Session>(`session:${sessionId}`, 'json');
  if (!data) throw new Error('Session not found');
  return data;
}

async function putSession(session: Session, kv: KVNamespace): Promise<void> {
  await kv.put(`session:${session.sessionId}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
}

async function getLeaderboard(kv: KVNamespace): Promise<LeaderboardEntry[]> {
  return (await kv.get<LeaderboardEntry[]>('leaderboard', 'json')) ?? [];
}

async function putLeaderboard(leaderboard: LeaderboardEntry[], kv: KVNamespace): Promise<void> {
  await kv.put('leaderboard', JSON.stringify(leaderboard));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Discord notifications — uses native fetch() available in Workers
// ---------------------------------------------------------------------------

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

async function sendDiscordWebhook(webhookUrl: string, embeds: DiscordEmbed[], content?: string): Promise<void> {
  try {
    const body: { embeds: DiscordEmbed[]; content?: string } = { embeds };
    if (content) body.content = content;
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`[Discord] Webhook failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error('[Discord] Webhook error:', err);
  }
}

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

interface Env {
  ALLOWED_ORIGIN?: string;
  DISCORD_WEBHOOK_URL?: string;
  NODE_ENV?: string;
  GAME_KV: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const allowedOrigin = (c.env?.ALLOWED_ORIGIN as string | undefined) ?? '*';
  return cors({ origin: allowedOrigin })(c, next);
});

// POST /api/game/session
app.post('/api/game/session', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const VALID_MODES = new Set([1, 2]);
    const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
    const mode = Number(body.mode ?? 1) as Mode;
    const difficulty = (body.difficulty ?? 'easy') as Difficulty;
    if (!VALID_MODES.has(mode)) return c.json({ success: false, message: 'mode must be 1 or 2' }, 400);
    if (!VALID_DIFFICULTIES.has(difficulty)) return c.json({ success: false, message: 'difficulty must be easy, medium, or hard' }, 400);
    const playerId = String(body.playerId ?? 'anonymous').slice(0, 50);

    const session: Session = {
      sessionId: uuidv4(),
      playerId,
      mode,
      difficulty,
      score: 0,
      roundsPlayed: 0,
      recentScores: [],
      hintsUsed: 0,
      usedDishIds: [],
      currentRound: null,
      createdAt: Date.now(),
    };
    await putSession(session, c.env.GAME_KV);
    return c.json({ success: true, data: { sessionId: session.sessionId } });
  } catch (e) {
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

// POST /api/game/round
app.post('/api/game/round', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const { sessionId } = body;
    if (!sessionId) return c.json({ success: false, message: 'sessionId required' }, 400);
    const session = await getSession(String(sessionId), c.env.GAME_KV);

    const dish = workerApm.invokeSkill('dish-randomizer', 'pickRound',
      dishesData, session.difficulty, session.usedDishIds, session.sessionId,
    ) as DishRecord;
    session.usedDishIds.push(dish.id);

    const tiles = workerApm.invokeSkill('difficulty-scaler', 'scaleTiles', dish, session.difficulty) as Tile[];
    const correctIngredients = tiles.filter(t => t.isCorrect).map(t => t.name);

    const round: Round = {
      roundId: uuidv4(),
      dishId: dish.id,
      dishName: dish.name,
      tamilName: dish.tamilName,
      region: dish.region,
      funFact: dish.funFact,
      mode: session.mode,
      difficulty: session.difficulty,
      tiles,
      ingredientList: shuffle(tiles.map(t => t.name)),
      correctIngredients,
    };

    session.currentRound = round;
    await putSession(session, c.env.GAME_KV);
    return c.json({ success: true, data: round });
  } catch (e) {
    const status = e instanceof Error && e.message === 'Session not found' ? 404 : 500;
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, status);
  }
});

// POST /api/game/validate
app.post('/api/game/validate', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const { sessionId, answer, timeRemaining = 0 } = body;
    if (!sessionId) return c.json({ success: false, message: 'sessionId required' }, 400);
    if (answer === undefined || answer === null) return c.json({ success: false, message: 'answer required' }, 400);

    const session = await getSession(String(sessionId), c.env.GAME_KV);
    const round = session.currentRound;
    if (!round) return c.json({ success: false, message: 'No active round' }, 400);

    let isCorrect = false;
    let partialRatio = 0;
    let misses: string[] = [];
    let extras: string[] = [];

    if (round.mode === 1) {
      const selected = Array.isArray(answer) ? answer as string[] : [String(answer)];
      const result = workerApm.invokeSkill('game-validator', 'validateIngredients', selected, round.correctIngredients) as {
        isCorrect: boolean; partialRatio: number; misses: string[]; extras: string[];
      };
      isCorrect = result.isCorrect;
      partialRatio = result.partialRatio;
      misses = result.misses;
      extras = result.extras;
    } else {
      const result = workerApm.invokeSkill('game-validator', 'validateDishName', String(answer), round.dishName) as {
        isCorrect: boolean; confidence: number;
      };
      isCorrect = result.isCorrect;
      partialRatio = result.confidence;
    }

    const scoreGained = workerApm.invokeSkill('score-calculator', 'calculateScore', {
      timeRemaining: Math.max(0, Number(timeRemaining) || 0),
      difficulty: session.difficulty,
      hintsUsed: session.hintsUsed,
      partialRatio: isCorrect ? 1 : partialRatio,
    }) as number;

    if (isCorrect || partialRatio > 0.5) {
      session.score += scoreGained;
    }
    session.roundsPlayed++;
    session.recentScores.push(scoreGained);
    session.hintsUsed = 0;
    session.currentRound = null;
    await putSession(session, c.env.GAME_KV);

    const webhookUrl = c.env?.DISCORD_WEBHOOK_URL;
    if (webhookUrl && isCorrect && partialRatio >= 1) {
      c.executionCtx.waitUntil(sendDiscordWebhook(webhookUrl, [{
        title: '✨ Perfect Round!',
        description: `**${session.playerId}** identified all ingredients in **${round.dishName}** with a perfect score of **${scoreGained}**!`,
        color: 0x138808,
        footer: { text: 'Ingredient Matching Game 🍛' },
        timestamp: new Date().toISOString(),
      }]));
    }

    const feedback = isCorrect ? '✓ Correct!' : partialRatio > 0.5 ? 'Close! Partial credit awarded.' : '✗ Not quite!';
    return c.json({
      success: true,
      data: { isCorrect, scoreGained, totalScore: session.score, roundsPlayed: session.roundsPlayed, partialRatio, feedback, misses, extras, dishName: round.dishName, playerId: session.playerId },
    });
  } catch (e) {
    const status = e instanceof Error && e.message === 'Session not found' ? 404 : 500;
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, status);
  }
});

// POST /api/game/reset
app.post('/api/game/reset', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const { sessionId } = body;
    if (!sessionId) return c.json({ success: false, message: 'sessionId required' }, 400);
    const session = await getSession(String(sessionId), c.env.GAME_KV);
    session.score = 0;
    session.roundsPlayed = 0;
    session.recentScores = [];
    session.hintsUsed = 0;
    session.usedDishIds = [];
    session.currentRound = null;
    await putSession(session, c.env.GAME_KV);
    workerApm.invokeSkill('dish-randomizer', 'resetHistory', String(sessionId));
    return c.json({ success: true, data: { message: 'Session reset' } });
  } catch (e) {
    const status = e instanceof Error && e.message === 'Session not found' ? 404 : 500;
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, status);
  }
});

// POST /api/game/scores
app.post('/api/game/scores', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const { sessionId } = body;
    if (!sessionId) return c.json({ success: false, message: 'sessionId required' }, 400);
    const session = await getSession(String(sessionId), c.env.GAME_KV);
    const playerId = session.playerId.slice(0, 50);
    const { score } = session;
    const leaderboard = await getLeaderboard(c.env.GAME_KV);
    const existingIndex = leaderboard.findIndex(e => e.playerId === playerId);
    if (existingIndex !== -1) {
      if (score > leaderboard[existingIndex].score) leaderboard[existingIndex] = { playerId, score, timestamp: new Date().toISOString() };
    } else {
      leaderboard.push({ playerId, score, timestamp: new Date().toISOString() });
    }
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > 10) leaderboard.length = 10;
    await putLeaderboard(leaderboard, c.env.GAME_KV);
    const rankIndex = leaderboard.findIndex(e => e.playerId === playerId);
    const rank = rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1;

    const webhookUrl = c.env?.DISCORD_WEBHOOK_URL;
    if (webhookUrl) {
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
      c.executionCtx.waitUntil(sendDiscordWebhook(webhookUrl, [{
        title: `${medal} New Score — ${playerId}`,
        description: `**${score} points** submitted to the leaderboard`,
        color: rank <= 3 ? 0xFF9933 : 0x138808,
        fields: [{ name: 'Rank', value: String(rank), inline: true }, { name: 'Score', value: String(score), inline: true }],
        footer: { text: 'Ingredient Matching Game 🍛' },
        timestamp: new Date().toISOString(),
      }]));
    }

    return c.json({ success: true, data: { leaderboard } });
  } catch (e) {
    const status = e instanceof Error && e.message === 'Session not found' ? 404 : 500;
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, status);
  }
});

// GET /api/game/scores
app.get('/api/game/scores', async (c) => {
  const leaderboard = await getLeaderboard(c.env.GAME_KV);
  return c.json({ success: true, data: { leaderboard } });
});

// POST /api/hint
app.post('/api/hint', async (c) => {
  try {
    const body = await c.req.json() as Record<string, unknown>;
    const { sessionId } = body;
    if (!sessionId) return c.json({ success: false, message: 'sessionId required' }, 400);
    const session = await getSession(String(sessionId), c.env.GAME_KV);
    session.hintsUsed++;
    await putSession(session, c.env.GAME_KV);
    const round = session.currentRound;
    const dishName = round?.dishName ?? 'this dish';
    const hint = `Think about what gives ${dishName} its signature flavour.`;
    return c.json({ success: true, data: { hint, hintsUsed: session.hintsUsed, penaltyPoints: 10 } });
  } catch (e) {
    const status = e instanceof Error && e.message === 'Session not found' ? 404 : 500;
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, status);
  }
});

// GET /api/hint/cultural/:dishId
app.get('/api/hint/cultural/:dishId', (c) => {
  try {
    const { dishId } = c.req.param();
    const dish = dishesData.find(d => d.id === dishId);
    if (!dish) return c.json({ success: false, message: 'Dish not found' }, 404);
    return c.json({ success: true, data: { tamilName: dish.tamilName, region: dish.region, funFact: dish.funFact, prompt: '' } });
  } catch (e) {
    return c.json({ success: false, message: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

// GET /api/apm/skills
app.get('/api/apm/skills', (c) => {
  return c.json({ success: true, data: { skills: workerApm.listSkills() } });
});

export default app;
