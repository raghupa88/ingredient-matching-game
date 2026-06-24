import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';

export function HintPanel() {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);

  async function requestHint() {
    if (!state.sessionId) return;
    setLoading(true);
    try {
      const data = await api.getHint(state.sessionId);
      dispatch({ type: 'SET_HINT', hint: data.hint });
    } catch {
      dispatch({ type: 'SET_HINT', hint: 'Think about the key flavour of this dish!' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hint-panel">
      {!state.hint ? (
        <button className="btn-secondary hint-btn" onClick={requestHint} disabled={loading}>
          {loading ? 'Getting hint…' : '💡 Hint (−10 pts)'}
        </button>
      ) : (
        <div className="hint-box">
          <span className="hint-icon">💡</span>
          <p className="hint-text">{state.hint}</p>
          <button className="close-btn" onClick={() => dispatch({ type: 'CLEAR_HINT' })}>✕</button>
        </div>
      )}
    </div>
  );
}
