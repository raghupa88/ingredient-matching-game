'use strict';

function getTag(dish) {
  return {
    region: dish.region ?? 'Unknown',
    tamilName: dish.tamilName ?? '',
    funFact: dish.funFact ?? '',
    language: dish.region === 'Tamil Nadu' ? 'Tamil' : 'Indian',
  };
}

function getTamilName(dish) {
  return dish.tamilName ?? dish.name;
}

function getFunFact(dish) {
  return dish.funFact ?? `${dish.name} is a beloved dish from ${dish.region ?? 'India'}.`;
}

module.exports = { getTag, getTamilName, getFunFact };
