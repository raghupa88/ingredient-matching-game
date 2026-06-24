import { useGame } from '../context/GameContext';
import { Difficulty } from '../types/game';

const levels: { id: Difficulty; label: string; tamil: string; desc: string }[] = [
  { id: 'easy',   label: 'Easy',   tamil: 'எளிது',      desc: '4 correct + 2 decoys · 1× score' },
  { id: 'medium', label: 'Medium', tamil: 'நடுத்தரம்', desc: '5 correct + 4 decoys · 1.5× score' },
  { id: 'hard',   label: 'Hard',   tamil: 'கடினம்',    desc: '5 correct + 7 decoys · 2× score' },
];

export function DifficultySelector() {
  const { state, dispatch } = useGame();
  return (
    <div className="difficulty-selector">
      <h2 className="section-title">Difficulty <span className="tamil">சிரமம்</span></h2>
      <div className="difficulty-pills">
        {levels.map(l => (
          <button
            key={l.id}
            className={`difficulty-pill ${l.id}${state.difficulty === l.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_DIFFICULTY', difficulty: l.id })}
            title={l.desc}
          >
            <span>{l.label}</span>
            <span className="tamil small">{l.tamil}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
