'use strict';

const { fuzzyMatch, normalizeIngredient } = require('./ingredient-matcher');

const FUZZY_THRESHOLD = 0.8;

function validateIngredients(selected, correct) {
  const normCorrect = correct.map(normalizeIngredient);
  const normSelected = selected.map(normalizeIngredient);

  const matched = [];
  const misses = [];
  const extras = [];

  for (const c of normCorrect) {
    const exact = normSelected.includes(c);
    if (exact) {
      matched.push(c);
    } else {
      const { confidence } = fuzzyMatch(c, normSelected);
      if (confidence >= FUZZY_THRESHOLD) matched.push(c);
      else misses.push(c);
    }
  }

  for (const s of normSelected) {
    const exact = normCorrect.includes(s);
    if (!exact) {
      const { confidence } = fuzzyMatch(s, normCorrect);
      if (confidence < FUZZY_THRESHOLD) extras.push(s);
    }
  }

  const isCorrect = misses.length === 0 && extras.length === 0;
  const partialRatio = correct.length > 0 ? matched.length / correct.length : 0;
  return { isCorrect, matched, misses, extras, partialRatio };
}

function validateDishName(guess, correctName) {
  const { confidence } = fuzzyMatch(guess, [correctName]);
  const isCorrect = confidence >= FUZZY_THRESHOLD;
  return { isCorrect, confidence };
}

module.exports = { validateIngredients, validateDishName };
