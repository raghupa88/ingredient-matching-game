export const TOTAL_ROUNDS = 5;

export type Mode = 1 | 2;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GamePhase = 'setup' | 'playing' | 'result' | 'gameover';

export interface Tile {
  name: string;
  isCorrect: boolean;
  flipped: boolean;
  selected: boolean;
}

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

export interface RoundResult {
  isCorrect: boolean;
  scoreGained: number;
  totalScore: number;
  partialRatio: number;
  feedback: string;
  misses: string[];
  extras: string[];
  roundsPlayed: number;
}

export interface LeaderboardEntry {
  playerId: string;
  score: number;
  timestamp: string;
}

export interface GameState {
  phase: GamePhase;
  mode: Mode;
  difficulty: Difficulty;
  sessionId: string | null;
  score: number;
  roundsPlayed: number;
  currentRound: Round | null;
  lastResult: RoundResult | null;
  hint: string | null;
  culturalContext: { tamilName: string; region: string; funFact: string } | null;
  leaderboard: LeaderboardEntry[];
  error: string | null;
}
