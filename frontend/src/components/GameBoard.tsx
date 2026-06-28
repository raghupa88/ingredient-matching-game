import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useTimer } from '../hooks/useTimer';
import { api } from '../services/api';
import { TileGrid } from './TileGrid';
import { DishGuesser } from './DishGuesser';
import { Timer } from './Timer';
import { ScoreBoard } from './ScoreBoard';
import { HintPanel } from './HintPanel';
import { CulturalContext } from './CulturalContext';
import { FeedbackPanel } from './FeedbackPanel';
import { Leaderboard } from './Leaderboard';
import { Tile, TOTAL_ROUNDS } from '../types/game';

export function GameBoard() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
  const isPlaying = state.phase === 'playing';

  const handleTimeUp = useCallback(async () => {
    if (!state.sessionId || !state.currentRound || state.phase !== 'playing') return;
    try {
      const answer = state.currentRound.mode === 1 ? [] : '';
      const result = await api.validate(state.sessionId, answer, 0);
      dispatch({ type: 'SET_RESULT', result });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : t('error.generic') });
    }
  }, [state.sessionId, state.currentRound, state.phase, dispatch, t]);

  const timeLeft = useTimer(30, handleTimeUp, isPlaying);

  async function startRound() {
    if (!state.sessionId) return;
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const round = await api.startRound(state.sessionId);
      dispatch({
        type: 'SET_ROUND',
        round: {
          ...round,
          mode: round.mode as 1 | 2,
          difficulty: round.difficulty as 'easy' | 'medium' | 'hard',
          tiles: round.tiles.map(t => ({ ...t, flipped: false, selected: false })) as Tile[],
        },
      });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : t('error.generic') });
    }
  }

  async function handleAnswer(answer: string | string[]) {
    if (!state.sessionId) return;
    try {
      const result = await api.validate(state.sessionId, answer, timeLeft);
      dispatch({ type: 'SET_RESULT', result });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : t('error.generic') });
    }
  }

  async function handleNext() {
    if (state.roundsPlayed >= TOTAL_ROUNDS) {
      try {
        if (state.sessionId) {
          const lb = await api.submitScore(state.sessionId);
          dispatch({ type: 'SET_LEADERBOARD', leaderboard: lb.leaderboard });
        }
      } catch (e) {
        dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : t('error.generic') });
      }
      dispatch({ type: 'SET_PHASE', phase: 'gameover' });
    } else {
      await startRound();
    }
  }

  if (state.phase === 'gameover') return <Leaderboard onRestart={() => dispatch({ type: 'RESET' })} />;

  const round = state.currentRound;

  return (
    <div className="game-board">
      <ScoreBoard />

      {state.error && <div className="error-toast">{state.error}</div>}

      {(isPlaying || state.phase === 'result') && (
        <div className="round-header">
          {round && (
            <>
              <p className="region-tag">📍 {round.region}</p>
              {state.phase === 'playing' && round.mode === 1 && (
                <h2 className="dish-title">
                  {round.dishName}
                  {round.tamilName && <span className="tamil"> · {round.tamilName}</span>}
                </h2>
              )}
              {state.phase === 'playing' && round.mode === 1 && (
                <p className="instruction">{t('game.instruction_flip')}</p>
              )}
              {state.phase === 'playing' && round.mode === 2 && (
                <p className="instruction">{t('game.instruction_guess')}</p>
              )}
            </>
          )}
          {isPlaying && <Timer timeLeft={timeLeft} />}
        </div>
      )}

      {isPlaying && round && (
        <div className="round-body">
          {round.mode === 1
            ? <TileGrid tiles={round.tiles} onSubmit={handleAnswer} disabled={false} />
            : <DishGuesser ingredients={round.ingredientList} onSubmit={handleAnswer} disabled={false} />
          }
          <div className="round-actions">
            <HintPanel />
            <CulturalContext />
          </div>
        </div>
      )}

      {state.phase === 'result' && <FeedbackPanel onNext={handleNext} />}
    </div>
  );
}
