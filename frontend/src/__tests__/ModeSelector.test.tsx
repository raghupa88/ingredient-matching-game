import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';
import { ModeSelector } from '../components/ModeSelector';

function renderWithGame(initialMode?: 1 | 2) {
  let dispatch: ReturnType<typeof useGame>['dispatch'];

  function Inner() {
    const ctx = useGame();
    dispatch = ctx.dispatch;
    return <ModeSelector />;
  }

  const utils = render(
    <GameProvider>
      <Inner />
    </GameProvider>
  );

  if (initialMode) {
    act(() => dispatch({ type: 'SET_MODE', mode: initialMode }));
  }

  return utils;
}

describe('ModeSelector', () => {
  test('renders two mode cards', () => {
    renderWithGame();
    expect(screen.getByText('Tile Flip')).toBeInTheDocument();
    expect(screen.getByText('Dish Guess')).toBeInTheDocument();
  });

  test('mode 1 card is selected by default', () => {
    const { container } = renderWithGame();
    const cards = container.querySelectorAll('.mode-card');
    expect(cards[0].classList.contains('selected')).toBe(true);
    expect(cards[1].classList.contains('selected')).toBe(false);
  });

  test('clicking mode 2 card selects it', () => {
    const { container } = renderWithGame();
    const cards = container.querySelectorAll('.mode-card');
    fireEvent.click(cards[1]);
    expect(cards[1].classList.contains('selected')).toBe(true);
    expect(cards[0].classList.contains('selected')).toBe(false);
  });

  test('clicking mode 1 after mode 2 switches back', () => {
    const { container } = renderWithGame(2);
    const cards = container.querySelectorAll('.mode-card');
    expect(cards[1].classList.contains('selected')).toBe(true);
    fireEvent.click(cards[0]);
    expect(cards[0].classList.contains('selected')).toBe(true);
  });
});
