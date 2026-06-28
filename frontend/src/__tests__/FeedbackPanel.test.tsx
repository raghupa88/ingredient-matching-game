import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';
import { FeedbackPanel } from '../components/FeedbackPanel';
import type { Round, RoundResult } from '../types/game';

const round: Round = {
  roundId: 'r1', dishId: 'idli', dishName: 'Idli', tamilName: 'இட்லி',
  region: 'Tamil Nadu', funFact: 'A classic.', mode: 1, difficulty: 'easy',
  tiles: [], ingredientList: [], correctIngredients: [],
};

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    isCorrect: true, scoreGained: 150, totalScore: 150, partialRatio: 1,
    feedback: 'Correct!', misses: [], extras: [], roundsPlayed: 1,
    ...overrides,
  };
}

function renderFeedback(result: RoundResult, onNext = vi.fn()) {
  let dispatch: ReturnType<typeof useGame>['dispatch'];

  function Inner() {
    const ctx = useGame();
    dispatch = ctx.dispatch;
    return <FeedbackPanel onNext={onNext} />;
  }

  const utils = render(<GameProvider><Inner /></GameProvider>);

  act(() => {
    dispatch({ type: 'SET_ROUND', round });
    dispatch({ type: 'SET_RESULT', result });
  });

  return { ...utils, onNext };
}

describe('FeedbackPanel', () => {
  test('renders null when no lastResult', () => {
    const { container } = render(
      <GameProvider><FeedbackPanel onNext={() => {}} /></GameProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  test('shows feedback text and score', () => {
    renderFeedback(makeResult());
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText(/\+150 pts/)).toBeInTheDocument();
  });

  test('shows correct emoji for perfect answer', () => {
    renderFeedback(makeResult({ isCorrect: true }));
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  test('shows partial emoji for partial credit', () => {
    renderFeedback(makeResult({ isCorrect: false, partialRatio: 0.75, feedback: 'Close!' }));
    expect(screen.getByText('🤏')).toBeInTheDocument();
  });

  test('shows wrong emoji for incorrect answer', () => {
    renderFeedback(makeResult({ isCorrect: false, partialRatio: 0.3, feedback: 'Nope!' }));
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  test('shows missed ingredients when present', () => {
    renderFeedback(makeResult({ misses: ['urad dal', 'fenugreek'] }));
    expect(screen.getByText(/urad dal/)).toBeInTheDocument();
    expect(screen.getByText(/fenugreek/)).toBeInTheDocument();
  });

  test('shows dish reveal after result', () => {
    renderFeedback(makeResult());
    expect(screen.getByText('Idli')).toBeInTheDocument();
    // tamilName is rendered inside a span with parentheses, use regex
    expect(screen.getByText(/இட்லி/)).toBeInTheDocument();
  });

  test('shows Next Round button for non-final rounds', () => {
    renderFeedback(makeResult({ roundsPlayed: 2 }));
    expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();
  });

  test('shows See Leaderboard button after 5 rounds', () => {
    renderFeedback(makeResult({ roundsPlayed: 5 }));
    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
  });

  test('clicking next button calls onNext', () => {
    const onNext = vi.fn();
    renderFeedback(makeResult(), onNext);
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
