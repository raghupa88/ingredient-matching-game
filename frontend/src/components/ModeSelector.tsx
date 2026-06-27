import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { Mode } from '../types/game';

export function ModeSelector() {
  const { state, dispatch } = useGame();
  const { t } = useTranslation();

  const modes: { id: Mode; titleKey: string; tamilKey: string; descKey: string; icon: string }[] = [
    { id: 1, titleKey: 'mode.tile_flip.name', tamilKey: 'mode.tile_flip.tamil', descKey: 'mode.tile_flip.desc', icon: '🎴' },
    { id: 2, titleKey: 'mode.dish_guess.name', tamilKey: 'mode.dish_guess.tamil', descKey: 'mode.dish_guess.desc', icon: '🍽️' },
  ];

  return (
    <div className="mode-selector">
      <h2 className="section-title">{t('mode.title')}</h2>
      <div className="mode-cards">
        {modes.map(m => (
          <button
            key={m.id}
            className={`mode-card${state.mode === m.id ? ' selected' : ''}`}
            onClick={() => dispatch({ type: 'SET_MODE', mode: m.id })}
          >
            <span className="mode-icon">{m.icon}</span>
            <strong>{t(m.titleKey)}</strong>
            <span className="tamil small">{t(m.tamilKey)}</span>
            <p>{t(m.descKey)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
