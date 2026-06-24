'use strict';

const { calculateScore, applyPenalty, HINT_PENALTY } = require('../score-calculator');

describe('calculateScore', () => {
  test('base score with no time or hints, easy', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'easy', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(100);
  });

  test('time bonus adds 2 points per second', () => {
    const score = calculateScore({ timeRemaining: 10, difficulty: 'easy', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(120); // 100 + 10*2
  });

  test('medium difficulty multiplier 1.5×', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'medium', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(150);
  });

  test('hard difficulty multiplier 2×', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'hard', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(200);
  });

  test('hint penalty deducted before multiplier', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'easy', hintsUsed: 2, partialRatio: 1 });
    expect(score).toBe(80); // (100 - 20) * 1
  });

  test('partial credit capped at 50% of base score', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'easy', hintsUsed: 0, partialRatio: 0.6 });
    expect(score).toBe(50); // 100 * min(0.6, 0.5) = 50
  });

  test('partial ratio at exactly 0.5 gives 50 base', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'easy', hintsUsed: 0, partialRatio: 0.5 });
    expect(score).toBe(50);
  });

  test('negative time remaining treated as 0', () => {
    const score = calculateScore({ timeRemaining: -5, difficulty: 'easy', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(100);
  });

  test('score does not go below 0', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'easy', hintsUsed: 20, partialRatio: 0 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('unknown difficulty defaults to multiplier 1', () => {
    const score = calculateScore({ timeRemaining: 0, difficulty: 'extreme', hintsUsed: 0, partialRatio: 1 });
    expect(score).toBe(100);
  });
});

describe('applyPenalty', () => {
  test('subtracts penalty from current score', () => {
    expect(applyPenalty(100, 10)).toBe(90);
  });

  test('clamps result at 0', () => {
    expect(applyPenalty(5, 20)).toBe(0);
  });

  test('zero penalty returns original score', () => {
    expect(applyPenalty(150, 0)).toBe(150);
  });
});

describe('HINT_PENALTY constant', () => {
  test('is 10', () => {
    expect(HINT_PENALTY).toBe(10);
  });
});
