import { discord, notifyGameStarted, notifyScoreSubmitted, notifyHighScore, notifyPerfectRound } from '../services/discordService';

const FAKE_URL = 'https://discord.com/api/webhooks/test/token';

function mockFetchOk(): jest.Mock {
  const fn = jest.fn().mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function mockFetchError(status = 429, statusText = 'Too Many Requests'): jest.Mock {
  const fn = jest.fn().mockResolvedValue({ ok: false, status, statusText });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  delete process.env.DISCORD_WEBHOOK_URL;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('discord.isEnabled()', () => {
  test('returns false when DISCORD_WEBHOOK_URL is not set', () => {
    expect(discord.isEnabled()).toBe(false);
  });

  test('returns true when DISCORD_WEBHOOK_URL is set', () => {
    process.env.DISCORD_WEBHOOK_URL = FAKE_URL;
    expect(discord.isEnabled()).toBe(true);
  });
});

describe('when DISCORD_WEBHOOK_URL is not set', () => {
  test('notifyGameStarted does not call fetch', async () => {
    const fn = mockFetchOk();
    await notifyGameStarted('player1', 'easy', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  test('notifyScoreSubmitted does not call fetch', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('player1', 500, 1);
    expect(fn).not.toHaveBeenCalled();
  });

  test('notifyHighScore does not call fetch', async () => {
    const fn = mockFetchOk();
    await notifyHighScore('player1', 1000);
    expect(fn).not.toHaveBeenCalled();
  });

  test('notifyPerfectRound does not call fetch', async () => {
    const fn = mockFetchOk();
    await notifyPerfectRound('player1', 'Idli', 200);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe('notifyGameStarted', () => {
  beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = FAKE_URL; });

  test('sends embed with correct title and mode', async () => {
    const fn = mockFetchOk();
    await notifyGameStarted('testPlayer', 'hard', 2);

    expect(fn).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toBe('🎮 New Game Started');
    expect(body.embeds[0].description).toContain('testPlayer');
    expect(body.embeds[0].description).toContain('hard');
    expect(body.embeds[0].description).toContain('Mode 2');
    expect(body.content).toBeUndefined();
  });
});

describe('notifyScoreSubmitted', () => {
  beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = FAKE_URL; });

  test('uses gold medal emoji for rank 1', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('champ', 800, 1);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toContain('🥇');
    expect(body.embeds[0].title).toContain('champ');
  });

  test('uses silver medal emoji for rank 2', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('player2', 700, 2);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toContain('🥈');
  });

  test('uses rank number for rank > 3', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('player5', 300, 5);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toContain('#5');
  });

  test('includes rank and score fields', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('player1', 500, 1);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    const fields = body.embeds[0].fields as { name: string; value: string }[];
    expect(fields.find(f => f.name === 'Rank')?.value).toBe('1');
    expect(fields.find(f => f.name === 'Score')?.value).toBe('500');
  });

  test('does not include content field', async () => {
    const fn = mockFetchOk();
    await notifyScoreSubmitted('player1', 500, 1);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.content).toBeUndefined();
  });
});

describe('notifyHighScore', () => {
  beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = FAKE_URL; });

  test('sends both content text and embed', async () => {
    const fn = mockFetchOk();
    await notifyHighScore('champion', 1500);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.content).toBe('🏆 **New high score!**');
    expect(body.embeds[0].title).toBe('🏆 High Score Broken!');
    expect(body.embeds[0].description).toContain('champion');
    expect(body.embeds[0].description).toContain('1500');
  });
});

describe('notifyPerfectRound', () => {
  beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = FAKE_URL; });

  test('sends embed with dish name and score', async () => {
    const fn = mockFetchOk();
    await notifyPerfectRound('player1', 'Sambar', 300);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.embeds[0].title).toBe('✨ Perfect Round!');
    expect(body.embeds[0].description).toContain('Sambar');
    expect(body.embeds[0].description).toContain('300');
    expect(body.content).toBeUndefined();
  });
});

describe('error handling', () => {
  beforeEach(() => { process.env.DISCORD_WEBHOOK_URL = FAKE_URL; });

  test('logs error but does not throw when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
    await expect(notifyGameStarted('p', 'easy', 1)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[Discord] Webhook error:', expect.any(Error));
  });

  test('logs error but does not throw on non-OK response', async () => {
    mockFetchError(429, 'Too Many Requests');
    await expect(notifyScoreSubmitted('p', 100, 5)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[Discord] Webhook failed: 429 Too Many Requests'));
  });

  test('sends correct URL from environment variable', async () => {
    const fn = mockFetchOk();
    await notifyPerfectRound('player', 'Idli', 200);
    expect(fn).toHaveBeenCalledWith(FAKE_URL, expect.objectContaining({ method: 'POST' }));
  });
});
