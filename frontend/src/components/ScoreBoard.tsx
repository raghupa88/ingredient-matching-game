import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

const ROUNDS = 5;

export function ScoreBoard() {
  const { state } = useGame();
  const { t } = useTranslation();
  return (
    <div className="scoreboard">
      <div className="score-item">
        <span className="score-label">{t('score.label')} <span className="tamil">{t('score.label.tamil')}</span></span>
        <span className="score-value">{state.score}</span>
      </div>
      <div className="score-item">
        <span className="score-label">{t('score.round')} <span className="tamil">{t('score.round.tamil')}</span></span>
        <span className="score-value">{state.roundsPlayed}/{ROUNDS}</span>
      </div>
      <div className="score-item">
        <span className="score-label">{t('score.mode')}</span>
        <span className="score-value">{state.mode === 1 ? '🎴' : '🍽️'}</span>
      </div>
    </div>
  );
}
