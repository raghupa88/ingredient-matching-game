import { useGame } from '../context/GameContext';
import { Mode } from '../types/game';

export function ModeSelector() {
  const { state, dispatch } = useGame();

  const modes: { id: Mode; title: string; tamil: string; desc: string; icon: string }[] = [
    { id: 1, title: 'Tile Flip', tamil: 'பொருள் கண்டுபிடி', desc: 'A dish name is shown. Flip tiles to find all matching ingredients!', icon: '🎴' },
    { id: 2, title: 'Dish Guess', tamil: 'சாப்பாடு கண்டுபிடி', desc: 'Ingredients are listed. Type the name of the dish to win!', icon: '🍽️' },
  ];

  return (
    <div className="mode-selector">
      <h2 className="section-title">Choose Your Mode <span className="tamil">விளையாட்டு முறை</span></h2>
      <div className="mode-cards">
        {modes.map(m => (
          <button
            key={m.id}
            className={`mode-card${state.mode === m.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_MODE', mode: m.id })}
          >
            <span className="mode-icon">{m.icon}</span>
            <strong>{m.title}</strong>
            <span className="tamil small">{m.tamil}</span>
            <p>{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
