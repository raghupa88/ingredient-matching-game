import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { api } from '../services/api';

export function CulturalContext() {
  const { state, dispatch } = useGame();
  const [loading, setLoading] = useState(false);

  async function loadContext() {
    if (!state.currentRound) return;
    setLoading(true);
    try {
      const data = await api.getCulturalContext(state.currentRound.dishId);
      dispatch({ type: 'SET_CULTURAL_CONTEXT', ctx: { tamilName: data.tamilName, region: data.region, funFact: data.funFact } });
    } catch {
      dispatch({ type: 'SET_CULTURAL_CONTEXT', ctx: { tamilName: '', region: '', funFact: 'A beloved dish with rich cultural history.' } });
    } finally {
      setLoading(false);
    }
  }

  if (!state.culturalContext) {
    return (
      <button className="btn-secondary culture-btn" onClick={loadContext} disabled={loading}>
        {loading ? 'Loading…' : '🏛️ Cultural Context'}
      </button>
    );
  }

  const { tamilName, region, funFact } = state.culturalContext;
  return (
    <div className="cultural-context-box">
      <button className="close-btn" onClick={() => dispatch({ type: 'CLEAR_CULTURAL_CONTEXT' })}>✕</button>
      {tamilName && <p className="tamil dish-tamil-name">{tamilName}</p>}
      <p className="region-badge">📍 {region}</p>
      <p className="fun-fact">{funFact}</p>
    </div>
  );
}
