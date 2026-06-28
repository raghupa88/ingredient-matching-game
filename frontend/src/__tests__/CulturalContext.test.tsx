import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';
import { CulturalContext } from '../components/CulturalContext';
import { api } from '../services/api';
import type { Round } from '../types/game';

vi.mock('../services/api', () => ({
  api: {
    getHint: vi.fn(),
    getCulturalContext: vi.fn(),
    createSession: vi.fn(),
    startRound: vi.fn(),
    validate: vi.fn(),
    submitScore: vi.fn(),
    getLeaderboard: vi.fn(),
    resetSession: vi.fn(),
  },
}));

const mockApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const mockContext = { tamilName: 'இட்லி', region: 'Tamil Nadu', funFact: 'Idli is a fermented rice cake.' };

const mode1Round: Round = {
  roundId: 'r1', dishId: 'idli', dishName: 'Idli', tamilName: 'இட்லி',
  region: 'Tamil Nadu', funFact: 'fact', mode: 1, difficulty: 'easy',
  tiles: [], ingredientList: [], correctIngredients: [],
};

const mode2Round: Round = { ...mode1Round, mode: 2 };

function renderWithRound(round: Round) {
  let dispatch: ReturnType<typeof useGame>['dispatch'];

  function Inner() {
    const ctx = useGame();
    dispatch = ctx.dispatch;
    return <CulturalContext />;
  }

  const utils = render(<GameProvider><Inner /></GameProvider>);
  act(() => dispatch({ type: 'SET_ROUND', round }));
  return { ...utils, getDispatch: () => dispatch };
}

describe('CulturalContext', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows load button initially', () => {
    renderWithRound(mode1Round);
    expect(screen.getByRole('button', { name: /cultural context/i })).toBeInTheDocument();
  });

  test('fetches and shows context for mode 1 (shows tamilName and funFact)', async () => {
    mockApi.getCulturalContext.mockResolvedValueOnce(mockContext);
    renderWithRound(mode1Round);
    fireEvent.click(screen.getByRole('button', { name: /cultural context/i }));
    await waitFor(() => expect(screen.getByText('இட்லி')).toBeInTheDocument());
    expect(screen.getByText(/fermented rice cake/i)).toBeInTheDocument();
    expect(screen.getByText(/Tamil Nadu/)).toBeInTheDocument();
  });

  test('close button removes context', async () => {
    mockApi.getCulturalContext.mockResolvedValueOnce(mockContext);
    renderWithRound(mode1Round);
    fireEvent.click(screen.getByRole('button', { name: /cultural context/i }));
    await waitFor(() => screen.getByText('இட்லி'));
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('இட்லி')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cultural context/i })).toBeInTheDocument();
  });

  test('shows fallback on API error', async () => {
    mockApi.getCulturalContext.mockRejectedValueOnce(new Error('Network error'));
    renderWithRound(mode1Round);
    fireEvent.click(screen.getByRole('button', { name: /cultural context/i }));
    await waitFor(() => expect(screen.getByText(/cultural history/i)).toBeInTheDocument());
  });
});
