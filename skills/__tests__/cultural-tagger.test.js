'use strict';

const { getTag, getTamilName, getFunFact } = require('../cultural-tagger');

const tamilDish = {
  id: 'idli',
  name: 'Idli',
  tamilName: 'இட்லி',
  region: 'Tamil Nadu',
  funFact: 'Idli is a fermented rice cake, a staple breakfast across Tamil Nadu.',
};

const otherDish = {
  id: 'biryani',
  name: 'Hyderabadi Biryani',
  region: 'Telangana',
  funFact: 'Cooked in a sealed pot via dum method.',
};

const minimalDish = { id: 'x', name: 'Unknown' };

describe('getTag', () => {
  test('returns correct region and tamilName for Tamil dish', () => {
    const tag = getTag(tamilDish);
    expect(tag.region).toBe('Tamil Nadu');
    expect(tag.tamilName).toBe('இட்லி');
    expect(tag.language).toBe('Tamil');
  });

  test('returns Indian language for non-Tamil dish', () => {
    const tag = getTag(otherDish);
    expect(tag.language).toBe('Indian');
  });

  test('falls back to Unknown region if missing', () => {
    const tag = getTag(minimalDish);
    expect(tag.region).toBe('Unknown');
  });

  test('returns empty tamilName when missing', () => {
    const tag = getTag(otherDish);
    expect(tag.tamilName).toBe('');
  });

  test('returns funFact when present', () => {
    const tag = getTag(tamilDish);
    expect(tag.funFact).toBe(tamilDish.funFact);
  });
});

describe('getTamilName', () => {
  test('returns tamilName when present', () => {
    expect(getTamilName(tamilDish)).toBe('இட்லி');
  });

  test('falls back to dish.name when tamilName is missing', () => {
    expect(getTamilName(otherDish)).toBe('Hyderabadi Biryani');
  });

  test('handles minimal dish', () => {
    expect(getTamilName(minimalDish)).toBe('Unknown');
  });
});

describe('getFunFact', () => {
  test('returns funFact when present', () => {
    expect(getFunFact(tamilDish)).toContain('fermented rice cake');
  });

  test('generates default fun fact when missing', () => {
    const fact = getFunFact(minimalDish);
    expect(fact).toContain('Unknown');
  });

  test('includes region in default fun fact', () => {
    const dishWithRegion = { id: 'test', name: 'Test Dish', region: 'Kerala' };
    const fact = getFunFact(dishWithRegion);
    expect(fact).toContain('Kerala');
  });
});
