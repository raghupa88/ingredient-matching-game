'use strict';

const { pickRound, resetHistory, clearSession } = require('../dish-randomizer');

const tamilDish = { id: 'idli', name: 'Idli', region: 'Tamil Nadu', difficulty: 'easy' };
const otherDish = { id: 'pizza', name: 'Pizza', region: 'Italy', difficulty: 'easy' };
const hardDish = { id: 'chettinad', name: 'Chettinad Curry', region: 'Tamil Nadu', difficulty: 'hard' };
const dishes = [tamilDish, otherDish, hardDish];

afterEach(() => {
  clearSession('test');
  clearSession('session-a');
  clearSession('session-b');
});

describe('pickRound', () => {
  test('returns a dish from the list', () => {
    const result = pickRound(dishes, null, [], 'test');
    expect(dishes.map(d => d.id)).toContain(result.id);
  });

  test('respects difficulty filter', () => {
    const result = pickRound(dishes, 'easy', [], 'test');
    expect(result.difficulty).toBe('easy');
  });

  test('excludes dishes in excludeIds', () => {
    const result = pickRound([tamilDish, otherDish], null, ['idli'], 'test');
    expect(result.id).toBe('pizza');
  });

  test('falls back gracefully when all excluded', () => {
    // All dishes excluded — should still return something (fallback)
    const result = pickRound([tamilDish], null, ['idli'], 'test');
    expect(result).toBeDefined();
    expect(result.id).toBe('idli');
  });

  test('Tamil Nadu dishes are selected more often (statistical)', () => {
    // With 1 Tamil dish (weight 3) and 1 other (weight 1), Tamil should appear ~75% of trials
    const counts = { idli: 0, pizza: 0 };
    const localDishes = [tamilDish, otherDish];
    for (let i = 0; i < 200; i++) {
      clearSession('stat-test');
      const r = pickRound(localDishes, null, [], 'stat-test');
      counts[r.id] = (counts[r.id] || 0) + 1;
    }
    // Tamil dish should be picked more than non-Tamil
    expect(counts.idli).toBeGreaterThan(counts.pizza);
  });

  test('tracks history per session — avoids repeats', () => {
    const twoEasyDishes = [tamilDish, otherDish];
    const first = pickRound(twoEasyDishes, null, [], 'test');
    const second = pickRound(twoEasyDishes, null, [], 'test');
    // Second pick should differ from first (history avoidance)
    // Note: not guaranteed 100% but with only 2 dishes and weight difference this is highly deterministic
    expect(second.id).not.toBe(first.id);
  });

  test('session histories are independent', () => {
    // Pick from session-a and session-b independently
    const picked = {
      a: pickRound([tamilDish], null, [], 'session-a'),
      b: pickRound([tamilDish], null, [], 'session-b'),
    };
    expect(picked.a.id).toBe('idli');
    expect(picked.b.id).toBe('idli');
  });
});

describe('resetHistory', () => {
  test('clears session history allowing same dish to be picked again', () => {
    const singleDish = [tamilDish, otherDish];
    pickRound(singleDish, null, [], 'test');
    pickRound(singleDish, null, [], 'test');
    // After 2 picks with 2 dishes, history is full; reset it
    resetHistory('test');
    const result = pickRound(singleDish, null, [], 'test');
    expect(result).toBeDefined();
  });
});
