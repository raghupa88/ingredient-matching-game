import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { ModeSelector } from './components/ModeSelector';
import { DifficultySelector } from './components/DifficultySelector';
import { GameBoard } from './components/GameBoard';
import { api } from './services/api';

function SetupScreen() {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGame() {
    setLoading(true);
    setError(null);
    try {
      const { sessionId } = await api.createSession(state.mode, state.difficulty);
      dispatch({ type: 'SET_SESSION', sessionId });
      const round = await api.startRound(sessionId);
      dispatch({
        type: 'SET_ROUND',
        round: {
          ...round,
          mode: round.mode as 1 | 2,
          difficulty: round.difficulty as 'easy' | 'medium' | 'hard',
          tiles: round.tiles.map(t => ({ ...t, flipped: false, selected: false })),
        },
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="setup-screen">
      <header className="hero">
        <h1 className="hero-title">சுவை விளையாட்டு</h1>
        <p className="hero-subtitle">Ingredient Matching Game</p>
        <p className="hero-desc">
          Master Tamil cuisine and beyond — 5 rounds, 30 seconds each.
        </p>
      </header>
      <ModeSelector />
      <DifficultySelector />
      {error && <div className="error-toast">{error}</div>}
      <button className="btn-primary start-btn" onClick={startGame} disabled={loading}>
        {loading ? 'Starting…' : '▶ Start Game · விளையாடு'}
      </button>
    </div>
  );
}

function AppInner() {
  const { state } = useGame();
  const inGame = state.phase !== 'setup';
  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">சுவை விளையாட்டு 🍛</span>
        {inGame && <span className="nav-score">Score: {state.score}</span>}
      </nav>
      <main className="main">
        {!inGame ? <SetupScreen /> : <GameBoard />}
      </main>
      <footer className="footer">
        <span>Tamil cuisine · APM-powered · Built with ❤️</span>
      </footer>
    </div>
  );
}

export default function App() {
  return <GameProvider><AppInner /></GameProvider>;
}
