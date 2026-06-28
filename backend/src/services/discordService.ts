export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

// Rolling window to stay safely under Discord's 30-req/min webhook limit
const sendTimestamps: number[] = [];
const RATE_LIMIT = 25;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(): boolean {
  const now = Date.now();
  while (sendTimestamps.length > 0 && sendTimestamps[0] < now - RATE_WINDOW_MS) {
    sendTimestamps.shift();
  }
  if (sendTimestamps.length >= RATE_LIMIT) return false;
  sendTimestamps.push(now);
  return true;
}

// Saffron orange — matches the game's Tamil Nadu theme
const COLOR_SAFFRON = 0xFF9933;
const COLOR_GREEN   = 0x138808;

async function sendWebhook(embeds: DiscordEmbed[], content?: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  if (!checkRateLimit()) {
    console.warn('[Discord] Rate limit reached — notification skipped');
    return;
  }
  try {
    const body: { embeds: DiscordEmbed[]; content?: string } = { embeds };
    if (content) body.content = content;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error(`[Discord] Webhook failed: ${res.status} ${res.statusText}`);
  } catch (err) {
    console.error('[Discord] Webhook error:', err);
  }
}

export async function notifyGameStarted(playerId: string, difficulty: string, mode: number): Promise<void> {
  await sendWebhook([{
    title: '🎮 New Game Started',
    description: `**${playerId}** started a **${difficulty}** difficulty game in Mode ${mode}`,
    color: 0x5865F2,
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export async function notifyScoreSubmitted(playerId: string, score: number, rank: number): Promise<void> {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  await sendWebhook([{
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
  await sendWebhook([{
    title: '🏆 High Score Broken!',
    description: `**${playerId}** just set a new all-time high score of **${score} points**!`,
    color: COLOR_SAFFRON,
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }], '🏆 **New high score!**');
}

export async function notifyPerfectRound(playerId: string, dishName: string, score: number): Promise<void> {
  await sendWebhook([{
    title: '✨ Perfect Round!',
    description: `**${playerId}** identified all ingredients in **${dishName}** with a perfect score of **${score}**!`,
    color: COLOR_GREEN,
    footer: { text: 'Ingredient Matching Game 🍛' },
    timestamp: new Date().toISOString(),
  }]);
}

export const discord = {
  notifyGameStarted,
  notifyScoreSubmitted,
  notifyHighScore,
  notifyPerfectRound,
  isEnabled: () => Boolean(process.env.DISCORD_WEBHOOK_URL),
};
