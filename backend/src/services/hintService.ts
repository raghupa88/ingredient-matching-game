import { apmLoader } from './apmLoader';
import { getSession } from './gameService';
import dishes from '../data/dishes.json';

export function generateHint(sessionId: string): string {
  const session = getSession(sessionId);
  const round = session.currentRound;
  if (!round) return 'No active round.';

  const dish = dishes.find(d => d.id === round.dishId);
  const tamilName = dish?.tamilName ?? round.dishName;
  const region = dish?.region ?? 'India';

  // found_ingredients is what the player might have guessed; approximate as empty for now
  const missingCount = round.correctIngredients.length;

  const prompt = apmLoader.renderPrompt('hint-generator', {
    dish_name: round.dishName,
    tamil_name: tamilName,
    region,
    found_ingredients: 'unknown',
    missing_count: String(missingCount),
  });

  return prompt || `Think about what gives ${round.dishName} its signature flavour.`;
}

export function generateCulturalContext(dishId: string): { tamilName: string; region: string; funFact: string; prompt: string } {
  const dish = dishes.find(d => d.id === dishId);
  if (!dish) throw new Error('Dish not found');

  const prompt = apmLoader.renderPrompt('cultural-context', {
    dish_name: dish.name,
    tamil_name: dish.tamilName,
    region: dish.region,
  });

  return { tamilName: dish.tamilName, region: dish.region, funFact: dish.funFact, prompt };
}
