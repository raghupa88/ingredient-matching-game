'use strict';

const TAMIL_WEIGHT = 3;

// Per-session history: sessionId → Set<dishId>
const sessionHistories = new Map();

function getHistory(sessionId) {
  if (!sessionHistories.has(sessionId)) sessionHistories.set(sessionId, new Set());
  return sessionHistories.get(sessionId);
}

function pickRound(dishes, difficulty, excludeIds = [], sessionId = 'default') {
  const history = getHistory(sessionId);

  const byDifficulty = difficulty ? dishes.filter(d => d.difficulty === difficulty) : dishes;
  const available = byDifficulty.filter(d => !excludeIds.includes(d.id) && !history.has(d.id));

  // If all difficulty-matching dishes have been seen, reset session history (not excludeIds)
  const pool = available.length > 0 ? available : byDifficulty.filter(d => !excludeIds.includes(d.id));

  // If every dish of this difficulty is in excludeIds, fall back to full dish list
  const src = pool.length > 0 ? pool : dishes.filter(d => !excludeIds.includes(d.id));
  const fallback = src.length > 0 ? src : dishes;

  const weighted = [];
  for (const dish of fallback) {
    const weight = dish.region === 'Tamil Nadu' ? TAMIL_WEIGHT : 1;
    for (let i = 0; i < weight; i++) weighted.push(dish);
  }

  const chosen = weighted[Math.floor(Math.random() * weighted.length)];
  history.add(chosen.id);
  return chosen;
}

function resetHistory(sessionId = 'default') {
  sessionHistories.set(sessionId, new Set());
}

function clearSession(sessionId) {
  sessionHistories.delete(sessionId);
}

module.exports = { pickRound, resetHistory, clearSession };
