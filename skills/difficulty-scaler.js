'use strict';

const CONFIGS = {
  easy:   { correctCount: 4, decoyCount: 2 },
  medium: { correctCount: 5, decoyCount: 4 },
  hard:   { correctCount: 5, decoyCount: 7 },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scaleTiles(dish, difficulty) {
  const { correctCount, decoyCount } = CONFIGS[difficulty] ?? CONFIGS.easy;
  const correct = shuffle(dish.ingredients).slice(0, correctCount);
  const decoys = getDecoySet(dish, difficulty, decoyCount);
  return shuffle([...correct, ...decoys]).map(name => ({ name, isCorrect: correct.includes(name) }));
}

function getDecoySet(dish, difficulty, count) {
  const pool = dish.decoys ?? [];
  if (difficulty === 'hard') {
    return shuffle(pool).slice(0, count);
  }
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function recommendDifficulty(recentScores, currentDifficulty) {
  if (recentScores.length < 3) return { recommendation: 'keep', reason: 'Not enough rounds to evaluate' };
  const avg = recentScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  if (avg > 200 && currentDifficulty !== 'hard') {
    return { recommendation: 'increase', reason: `Average score ${Math.round(avg)} is high` };
  }
  if (avg < 80 && currentDifficulty !== 'easy') {
    return { recommendation: 'decrease', reason: `Average score ${Math.round(avg)} is low` };
  }
  return { recommendation: 'keep', reason: `Average score ${Math.round(avg)} is on track` };
}

module.exports = { scaleTiles, getDecoySet, recommendDifficulty };
