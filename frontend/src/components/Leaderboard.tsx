import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

interface Props { onRestart: () => void; }

export function Leaderboard({ onRestart }: Props) {
  const { state } = useGame();
  const { t } = useTranslation();

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">{t('leaderboard.title')} <span className="tamil">{t('leaderboard.title.tamil')}</span></h2>
      <p className="final-score">{t('leaderboard.your_score')} <strong>{state.score}</strong></p>

      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>{t('leaderboard.col_rank')}</th>
            <th>{t('leaderboard.col_player')}</th>
            <th>{t('leaderboard.col_score')}</th>
          </tr>
        </thead>
        <tbody>
          {state.leaderboard.map((e, i) => (
            <tr key={i} className={e.score === state.score ? 'highlight' : ''}>
              <td>{i + 1}</td>
              <td>{e.playerId}</td>
              <td>{e.score}</td>
            </tr>
          ))}
          {state.leaderboard.length === 0 && (
            <tr><td colSpan={3}>{t('leaderboard.empty')}</td></tr>
          )}
        </tbody>
      </table>

      <button className="btn-primary restart-btn" onClick={onRestart}>
        {t('leaderboard.play_again')} <span className="tamil">{t('leaderboard.play_again.tamil')}</span>
      </button>
    </div>
  );
}
