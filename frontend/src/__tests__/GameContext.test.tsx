import { render, act } from '@testing-library/react';
import { useGame, GameProvider } from '../context/GameContext';
import { TOTAL_ROUNDS } from '../types/game';
import type { Round, RoundResult } from '../types/game';

function Harness({ action }: { action: () => void }) {
  const { dispatch } = useGame();
  return <button onClick={() => { action(); dispatch; }}>dispatch</button>;
}

function setupReducer() {
  let capturedDispatch: ReturnType<typeof useGame>['dispatch'] | null = null;
  let capturedState: ReturnType<typeof useGame>['state'] | null = null;

  function Reader() {
    const { state, dispatch } = useGame();
    capturedDispatch = dispatch;
    capturedState = state;
    return null;
  }

  render(
    <GameProvider>
      <Reader />
    </GameProvider>
  );

  return {
    get state() { return capturedState!; },
    dispatch: (action: Parameters<NonNullable<typeof capturedDispatch>>[0]) => {
      act(() => { capturedDispatch!(action); });
    },
  };
}

const sampleRound: Round = {
  roundId: 'r1',
  dishId: 'idli',
  dishName: 'Idli',
  tamilName: 'இட்லி',
  region: 'Tamil Nadu',
  funFact: 'A staple breakfast.',
  mode: 1,
  difficulty: 'easy',
  tiles: [],
  ingredientList: ['rice', 'urad dal'],
  correctIngredients: ['rice', 'urad dal'],
};

const sampleResult: RoundResult = {
  isCorrect: true,
  scoreGained: 150,
  totalScore: 150,
  partialRatio: 1,
  feedback: 'Correct!',
  misses: [],
  extras: [],
  roundsPlayed: 1,
};

describe('GameContext reducer', () => {
  test('initial state has phase setup and score 0', () => {
    const { state } = setupReducer();
    expect(state.phase).toBe('setup');
    expect(state.score).toBe(0);
    expect(state.roundsPlayed).toBe(0);
    expect(state.sessionId).toBeNull();
  });

  test('SET_MODE updates mode', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_MODE', mode: 2 });
    expect(ctx.state.mode).toBe(2);
  });

  test('SET_DIFFICULTY updates difficulty', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_DIFFICULTY', difficulty: 'hard' });
    expect(ctx.state.difficulty).toBe('hard');
  });

  test('SET_SESSION stores sessionId', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_SESSION', sessionId: 'abc-123' });
    expect(ctx.state.sessionId).toBe('abc-123');
  });

  test('SET_ROUND sets phase to playing and clears hint/culturalContext', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_HINT', hint: 'Some hint' });
    ctx.dispatch({ type: 'SET_CULTURAL_CONTEXT', ctx: { tamilName: 'இட்லி', region: 'Tamil Nadu', funFact: 'fact' } });
    ctx.dispatch({ type: 'SET_ROUND', round: sampleRound });

    expect(ctx.state.phase).toBe('playing');
    expect(ctx.state.currentRound).toEqual(sampleRound);
    expect(ctx.state.hint).toBeNull();
    expect(ctx.state.culturalContext).toBeNull();
    expect(ctx.state.lastResult).toBeNull();
  });

  test('SET_RESULT sets phase to result and updates score/roundsPlayed', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_ROUND', round: sampleRound });
    ctx.dispatch({ type: 'SET_RESULT', result: sampleResult });

    expect(ctx.state.phase).toBe('result');
    expect(ctx.state.score).toBe(150);
    expect(ctx.state.roundsPlayed).toBe(1);
    expect(ctx.state.lastResult).toEqual(sampleResult);
  });

  test('SET_HINT stores hint text', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_HINT', hint: 'Think about fermentation' });
    expect(ctx.state.hint).toBe('Think about fermentation');
  });

  test('CLEAR_HINT removes hint', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_HINT', hint: 'A hint' });
    ctx.dispatch({ type: 'CLEAR_HINT' });
    expect(ctx.state.hint).toBeNull();
  });

  test('SET_CULTURAL_CONTEXT stores context', () => {
    const ctx = setupReducer();
    const ctxData = { tamilName: 'இட்லி', region: 'Tamil Nadu', funFact: 'A fermented rice cake.' };
    ctx.dispatch({ type: 'SET_CULTURAL_CONTEXT', ctx: ctxData });
    expect(ctx.state.culturalContext).toEqual(ctxData);
  });

  test('CLEAR_CULTURAL_CONTEXT removes context', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_CULTURAL_CONTEXT', ctx: { tamilName: '', region: '', funFact: '' } });
    ctx.dispatch({ type: 'CLEAR_CULTURAL_CONTEXT' });
    expect(ctx.state.culturalContext).toBeNull();
  });

  test('SET_LEADERBOARD stores leaderboard', () => {
    const ctx = setupReducer();
    const lb = [{ playerId: 'p1', score: 200, timestamp: new Date().toISOString() }];
    ctx.dispatch({ type: 'SET_LEADERBOARD', leaderboard: lb });
    expect(ctx.state.leaderboard).toEqual(lb);
  });

  test('SET_PHASE updates phase', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_PHASE', phase: 'gameover' });
    expect(ctx.state.phase).toBe('gameover');
  });

  test('SET_ERROR stores error message', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_ERROR', error: 'Something went wrong' });
    expect(ctx.state.error).toBe('Something went wrong');
  });

  test('SET_ERROR with null clears error', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_ERROR', error: 'err' });
    ctx.dispatch({ type: 'SET_ERROR', error: null });
    expect(ctx.state.error).toBeNull();
  });

  test('RESET returns to initial state', () => {
    const ctx = setupReducer();
    ctx.dispatch({ type: 'SET_SESSION', sessionId: 'xyz' });
    ctx.dispatch({ type: 'SET_ROUND', round: sampleRound });
    ctx.dispatch({ type: 'SET_RESULT', result: sampleResult });
    ctx.dispatch({ type: 'RESET' });

    expect(ctx.state.phase).toBe('setup');
    expect(ctx.state.score).toBe(0);
    expect(ctx.state.sessionId).toBeNull();
    expect(ctx.state.currentRound).toBeNull();
    expect(ctx.state.roundsPlayed).toBe(0);
  });

  test('TOTAL_ROUNDS constant is 5', () => {
    expect(TOTAL_ROUNDS).toBe(5);
  });
});
