'use strict';

const MULTIPLIERS = { easy: 1, medium: 1.5, hard: 2 };
const BASE_SCORE = 100;
const TIME_BONUS_PER_SECOND = 2;
const HINT_PENALTY = 10;
const PARTIAL_CREDIT_MAX = 0.5;

function calculateScore({ timeRemaining, difficulty, hintsUsed = 0, partialRatio = 1 }) {
  const multiplier = MULTIPLIERS[difficulty] ?? 1;
  const timeBonus = Math.max(0, timeRemaining) * TIME_BONUS_PER_SECOND;
  const hintDeduction = hintsUsed * HINT_PENALTY;
  const base = partialRatio >= 1
    ? BASE_SCORE
    : Math.round(BASE_SCORE * Math.min(partialRatio, PARTIAL_CREDIT_MAX));
  return Math.max(0, Math.round((base + timeBonus - hintDeduction) * multiplier));
}

function applyPenalty(currentScore, penaltyPoints) {
  return Math.max(0, currentScore - penaltyPoints);
}

module.exports = { calculateScore, applyPenalty, HINT_PENALTY };
