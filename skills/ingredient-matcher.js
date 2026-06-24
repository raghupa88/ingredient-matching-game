'use strict';

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalizeIngredient(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ies$/, 'y')   // berries→berry
    .replace(/oes$/, 'o')   // tomatoes→tomato
    .replace(/([^aeiou])es$/, '$1') // leaves→leaf not covered but catches most
    .replace(/([^aeiou])s$/, '$1'); // seeds→seed, but not tomatoes (already handled)
}

function exactMatch(guess, candidates) {
  const norm = normalizeIngredient(guess);
  return candidates.some(c => normalizeIngredient(c) === norm);
}

function fuzzyMatch(guess, candidates) {
  const normGuess = normalizeIngredient(guess);
  let best = { match: null, confidence: 0 };
  for (const c of candidates) {
    const normC = normalizeIngredient(c);
    const maxLen = Math.max(normGuess.length, normC.length);
    if (maxLen === 0) continue;
    const dist = levenshtein(normGuess, normC);
    const confidence = 1 - dist / maxLen;
    if (confidence > best.confidence) best = { match: c, confidence };
  }
  return best;
}

module.exports = { normalizeIngredient, exactMatch, fuzzyMatch };
