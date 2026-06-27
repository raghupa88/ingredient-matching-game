import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  ingredients: string[];
  onSubmit: (guess: string) => void;
  disabled: boolean;
}

export function DishGuesser({ ingredients, onSubmit, disabled }: Props) {
  const [guess, setGuess] = useState('');
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guess.trim()) onSubmit(guess.trim());
  }

  return (
    <div className="dish-guesser">
      <div className="ingredient-list-panel">
        <h3>{t('dish_guesser.heading')} <span className="tamil">{t('dish_guesser.heading.tamil')}</span></h3>
        <ul className="ingredient-list">
          {ingredients.map((ing, i) => <li key={i} className="ingredient-chip">{ing}</li>)}
        </ul>
      </div>
      <form className="guess-form" onSubmit={handleSubmit}>
        <label className="guess-label">
          {t('dish_guesser.label')} <span className="tamil">{t('dish_guesser.label.tamil')}</span>
        </label>
        <input
          type="text"
          className="guess-input"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          placeholder={t('dish_guesser.placeholder')}
          disabled={disabled}
          autoFocus
        />
        <button className="btn-primary" type="submit" disabled={!guess.trim() || disabled}>
          {t('dish_guesser.submit')} <span className="tamil">{t('dish_guesser.submit.tamil')}</span>
        </button>
      </form>
    </div>
  );
}
