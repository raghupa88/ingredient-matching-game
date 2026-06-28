import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { GameProvider, useGame } from '../context/GameContext';
import { HintPanel } from '../components/HintPanel';
import { api } from '../services/api';

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

function renderWithSession() {
  let dispatch: ReturnType<typeof useGame>['dispatch'];

  function Inner() {
    const ctx = useGame();
    dispatch = ctx.dispatch;
    return <HintPanel />;
  }

  const utils = render(<GameProvider><Inner /></GameProvider>);
  act(() => dispatch({ type: 'SET_SESSION', sessionId: 'test-session-123' }));
  return utils;
}

describe('HintPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows hint button initially', () => {
    renderWithSession();
    expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument();
  });

  test('calls api.getHint with sessionId on click', async () => {
    mockApi.getHint.mockResolvedValueOnce({ hint: 'Think of a grain.', hintsUsed: 1, penaltyPoints: 10 });
    renderWithSession();
    fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    await waitFor(() => expect(mockApi.getHint).toHaveBeenCalledWith('test-session-123'));
  });

  test('displays hint text after successful fetch', async () => {
    mockApi.getHint.mockResolvedValueOnce({ hint: 'Think of a grain.', hintsUsed: 1, penaltyPoints: 10 });
    renderWithSession();
    fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    await waitFor(() => expect(screen.getByText('Think of a grain.')).toBeInTheDocument());
  });

  test('shows fallback hint text on API error', async () => {
    mockApi.getHint.mockRejectedValueOnce(new Error('Network error'));
    renderWithSession();
    fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    await waitFor(() => expect(screen.getByText(/key flavour/i)).toBeInTheDocument());
  });

  test('close button dismisses hint', async () => {
    mockApi.getHint.mockResolvedValueOnce({ hint: 'Think of a grain.', hintsUsed: 1, penaltyPoints: 10 });
    renderWithSession();
    fireEvent.click(screen.getByRole('button', { name: /hint/i }));
    await waitFor(() => screen.getByText('Think of a grain.'));
    fireEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('Think of a grain.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument();
  });
});
