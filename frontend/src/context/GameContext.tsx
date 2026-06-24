import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Mode, Difficulty, Round, RoundResult, LeaderboardEntry } from '../types/game';

type Action =
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'SET_DIFFICULTY'; difficulty: Difficulty }
  | { type: 'SET_SESSION'; sessionId: string }
  | { type: 'SET_ROUND'; round: Round }
  | { type: 'SET_RESULT'; result: RoundResult }
  | { type: 'SET_HINT'; hint: string }
  | { type: 'SET_CULTURAL_CONTEXT'; ctx: { tamilName: string; region: string; funFact: string } }
  | { type: 'SET_LEADERBOARD'; leaderboard: LeaderboardEntry[] }
  | { type: 'SET_PHASE'; phase: GameState['phase'] }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'CLEAR_HINT' }
  | { type: 'CLEAR_CULTURAL_CONTEXT' }
  | { type: 'RESET' };

const initial: GameState = {
  phase: 'setup',
  mode: 1,
  difficulty: 'easy',
  sessionId: null,
  score: 0,
  roundsPlayed: 0,
  currentRound: null,
  lastResult: null,
  hint: null,
  culturalContext: null,
  leaderboard: [],
  error: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_MODE': return { ...state, mode: action.mode };
    case 'SET_DIFFICULTY': return { ...state, difficulty: action.difficulty };
    case 'SET_SESSION': return { ...state, sessionId: action.sessionId };
    case 'SET_ROUND': return { ...state, currentRound: action.round, lastResult: null, hint: null, culturalContext: null, phase: 'playing' };
    case 'SET_RESULT': return { ...state, lastResult: action.result, score: action.result.totalScore, roundsPlayed: action.result.roundsPlayed, phase: 'result' };
    case 'SET_HINT': return { ...state, hint: action.hint };
    case 'SET_CULTURAL_CONTEXT': return { ...state, culturalContext: action.ctx };
    case 'SET_LEADERBOARD': return { ...state, leaderboard: action.leaderboard };
    case 'SET_PHASE': return { ...state, phase: action.phase };
    case 'SET_ERROR': return { ...state, error: action.error };
    case 'CLEAR_HINT': return { ...state, hint: null };
    case 'CLEAR_CULTURAL_CONTEXT': return { ...state, culturalContext: null };
    case 'RESET': return { ...initial };
    default: return state;
  }
}

const GameCtx = createContext<{ state: GameState; dispatch: React.Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <GameCtx.Provider value={{ state, dispatch }}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
