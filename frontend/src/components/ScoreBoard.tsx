import { useGame } from '../context/GameContext';

const ROUNDS = 5;

export function ScoreBoard() {
  const { state } = useGame();
  return (
    <div className="scoreboard">
      <div className="score-item">
        <span className="score-label">Score <span className="tamil">மதிப்பெண்</span></span>
        <span className="score-value">{state.score}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Round <span className="tamil">சுற்று</span></span>
        <span className="score-value">{state.roundsPlayed}/{ROUNDS}</span>
      </div>
      <div className="score-item">
        <span className="score-label">Mode</span>
        <span className="score-value">{state.mode === 1 ? '🎴' : '🍽️'}</span>
      </div>
    </div>
  );
}
