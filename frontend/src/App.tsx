import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameProvider, useGame } from './context/GameContext';
import { ModeSelector } from './components/ModeSelector';
import { DifficultySelector } from './components/DifficultySelector';
import { GameBoard } from './components/GameBoard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { api } from './services/api';

function SetupScreen() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
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
        <h1 className="hero-title">{t('hero.title')}</h1>
        <p className="hero-subtitle">{t('hero.subtitle')}</p>
        <p className="hero-desc">{t('hero.description')}</p>
      </header>
      <ModeSelector />
      <DifficultySelector />
      {error && <div className="error-toast">{error}</div>}
      <button className="btn-primary start-btn" onClick={startGame} disabled={loading}>
        {loading ? t('hero.loading') : t('hero.start')}
      </button>
    </div>
  );
}

function AppInner() {
  const { state } = useGame();
  const { t } = useTranslation();
  const inGame = state.phase !== 'setup';
  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">{t('nav.brand')}</span>
        <div className="nav-right">
          {inGame && <span className="nav-score">{t('nav.score', { score: state.score })}</span>}
          <LanguageSwitcher />
        </div>
      </nav>
      <main className="main">
        {!inGame ? <SetupScreen /> : <GameBoard />}
      </main>
      <footer className="footer">
        <span>{t('footer.text')}</span>
      </footer>
    </div>
  );
}

export default function App() {
  return <GameProvider><AppInner /></GameProvider>;
}
