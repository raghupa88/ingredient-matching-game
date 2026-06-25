'use strict';

const { fuzzyMatch, normalizeIngredient } = require('./ingredient-matcher');

const FUZZY_THRESHOLD = 0.8;

function validateIngredients(selected, correct) {
  // Normalize for comparison only — keep originals for display in misses/extras
  const normCorrect = correct.map(normalizeIngredient);
  const normSelected = selected.map(normalizeIngredient);

  const matched = [];
  const misses = [];   // original names from correct[] that weren't matched
  const extras = [];   // original names from selected[] that aren't in correct[]

  for (let i = 0; i < correct.length; i++) {
    const nc = normCorrect[i];
    const exactIdx = normSelected.indexOf(nc);
    if (exactIdx !== -1) {
      matched.push(correct[i]);
    } else {
      const { confidence } = fuzzyMatch(nc, normSelected);
      if (confidence >= FUZZY_THRESHOLD) matched.push(correct[i]);
      else misses.push(correct[i]); // original display name
    }
  }

  for (let i = 0; i < selected.length; i++) {
    const ns = normSelected[i];
    const exactIdx = normCorrect.indexOf(ns);
    if (exactIdx === -1) {
      const { confidence } = fuzzyMatch(ns, normCorrect);
      if (confidence < FUZZY_THRESHOLD) extras.push(selected[i]); // original display name
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
