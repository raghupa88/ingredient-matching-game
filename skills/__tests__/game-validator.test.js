'use strict';

const { validateIngredients, validateDishName } = require('../game-validator');

describe('validateIngredients', () => {
  const correct = ['rice', 'urad dal', 'fenugreek', 'salt'];

  test('perfect match returns isCorrect true with no misses or extras', () => {
    const result = validateIngredients(['rice', 'urad dal', 'fenugreek', 'salt'], correct);
    expect(result.isCorrect).toBe(true);
    expect(result.misses).toHaveLength(0);
    expect(result.extras).toHaveLength(0);
    expect(result.partialRatio).toBe(1);
  });

  test('partial match returns correct partialRatio', () => {
    const result = validateIngredients(['rice', 'urad dal'], correct);
    expect(result.isCorrect).toBe(false);
    expect(result.partialRatio).toBeCloseTo(0.5);
    expect(result.misses.length).toBeGreaterThan(0);
  });

  test('extra ingredient that does not match anything is flagged in extras', () => {
    const result = validateIngredients(['rice', 'urad dal', 'fenugreek', 'salt', 'chicken'], correct);
    expect(result.extras).toContain('chicken');
  });

  test('handles fuzzy near-match (typo)', () => {
    // 'feenugreek' is close enough to 'fenugreek' (1 char diff)
    const result = validateIngredients(['rice', 'urad dal', 'feenugreek', 'salt'], correct);
    expect(result.misses).not.toContain('fenugreek');
  });

  test('empty selected returns all correct as misses', () => {
    const result = validateIngredients([], correct);
    expect(result.isCorrect).toBe(false);
    expect(result.misses).toHaveLength(correct.length);
    expect(result.partialRatio).toBe(0);
  });

  test('handles plural forms via normalization', () => {
    const result = validateIngredients(['rice', 'urad dal', 'fenugreeks', 'salts'], correct);
    // 'fenugreeks' normalizes to 'fenugreek', 'salts' normalizes to 'salt'
    expect(result.isCorrect).toBe(true);
  });

  test('empty correct list returns isCorrect true and partialRatio 0', () => {
    const result = validateIngredients([], []);
    expect(result.isCorrect).toBe(true);
    expect(result.partialRatio).toBe(0);
  });
});

describe('validateDishName', () => {
  test('exact match returns isCorrect true and confidence 1', () => {
    const result = validateDishName('Idli', 'Idli');
    expect(result.isCorrect).toBe(true);
    expect(result.confidence).toBe(1);
  });

  test('case-insensitive match', () => {
    const result = validateDishName('dosa', 'Dosa');
    expect(result.isCorrect).toBe(true);
  });

  test('close typo passes fuzzy threshold for longer words', () => {
    // 'muruku' vs 'murukku' — 1 char off in 7 chars → confidence = 6/7 ≈ 0.857 > 0.8
    const result = validateDishName('muruku', 'murukku');
    expect(result.isCorrect).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('completely wrong guess fails', () => {
    const result = validateDishName('pizza', 'Idli');
    expect(result.isCorrect).toBe(false);
  });

  test('returns confidence value between 0 and 1', () => {
    const result = validateDishName('anything', 'Idli');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
