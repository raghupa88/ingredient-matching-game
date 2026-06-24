'use strict';

const { scaleTiles, getDecoySet, recommendDifficulty } = require('../difficulty-scaler');

const dish = {
  id: 'idli',
  name: 'Idli',
  ingredients: ['rice', 'urad dal', 'fenugreek', 'salt', 'water'],
  decoys: ['tamarind', 'pepper', 'cumin', 'ghee', 'mustard seeds', 'curry leaves', 'green chilli'],
};

describe('scaleTiles', () => {
  test('easy: returns 4 correct + 2 decoy tiles (6 total)', () => {
    const tiles = scaleTiles(dish, 'easy');
    expect(tiles).toHaveLength(6);
    const correct = tiles.filter(t => t.isCorrect);
    const decoys = tiles.filter(t => !t.isCorrect);
    expect(correct).toHaveLength(4);
    expect(decoys).toHaveLength(2);
  });

  test('medium: returns 5 correct + 4 decoy tiles (9 total)', () => {
    const tiles = scaleTiles(dish, 'medium');
    expect(tiles).toHaveLength(9);
    const correct = tiles.filter(t => t.isCorrect);
    expect(correct).toHaveLength(5);
  });

  test('hard: returns 5 correct + 7 decoy tiles (12 total)', () => {
    const tiles = scaleTiles(dish, 'hard');
    expect(tiles).toHaveLength(12);
  });

  test('all correct tiles come from dish.ingredients', () => {
    const tiles = scaleTiles(dish, 'easy');
    const correctNames = tiles.filter(t => t.isCorrect).map(t => t.name);
    for (const name of correctNames) {
      expect(dish.ingredients).toContain(name);
    }
  });

  test('all decoy tiles come from dish.decoys', () => {
    const tiles = scaleTiles(dish, 'easy');
    const decoyNames = tiles.filter(t => !t.isCorrect).map(t => t.name);
    for (const name of decoyNames) {
      expect(dish.decoys).toContain(name);
    }
  });

  test('unknown difficulty falls back to easy config', () => {
    const tiles = scaleTiles(dish, 'extreme');
    expect(tiles).toHaveLength(6);
  });

  test('handles dish with no decoys', () => {
    const noDishDecoys = { ...dish, decoys: [] };
    const tiles = scaleTiles(noDishDecoys, 'easy');
    expect(tiles.filter(t => t.isCorrect)).toHaveLength(4);
    expect(tiles.filter(t => !t.isCorrect)).toHaveLength(0);
  });
});

describe('getDecoySet', () => {
  test('returns up to requested count', () => {
    const decoys = getDecoySet(dish, 'easy', 3);
    expect(decoys.length).toBeLessThanOrEqual(3);
  });

  test('returns all available when pool smaller than count', () => {
    const dishFewDecoys = { ...dish, decoys: ['tamarind'] };
    const decoys = getDecoySet(dishFewDecoys, 'easy', 5);
    expect(decoys).toHaveLength(1);
  });
});

describe('recommendDifficulty', () => {
  test('recommends increase when avg > 200 and not hard', () => {
    const { recommendation } = recommendDifficulty([250, 220, 210], 'easy');
    expect(recommendation).toBe('increase');
  });

  test('recommends decrease when avg < 80 and not easy', () => {
    const { recommendation } = recommendDifficulty([60, 70, 50], 'hard');
    expect(recommendation).toBe('decrease');
  });

  test('recommends keep when avg is mid-range', () => {
    const { recommendation } = recommendDifficulty([120, 130, 110], 'medium');
    expect(recommendation).toBe('keep');
  });

  test('returns keep when fewer than 3 rounds played', () => {
    const { recommendation } = recommendDifficulty([200], 'easy');
    expect(recommendation).toBe('keep');
  });

  test('does not recommend increase if already hard', () => {
    const { recommendation } = recommendDifficulty([300, 280, 250], 'hard');
    expect(recommendation).toBe('keep');
  });

  test('does not recommend decrease if already easy', () => {
    const { recommendation } = recommendDifficulty([10, 20, 30], 'easy');
    expect(recommendation).toBe('keep');
  });
});
