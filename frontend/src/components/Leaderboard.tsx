import { useGame } from '../context/GameContext';

interface Props { onRestart: () => void; }

export function Leaderboard({ onRestart }: Props) {
  const { state } = useGame();

  return (
    <div className="leaderboard">
      <h2 className="leaderboard-title">🏆 Game Over! <span className="tamil">விளையாட்டு முடிந்தது</span></h2>
      <p className="final-score">Your Score: <strong>{state.score}</strong></p>

      <table className="leaderboard-table">
        <thead>
          <tr><th>#</th><th>Player</th><th>Score</th></tr>
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
            <tr><td colSpan={3}>No scores yet. You're the first!</td></tr>
          )}
        </tbody>
      </table>

      <button className="btn-primary restart-btn" onClick={onRestart}>
        🔄 Play Again <span className="tamil">மீண்டும் விளையாடு</span>
      </button>
    </div>
  );
}
