import { useState } from 'react';

interface Props {
  ingredients: string[];
  onSubmit: (guess: string) => void;
  disabled: boolean;
}

export function DishGuesser({ ingredients, onSubmit, disabled }: Props) {
  const [guess, setGuess] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guess.trim()) onSubmit(guess.trim());
  }

  return (
    <div className="dish-guesser">
      <div className="ingredient-list-panel">
        <h3>Ingredients <span className="tamil">பொருட்கள்</span></h3>
        <ul className="ingredient-list">
          {ingredients.map((ing, i) => <li key={i} className="ingredient-chip">{ing}</li>)}
        </ul>
      </div>
      <form className="guess-form" onSubmit={handleSubmit}>
        <label className="guess-label">
          What dish is this? <span className="tamil">இது என்ன சாப்பாடு?</span>
        </label>
        <input
          type="text"
          className="guess-input"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          placeholder="Type dish name..."
          disabled={disabled}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={!guess.trim() || disabled}>
          Guess! <span className="tamil">யூகி!</span>
        </button>
      </form>
    </div>
  );
}
