import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';
import { ScoreBoard } from '../components/ScoreBoard';
import type { Round, RoundResult } from '../types/game';

const sampleRound: Round = {
  roundId: 'r1', dishId: 'idli', dishName: 'Idli', tamilName: 'இட்லி',
  region: 'Tamil Nadu', funFact: 'A classic.', mode: 1, difficulty: 'easy',
  tiles: [], ingredientList: [], correctIngredients: [],
};

const sampleResult: RoundResult = {
  isCorrect: true, scoreGained: 200, totalScore: 200,
  partialRatio: 1, feedback: 'Correct!', misses: [], extras: [], roundsPlayed: 2,
};

function renderWithGame() {
  let dispatch: ReturnType<typeof useGame>['dispatch'];

  function Inner() {
    const ctx = useGame();
    dispatch = ctx.dispatch;
    return <ScoreBoard />;
  }

  const utils = render(<GameProvider><Inner /></GameProvider>);
  return { ...utils, getDispatch: () => dispatch };
}

describe('ScoreBoard', () => {
  test('shows initial score of 0', () => {
    renderWithGame();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('shows round progress as X/5', () => {
    renderWithGame();
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });

  test('shows mode 1 icon by default', () => {
    renderWithGame();
    expect(screen.getByText('🎴')).toBeInTheDocument();
  });

  test('shows updated score after result', () => {
    const { getDispatch } = renderWithGame();
    act(() => {
      getDispatch()({ type: 'SET_ROUND', round: sampleRound });
      getDispatch()({ type: 'SET_RESULT', result: sampleResult });
    });
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  test('shows mode 2 icon when mode is dish guess', () => {
    const { getDispatch } = renderWithGame();
    act(() => getDispatch()({ type: 'SET_MODE', mode: 2 }));
    expect(screen.getByText('🍽️')).toBeInTheDocument();
  });
});
