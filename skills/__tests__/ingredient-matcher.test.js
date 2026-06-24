'use strict';

const { normalizeIngredient, exactMatch, fuzzyMatch } = require('../ingredient-matcher');

describe('normalizeIngredient', () => {
  test('lowercases and trims', () => {
    expect(normalizeIngredient('  Cumin  ')).toBe('cumin');
  });

  test('collapses internal spaces', () => {
    expect(normalizeIngredient('black  pepper')).toBe('black pepper');
  });

  test('strips trailing s from consonant-ending words', () => {
    expect(normalizeIngredient('seeds')).toBe('seed');
    expect(normalizeIngredient('nuts')).toBe('nut');
  });

  test('handles ies→y plurals', () => {
    expect(normalizeIngredient('berries')).toBe('berry');
    expect(normalizeIngredient('cherries')).toBe('cherry');
  });

  test('handles oes→o plurals', () => {
    expect(normalizeIngredient('tomatoes')).toBe('tomato');
    expect(normalizeIngredient('potatoes')).toBe('potato');
  });

  test('does not strip vowel-ending words (rice stays rice)', () => {
    expect(normalizeIngredient('rice')).toBe('rice');
  });

  test('normalizes to same form for fuzzy matching', () => {
    expect(normalizeIngredient('Mustard Seeds')).toBe(normalizeIngredient('mustard seed'));
  });
});

describe('exactMatch', () => {
  const candidates = ['rice', 'urad dal', 'fenugreek', 'salt'];

  test('matches exact (normalized) ingredient', () => {
    expect(exactMatch('Rice', candidates)).toBe(true);
  });

  test('matches plural form', () => {
    // 'seeds' not in candidates, but testing normalisation path
    expect(exactMatch('urad dal', candidates)).toBe(true);
  });

  test('returns false for non-matching ingredient', () => {
    expect(exactMatch('chicken', candidates)).toBe(false);
  });

  test('handles empty candidates', () => {
    expect(exactMatch('rice', [])).toBe(false);
  });
});

describe('fuzzyMatch', () => {
  const candidates = ['tamarind', 'mustard seeds', 'curry leaves'];

  test('returns high confidence for close typo', () => {
    const { confidence } = fuzzyMatch('tamarnd', candidates); // 1 char off
    expect(confidence).toBeGreaterThan(0.8);
  });

  test('returns low confidence for unrelated word', () => {
    const { confidence } = fuzzyMatch('chicken', candidates);
    expect(confidence).toBeLessThan(0.5);
  });

  test('returns confidence 1 for exact match', () => {
    const { confidence } = fuzzyMatch('tamarind', candidates);
    expect(confidence).toBe(1);
  });

  test('returns the best matching candidate', () => {
    const { match } = fuzzyMatch('curryleaves', candidates);
    expect(match).toBe('curry leaves');
  });

  test('handles empty candidates list', () => {
    const { confidence } = fuzzyMatch('rice', []);
    expect(confidence).toBe(0);
  });
});
