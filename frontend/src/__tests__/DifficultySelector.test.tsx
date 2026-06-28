import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { DifficultySelector } from '../components/DifficultySelector';

function renderWithGame() {
  return render(
    <GameProvider>
      <DifficultySelector />
    </GameProvider>
  );
}

describe('DifficultySelector', () => {
  test('renders Easy, Medium, and Hard pills', () => {
    renderWithGame();
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  test('Easy is selected by default', () => {
    const { container } = renderWithGame();
    const pills = container.querySelectorAll('.difficulty-pill');
    expect(pills[0].classList.contains('selected')).toBe(true);
    expect(pills[1].classList.contains('selected')).toBe(false);
    expect(pills[2].classList.contains('selected')).toBe(false);
  });

  test('clicking Medium selects it', () => {
    const { container } = renderWithGame();
    fireEvent.click(screen.getByText('Medium'));
    const pills = container.querySelectorAll('.difficulty-pill');
    expect(pills[1].classList.contains('selected')).toBe(true);
    expect(pills[0].classList.contains('selected')).toBe(false);
  });

  test('clicking Hard selects it', () => {
    const { container } = renderWithGame();
    fireEvent.click(screen.getByText('Hard'));
    const pills = container.querySelectorAll('.difficulty-pill');
    expect(pills[2].classList.contains('selected')).toBe(true);
  });

  test('pills have correct difficulty class names', () => {
    const { container } = renderWithGame();
    const pills = container.querySelectorAll('.difficulty-pill');
    expect(pills[0].classList.contains('easy')).toBe(true);
    expect(pills[1].classList.contains('medium')).toBe(true);
    expect(pills[2].classList.contains('hard')).toBe(true);
  });
});
