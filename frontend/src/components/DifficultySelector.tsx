import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { Difficulty } from '../types/game';

const levels: { id: Difficulty; nameKey: string; tamilKey: string; descKey: string }[] = [
  { id: 'easy',   nameKey: 'difficulty.easy.name',   tamilKey: 'difficulty.easy.tamil',   descKey: 'difficulty.easy.desc' },
  { id: 'medium', nameKey: 'difficulty.medium.name', tamilKey: 'difficulty.medium.tamil', descKey: 'difficulty.medium.desc' },
  { id: 'hard',   nameKey: 'difficulty.hard.name',   tamilKey: 'difficulty.hard.tamil',   descKey: 'difficulty.hard.desc' },
];

export function DifficultySelector() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();
  return (
    <div className="difficulty-selector">
      <h2 className="section-title">{t('difficulty.title')}</h2>
      <div className="difficulty-pills">
        {levels.map(l => (
          <button
            key={l.id}
            className={`difficulty-pill ${l.id}${state.difficulty === l.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_DIFFICULTY', difficulty: l.id })}
            title={t(l.descKey)}
          >
            <span>{t(l.nameKey)}</span>
            <span className="tamil small">{t(l.tamilKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
