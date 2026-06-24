import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ── In-memory state ──────────────────────────────────────────────────────────

interface Dish {
  id: string; name: string; tamilName: string; region: string; difficulty: string;
  funFact: string; ingredients: string[]; decoys: string[];
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const dishes: Dish[] = require('../../backend/src/data/dishes.json');

interface GameSession {
  id: string; playerId: string; mode: number; difficulty: string;
  score: number; roundsPlayed: number; recentScores: number[];
  hintsUsed: number; usedDishIds: string[]; currentDishId: string | null;
  phase: 'idle' | 'playing' | 'done';
}

interface LeaderboardEntry { playerId: string; score: number; timestamp: string; }
interface PlayerStats { totalGames: number; totalScore: number; bestScore: number; dishHistory: string[]; }

const sessions = new Map<string, GameSession>();
const leaderboard: LeaderboardEntry[] = [];
const playerStats = new Map<string, PlayerStats>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDish(session: GameSession): Dish {
  const pool = dishes.filter(d =>
    (!session.difficulty || d.difficulty === session.difficulty) &&
    !session.usedDishIds.includes(d.id)
  );
  const src = pool.length > 0 ? pool : dishes;
  const weighted: Dish[] = [];
  for (const d of src) {
    const w = d.region === 'Tamil Nadu' ? 3 : 1;
    for (let i = 0; i < w; i++) weighted.push(d);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function getTileSet(dish: Dish, difficulty: string) {
  const cfg: Record<string, { correct: number; decoys: number }> = {
    easy: { correct: 4, decoys: 2 },
    medium: { correct: 5, decoys: 4 },
    hard: { correct: 5, decoys: 7 },
  };
  const { correct, decoys } = cfg[difficulty] ?? cfg.easy;
  const corrSet = shuffle(dish.ingredients).slice(0, correct);
  const decoySet = shuffle(dish.decoys).slice(0, decoys);
  return shuffle([...corrSet.map(n => ({ name: n, isCorrect: true })), ...decoySet.map(n => ({ name: n, isCorrect: false }))]);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMatch(guess: string, target: string): number {
  const a = guess.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

function calcScore(timeRemaining: number, difficulty: string, hintsUsed: number, ratio: number): number {
  const mult: Record<string, number> = { easy: 1, medium: 1.5, hard: 2 };
  const base = ratio >= 1 ? 100 : Math.round(100 * Math.min(ratio, 0.5));
  return Math.max(0, Math.round((base + timeRemaining * 2 - hintsUsed * 10) * (mult[difficulty] ?? 1)));
}

function getOrCreateStats(playerId: string): PlayerStats {
  if (!playerStats.has(playerId)) playerStats.set(playerId, { totalGames: 0, totalScore: 0, bestScore: 0, dishHistory: [] });
  return playerStats.get(playerId)!;
}

// ── MCP Server setup ──────────────────────────────────────────────────────────

const server = new McpServer({ name: 'game-state-server', version: '1.0.0' });

// ── Tools ─────────────────────────────────────────────────────────────────────

server.tool('start_game', 'Start a new game session and return the first round data', {
  mode: z.number().int().min(1).max(2).describe('1 = tile flip, 2 = dish guess'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy'),
  playerId: z.string().optional(),
}, async ({ mode, difficulty, playerId = 'anonymous' }) => {
  const id = uuidv4();
  const session: GameSession = { id, playerId, mode, difficulty, score: 0, roundsPlayed: 0, recentScores: [], hintsUsed: 0, usedDishIds: [], currentDishId: null, phase: 'playing' };
  sessions.set(id, session);
  const dish = pickDish(session);
  session.currentDishId = dish.id;
  session.usedDishIds.push(dish.id);
  const tiles = getTileSet(dish, difficulty);
  const ingredientList = shuffle([...dish.ingredients, ...dish.decoys.slice(0, 3)]);
  return { content: [{ type: 'text', text: JSON.stringify({ sessionId: id, dishId: dish.id, dishName: dish.name, tamilName: dish.tamilName, region: dish.region, mode, difficulty, tiles, ingredientList, correctIngredients: dish.ingredients }) }] };
});

server.tool('validate_answer', 'Validate a player answer for the current round', {
  sessionId: z.string(),
  answer: z.union([z.string(), z.array(z.string())]),
  timeRemaining: z.number().default(0),
}, async ({ sessionId, answer, timeRemaining }) => {
  const session = sessions.get(sessionId);
  if (!session) return { isError: true, content: [{ type: 'text', text: 'Session not found' }] };
  const dish = dishes.find(d => d.id === session.currentDishId);
  if (!dish) return { isError: true, content: [{ type: 'text', text: 'No active round' }] };

  let isCorrect = false, ratio = 0;
  let misses: string[] = [], extras: string[] = [];

  if (session.mode === 1) {
    const selected = Array.isArray(answer) ? answer : [answer];
    const norm = (s: string) => s.toLowerCase().trim().replace(/s$/, '');
    const corrNorm = dish.ingredients.map(norm);
    const selNorm = selected.map(norm);
    const matched = corrNorm.filter(c => selNorm.some(s => fuzzyMatch(s, c) >= 0.8));
    misses = corrNorm.filter(c => !matched.includes(c));
    extras = selNorm.filter(s => !corrNorm.some(c => fuzzyMatch(s, c) >= 0.8));
    ratio = matched.length / dish.ingredients.length;
    isCorrect = misses.length === 0 && extras.length === 0;
  } else {
    const conf = fuzzyMatch(String(answer), dish.name);
    isCorrect = conf >= 0.8;
    ratio = conf;
  }

  const scoreGained = calcScore(timeRemaining, session.difficulty, session.hintsUsed, isCorrect ? 1 : ratio);
  if (isCorrect || ratio > 0.5) session.score += scoreGained;
  session.roundsPlayed++;
  session.recentScores.push(scoreGained);
  session.hintsUsed = 0;
  session.currentDishId = null;
  sessions.set(sessionId, session);

  return { content: [{ type: 'text', text: JSON.stringify({ isCorrect, scoreGained, totalScore: session.score, partialRatio: ratio, feedback: isCorrect ? '✓ Correct!' : ratio > 0.5 ? 'Partial credit awarded.' : '✗ Not quite!', misses, extras, roundsPlayed: session.roundsPlayed }) }] };
});

server.tool('reset_game', 'Reset a game session to initial state', {
  sessionId: z.string(),
}, async ({ sessionId }) => {
  const session = sessions.get(sessionId);
  if (!session) return { isError: true, content: [{ type: 'text', text: 'Session not found' }] };
  session.score = 0; session.roundsPlayed = 0; session.recentScores = []; session.hintsUsed = 0; session.usedDishIds = []; session.currentDishId = null; session.phase = 'playing';
  sessions.set(sessionId, session);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
});

server.tool('get_hint', 'Get a hint for the current round (costs 10 points)', {
  sessionId: z.string(),
}, async ({ sessionId }) => {
  const session = sessions.get(sessionId);
  if (!session) return { isError: true, content: [{ type: 'text', text: 'Session not found' }] };
  const dish = dishes.find(d => d.id === session.currentDishId);
  if (!dish) return { isError: true, content: [{ type: 'text', text: 'No active round' }] };
  session.hintsUsed++;
  sessions.set(sessionId, session);
  const hints = [
    `Think about the souring agent used in ${dish.name}.`,
    `${dish.name} has a key ingredient from ${dish.region} that gives it a distinctive aroma.`,
    `One of the missing ingredients is a spice commonly tempered in oil at the start of cooking.`,
    `Consider an ingredient that provides the base flavour of ${dish.tamilName}.`,
  ];
  const hint = hints[Math.min(session.hintsUsed - 1, hints.length - 1)];
  return { content: [{ type: 'text', text: JSON.stringify({ hint, hintsUsed: session.hintsUsed, penaltyPoints: 10 }) }] };
});

server.tool('get_cultural_context', 'Get Tamil/regional cultural context for a dish', {
  dishId: z.string(),
}, async ({ dishId }) => {
  const dish = dishes.find(d => d.id === dishId);
  if (!dish) return { isError: true, content: [{ type: 'text', text: 'Dish not found' }] };
  return { content: [{ type: 'text', text: JSON.stringify({ tamilName: dish.tamilName, region: dish.region, funFact: dish.funFact }) }] };
});

server.tool('update_score', 'Submit final score and update leaderboard', {
  sessionId: z.string(),
  score: z.number(),
}, async ({ sessionId, score }) => {
  const session = sessions.get(sessionId);
  const playerId = session?.playerId ?? 'anonymous';
  leaderboard.push({ playerId, score, timestamp: new Date().toISOString() });
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 10) leaderboard.length = 10;
  const stats = getOrCreateStats(playerId);
  stats.totalGames++; stats.totalScore += score;
  if (score > stats.bestScore) stats.bestScore = score;
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, leaderboard }) }] };
});

server.tool('get_leaderboard', 'Get the top 10 leaderboard', {
  limit: z.number().int().min(1).max(10).default(10),
}, async ({ limit }) => {
  return { content: [{ type: 'text', text: JSON.stringify({ leaderboard: leaderboard.slice(0, limit) }) }] };
});

server.tool('get_player_stats', 'Get stats for a player', {
  playerId: z.string(),
}, async ({ playerId }) => {
  const stats = getOrCreateStats(playerId);
  const avg = stats.totalGames > 0 ? Math.round(stats.totalScore / stats.totalGames) : 0;
  return { content: [{ type: 'text', text: JSON.stringify({ ...stats, avgScore: avg }) }] };
});

server.tool('get_dish_info', 'Get full dish information by ID', {
  dishId: z.string(),
}, async ({ dishId }) => {
  const dish = dishes.find(d => d.id === dishId);
  if (!dish) return { isError: true, content: [{ type: 'text', text: 'Dish not found' }] };
  return { content: [{ type: 'text', text: JSON.stringify(dish) }] };
});

server.tool('list_dishes', 'List dishes filtered by difficulty and/or region', {
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  region: z.string().optional(),
}, async ({ difficulty, region }) => {
  let result = [...dishes];
  if (difficulty) result = result.filter(d => d.difficulty === difficulty);
  if (region) result = result.filter(d => d.region.toLowerCase().includes(region.toLowerCase()));
  result.sort((a, b) => (a.region === 'Tamil Nadu' ? -1 : b.region === 'Tamil Nadu' ? 1 : 0));
  return { content: [{ type: 'text', text: JSON.stringify({ dishes: result.map(({ id, name, tamilName, region: r, difficulty: diff }) => ({ id, name, tamilName, region: r, difficulty: diff })) }) }] };
});

server.tool('random_dish', 'Get a random dish, optionally filtered', {
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  excludeIds: z.array(z.string()).optional(),
}, async ({ difficulty, excludeIds = [] }) => {
  let pool = dishes.filter(d => !excludeIds.includes(d.id));
  if (difficulty) pool = pool.filter(d => d.difficulty === difficulty);
  if (pool.length === 0) pool = dishes;
  const weighted: Dish[] = [];
  for (const d of pool) {
    const w = d.region === 'Tamil Nadu' ? 3 : 1;
    for (let i = 0; i < w; i++) weighted.push(d);
  }
  const dish = weighted[Math.floor(Math.random() * weighted.length)];
  return { content: [{ type: 'text', text: JSON.stringify(dish) }] };
});

server.tool('adjust_difficulty', 'Change difficulty for a session', {
  sessionId: z.string(),
  newDifficulty: z.enum(['easy', 'medium', 'hard']),
}, async ({ sessionId, newDifficulty }) => {
  const session = sessions.get(sessionId);
  if (!session) return { isError: true, content: [{ type: 'text', text: 'Session not found' }] };
  session.difficulty = newDifficulty;
  sessions.set(sessionId, session);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, currentDifficulty: newDifficulty }) }] };
});

server.tool('get_difficulty_recommendation', 'Get a difficulty recommendation based on session performance', {
  sessionId: z.string(),
}, async ({ sessionId }) => {
  const session = sessions.get(sessionId);
  if (!session) return { isError: true, content: [{ type: 'text', text: 'Session not found' }] };
  const recent = session.recentScores.slice(-3);
  if (recent.length < 3) return { content: [{ type: 'text', text: JSON.stringify({ recommendation: 'keep', reason: 'Not enough rounds to evaluate yet.' }) }] };
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  let recommendation = 'keep', reason = `Average score of ${Math.round(avg)} is on track.`;
  if (avg > 200 && session.difficulty !== 'hard') { recommendation = 'increase'; reason = `High average score of ${Math.round(avg)} — ready for a harder challenge!`; }
  if (avg < 80 && session.difficulty !== 'easy') { recommendation = 'decrease'; reason = `Average score of ${Math.round(avg)} suggests an easier difficulty would be more fun.`; }
  return { content: [{ type: 'text', text: JSON.stringify({ recommendation, reason }) }] };
});

// ── Resources ─────────────────────────────────────────────────────────────────

server.resource('game-session', 'game://session/{id}', async (uri) => {
  const id = uri.href.replace('game://session/', '');
  const session = sessions.get(id);
  if (!session) return { contents: [{ uri: uri.href, text: JSON.stringify({ error: 'Session not found' }) }] };
  return { contents: [{ uri: uri.href, text: JSON.stringify(session) }] };
});

server.resource('leaderboard', 'game://leaderboard', async (uri) => {
  return { contents: [{ uri: uri.href, text: JSON.stringify({ leaderboard }) }] };
});

server.resource('dish-catalog', 'game://dishes', async (uri) => {
  const catalog = dishes.map(({ id, name, tamilName, region, difficulty }) => ({ id, name, tamilName, region, difficulty }));
  return { contents: [{ uri: uri.href, text: JSON.stringify({ dishes: catalog }) }] };
});

server.resource('player-stats', 'game://stats/{playerId}', async (uri) => {
  const playerId = uri.href.replace('game://stats/', '');
  const stats = getOrCreateStats(playerId);
  return { contents: [{ uri: uri.href, text: JSON.stringify(stats) }] };
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] game-state-server running on stdio');
}

main().catch(console.error);
