import { render, screen, fireEvent } from '@testing-library/react';
import { TileGrid } from '../components/TileGrid';
import type { Tile } from '../types/game';

const makeTiles = (names: string[]): Tile[] =>
  names.map(name => ({ name, isCorrect: true, flipped: false, selected: false }));

describe('TileGrid', () => {
  const defaultTiles = makeTiles(['rice', 'urad dal', 'fenugreek', 'salt']);

  test('renders the correct number of tile buttons', () => {
    render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const buttons = screen.getAllByRole('button', { name: /\?|rice|urad|fenugreek|salt|சமர்ப்பி/i });
    // 4 tile buttons + 1 submit button
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  test('tiles initially show "?" face', () => {
    render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks.length).toBe(4);
  });

  test('clicking a tile flips it (adds flipped class)', () => {
    const { container } = render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const tiles = container.querySelectorAll('.tile');
    fireEvent.click(tiles[0]);
    expect(tiles[0].classList.contains('flipped')).toBe(true);
  });

  test('clicking same tile twice toggles selected state', () => {
    const { container } = render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const tile = container.querySelectorAll('.tile')[0];
    fireEvent.click(tile);
    expect(tile.classList.contains('selected')).toBe(true);
    fireEvent.click(tile);
    expect(tile.classList.contains('selected')).toBe(false);
  });

  test('submit button is disabled when nothing selected', () => {
    render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    expect(submitBtn).toBeDisabled();
  });

  test('submit button enables after selecting a tile', () => {
    const { container } = render(<TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />);
    const tile = container.querySelectorAll('.tile')[1];
    fireEvent.click(tile);
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    expect(submitBtn).not.toBeDisabled();
  });

  test('calls onSubmit with selected tile names', () => {
    const onSubmit = vi.fn();
    const { container } = render(<TileGrid tiles={defaultTiles} onSubmit={onSubmit} disabled={false} />);
    const tiles = container.querySelectorAll('.tile');
    fireEvent.click(tiles[0]); // rice
    fireEvent.click(tiles[2]); // fenugreek
    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith(expect.arrayContaining(['rice', 'fenugreek']));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('disabled prop prevents tile clicks', () => {
    const onSubmit = vi.fn();
    const { container } = render(<TileGrid tiles={defaultTiles} onSubmit={onSubmit} disabled={true} />);
    const tile = container.querySelectorAll('.tile')[0];
    fireEvent.click(tile);
    expect(tile.classList.contains('flipped')).toBe(false);
    expect(tile.classList.contains('selected')).toBe(false);
  });

  test('flipped and selected state resets when tiles prop changes', () => {
    const { container, rerender } = render(
      <TileGrid tiles={defaultTiles} onSubmit={() => {}} disabled={false} />
    );
    const tile = container.querySelectorAll('.tile')[0];
    fireEvent.click(tile);
    expect(tile.classList.contains('flipped')).toBe(true);

    // Rerender with new tiles (simulates new round)
    const newTiles = makeTiles(['pepper', 'cumin', 'ghee']);
    rerender(<TileGrid tiles={newTiles} onSubmit={() => {}} disabled={false} />);

    const newTileElements = container.querySelectorAll('.tile');
    for (const t of newTileElements) {
      expect(t.classList.contains('flipped')).toBe(false);
      expect(t.classList.contains('selected')).toBe(false);
    }
  });
});
