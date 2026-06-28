// Use || (not ??) so an empty-string VITE_API_URL falls back to the default
const BASE = import.meta.env.VITE_API_URL || '/api';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? 'Request failed');
  return json.data as T;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? 'Request failed');
  return json.data as T;
}

export const api = {
  createSession: (mode: number, difficulty: string, playerId?: string) =>
    post<{ sessionId: string }>('/game/session', { mode, difficulty, playerId }),

  startRound: (sessionId: string) =>
    post<{
      roundId: string; dishId: string; dishName: string; tamilName: string; region: string; funFact: string;
      mode: number; difficulty: string; tiles: { name: string; isCorrect: boolean }[];
      ingredientList: string[]; correctIngredients: string[];
    }>('/game/round', { sessionId }),

  validate: (sessionId: string, answer: string | string[], timeRemaining: number) =>
    post<{ isCorrect: boolean; scoreGained: number; totalScore: number; partialRatio: number; feedback: string; misses: string[]; extras: string[]; roundsPlayed: number }>(
      '/game/validate', { sessionId, answer, timeRemaining }
    ),

  getHint: (sessionId: string) =>
    post<{ hint: string; hintsUsed: number; penaltyPoints: number }>('/hint', { sessionId }),

  getCulturalContext: (dishId: string) =>
    get<{ tamilName: string; region: string; funFact: string; prompt: string }>(`/hint/cultural/${dishId}`),

  submitScore: (sessionId: string) =>
    post<{ leaderboard: { playerId: string; score: number; timestamp: string }[] }>('/game/scores', { sessionId }),

  getLeaderboard: () =>
    get<{ leaderboard: { playerId: string; score: number; timestamp: string }[] }>('/game/scores'),

  resetSession: (sessionId: string) =>
    post<{ message: string }>('/game/reset', { sessionId }),
};
