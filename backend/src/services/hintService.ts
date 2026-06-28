import { getSession } from './gameService';
import dishes from '../data/dishes.json';

export function generateHint(sessionId: string): string {
  const session = getSession(sessionId);
  const round = session.currentRound;
  if (!round) return 'No active round.';

  const dish = dishes.find(d => d.id === round.dishId);
  const region = dish?.region ?? 'India';
  const ingredients = round.correctIngredients;

  if (ingredients.length === 0) {
    return `This dish from ${region} has a distinctive flavour profile.`;
  }

  const ingredient = ingredients[Math.floor(Math.random() * ingredients.length)];
  return buildIngredientClue(ingredient, region);
}

function buildIngredientClue(ingredient: string, region: string): string {
  const lower = ingredient.toLowerCase();
  const initial = ingredient[0].toUpperCase();

  if (/dal|lentil|\bgram\b|chana/.test(lower))
    return `A protein-rich legume is key — it starts with "${initial}".`;
  if (/\brice\b/.test(lower))
    return `A grain, soaked or cooked, forms part of this dish — starts with "${initial}".`;
  if (/coconut/.test(lower))
    return `A tropical ingredient adds richness and sweetness — starts with "${initial}".`;
  if (/tamarind/.test(lower))
    return `A tangy souring agent beloved in ${region} cooking — starts with "${initial}".`;
  if (/mustard/.test(lower))
    return `A tiny seed that crackles in hot oil — starts with "${initial}".`;
  if (/curry leaf|curry leave/.test(lower))
    return `Aromatic leaves from a tree native to India — starts with "${initial}".`;
  if (/\boil\b/.test(lower))
    return `A cooking fat is essential here — starts with "${initial}".`;
  if (/\bsalt\b/.test(lower))
    return `Every savoury dish needs this mineral — starts with "${initial}".`;
  if (/\bwater\b/.test(lower))
    return `The simplest of all ingredients — starts with "${initial}".`;
  if (/onion|shallot/.test(lower))
    return `An allium that builds the flavour base — starts with "${initial}".`;
  if (/tomato/.test(lower))
    return `A red fruit that adds tanginess — starts with "${initial}".`;
  if (/ginger/.test(lower))
    return `A pungent rhizome that adds warmth — starts with "${initial}".`;
  if (/garlic/.test(lower))
    return `A pungent bulb used across cuisines — starts with "${initial}".`;
  if (/chilli|chili|pepper/.test(lower))
    return `This spice brings heat to the dish — starts with "${initial}".`;
  if (/fenugreek/.test(lower))
    return `Slightly bitter seeds with a maple-like aroma — starts with "${initial}".`;
  if (/cumin/.test(lower))
    return `Earthy, warm seeds used in tempering — starts with "${initial}".`;
  if (/turmeric/.test(lower))
    return `A golden-yellow spice with earthy flavour — starts with "${initial}".`;

  return `One key ingredient starts with "${initial}" — think about what this ${region} dish needs.`;
}

export function generateCulturalContext(dishId: string): { tamilName: string; region: string; funFact: string } {
  const dish = dishes.find(d => d.id === dishId);
  if (!dish) throw new Error('Dish not found');
  return { tamilName: dish.tamilName, region: dish.region, funFact: dish.funFact };
}
