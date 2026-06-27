import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { TOTAL_ROUNDS } from '../types/game';

interface Props { onNext: () => void; }

export function FeedbackPanel({ onNext }: Props) {
  const { state } = useGame();
  const { t } = useTranslation();
  const result = state.lastResult;
  if (!result) return null;

  const isGameOver = result.roundsPlayed >= TOTAL_ROUNDS;

  return (
    <div className={`feedback-panel${result.isCorrect ? ' correct' : ' incorrect'}`}>
      <div className="feedback-icon">{result.isCorrect ? '✅' : result.partialRatio > 0.5 ? '🤏' : '❌'}</div>
      <h3 className="feedback-title">{result.feedback}</h3>

      {result.misses.length > 0 && (
        <div className="missed-list">
          <strong>{t('feedback.missed')}</strong> {result.misses.join(', ')}
        </div>
      )}

      <div className="score-gained">
        {t('feedback.score', { gained: result.scoreGained, total: result.totalScore })}
      </div>

      {state.currentRound && (
        <p className="dish-reveal">
          {t('feedback.dish')} <strong>{state.currentRound.dishName}</strong>
          {state.currentRound.tamilName && <span className="tamil"> ({state.currentRound.tamilName})</span>}
        </p>
      )}

      <button className="btn-primary next-btn" onClick={onNext}>
        {isGameOver ? t('feedback.leaderboard') : t('feedback.next')}
      </button>
    </div>
  );
}
