import { v4 as uuidv4 } from 'uuid';
import { apmLoader } from './apmLoader';
import dishes from '../data/dishes.json';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 1 | 2;

interface Tile { name: string; isCorrect: boolean; }

export interface Round {
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

const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function evictStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }
}

export function createSession(mode: Mode, difficulty: Difficulty, playerId = 'anonymous'): Session {
  evictStaleSessions();
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
  sessions.set(session.sessionId, session);
  return session;
}

export function startRound(sessionId: string): Round {
  const session = getSession(sessionId);

  const dish = apmLoader.invokeSkill('dish-randomizer', 'pickRound',
    dishes, session.difficulty, session.usedDishIds, sessionId,
  ) as typeof dishes[0];
  session.usedDishIds.push(dish.id);

  const tiles = apmLoader.invokeSkill('difficulty-scaler', 'scaleTiles', dish, session.difficulty) as Tile[];
  const decoys = (dish.decoys ?? []).slice(0, 3);

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
    ingredientList: shuffle([...dish.ingredients, ...decoys]),
    correctIngredients: dish.ingredients,
  };

  session.currentRound = round;
  sessions.set(sessionId, session);
  return round;
}

export function validateAnswer(sessionId: string, answer: string | string[], timeRemaining: number): {
  isCorrect: boolean; scoreGained: number; totalScore: number; roundsPlayed: number;
  partialRatio: number; feedback: string; misses: string[]; extras: string[];
  dishName: string; playerId: string;
} {
  const session = getSession(sessionId);
  const round = session.currentRound;
  if (!round) throw new Error('No active round');

  let isCorrect = false;
  let partialRatio = 0;
  let misses: string[] = [];
  let extras: string[] = [];

  if (round.mode === 1) {
    const selected = Array.isArray(answer) ? answer : [String(answer)];
    const result = apmLoader.invokeSkill('game-validator', 'validateIngredients', selected, round.correctIngredients) as {
      isCorrect: boolean; partialRatio: number; misses: string[]; extras: string[];
    };
    isCorrect = result.isCorrect;
    partialRatio = result.partialRatio;
    misses = result.misses;
    extras = result.extras;
  } else {
    const result = apmLoader.invokeSkill('game-validator', 'validateDishName', String(answer), round.dishName) as {
      isCorrect: boolean; confidence: number;
    };
    isCorrect = result.isCorrect;
    partialRatio = result.confidence;
  }

  const scoreGained = apmLoader.invokeSkill('score-calculator', 'calculateScore', {
    timeRemaining: Math.max(0, timeRemaining),
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
  sessions.set(sessionId, session);

  const feedback = isCorrect ? '✓ Correct!' : partialRatio > 0.5 ? 'Close! Partial credit awarded.' : '✗ Not quite!';
  return { isCorrect, scoreGained, totalScore: session.score, roundsPlayed: session.roundsPlayed, partialRatio, feedback, misses, extras, dishName: round.dishName, playerId: session.playerId };
}

export function useHint(sessionId: string): { hintsUsed: number } {
  const session = getSession(sessionId);
  session.hintsUsed++;
  sessions.set(sessionId, session);
  return { hintsUsed: session.hintsUsed };
}

export function getSession(sessionId: string): Session {
  if (!sessionId) throw new Error('sessionId is required');
  const s = sessions.get(sessionId);
  if (!s) throw new Error('Session not found');
  return s;
}

export function resetSession(sessionId: string): void {
  const session = getSession(sessionId);
  session.score = 0;
  session.roundsPlayed = 0;
  session.recentScores = [];
  session.hintsUsed = 0;
  session.usedDishIds = [];
  session.currentRound = null;
  sessions.set(sessionId, session);
  apmLoader.invokeSkill('dish-randomizer', 'resetHistory', sessionId);
}

const leaderboard: { playerId: string; score: number; timestamp: string }[] = [];

export function submitScore(sessionId: string): { leaderboard: typeof leaderboard; playerId: string; score: number } {
  const session = getSession(sessionId);
  const playerId = session.playerId.slice(0, 50);
  const { score } = session;
  const entry = { playerId, score, timestamp: new Date().toISOString() };
  leaderboard.push(entry);
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 10) leaderboard.length = 10;
  return { leaderboard, playerId, score };
}

export function getLeaderboard() { return leaderboard; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
