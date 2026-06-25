const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; // for display only
const ENABLED = Boolean(WEBHOOK_URL);

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

async function sendWebhook(content: string, embeds: DiscordEmbed[] = []): Promise<void> {
  if (!ENABLED) return;
  try {
    const res = await fetch(WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds }),
    });
    if (!res.ok) console.error(`[Discord] Webhook failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error('[Discord] Webhook error:', err);
  }
}

// Saffron orange — matches the game's Tamil Nadu theme
const COLOR_SAFFRON = 0xFF9933;
const COLOR_GREEN   = 0x138808;
const COLOR_RED     = 0xE63946;

export async function notifyScoreSubmitted(playerId: string, score: number, rank: number): Promise<void> {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  await sendWebhook('', [{
    title: `${medal} New Score — ${playerId}`,
    description: `**${score} points** submitted to the leaderboard`,
    color: rank <= 3 ? COLOR_SAFFRON : COLOR_GREEN,
    fields: [
      { name: 'Rank', value: String(rank), inline: true },
      { name: 'Score', value: String(score), inline: true },
    ],
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyHighScore(playerId: string, score: number): Promise<void> {
  await sendWebhook(`🏆 **New high score!**`, [{
    title: '🏆 High Score Broken!',
    description: `**${playerId}** just set a new all-time high score of **${score} points**!`,
    color: COLOR_SAFFRON,
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyPerfectRound(playerId: string, dishName: string, score: number): Promise<void> {
  await sendWebhook('', [{
    title: '✨ Perfect Round!',
    description: `**${playerId}** identified all ingredients in **${dishName}** with a perfect score of **${score}**!`,
    color: COLOR_GREEN,
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyGameStarted(playerId: string, difficulty: string, mode: number): Promise<void> {
  await sendWebhook('', [{
    title: '🎮 New Game Started',
    description: `**${playerId}** started a **${difficulty}** difficulty game in Mode ${mode}`,
    color: 0x5865F2, // Discord blurple
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export const discord = { notifyScoreSubmitted, notifyHighScore, notifyPerfectRound, notifyGameStarted, isEnabled: () => ENABLED };
