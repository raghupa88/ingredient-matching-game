import request from 'supertest';
import { app } from '../index';
import { apmLoader } from '../services/apmLoader';

// Initialize APM skills before all tests
beforeAll(async () => {
  await apmLoader.init();
}, 15000);

describe('POST /api/game/session', () => {
  test('creates session with valid mode and difficulty', async () => {
    const res = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy', playerId: 'tester' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBeDefined();
    expect(typeof res.body.data.sessionId).toBe('string');
  });

  test('defaults mode to 1 and difficulty to easy', async () => {
    const res = await request(app)
      .post('/api/game/session')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('rejects invalid mode', async () => {
    const res = await request(app)
      .post('/api/game/session')
      .send({ mode: 3, difficulty: 'easy' });

    expect(res.status).toBe(400);
  });

  test('rejects invalid difficulty', async () => {
    const res = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'extreme' });

    expect(res.status).toBe(400);
  });

  test('truncates playerId to 50 chars', async () => {
    const longId = 'a'.repeat(100);
    const res = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy', playerId: longId });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/game/round', () => {
  let sessionId: string;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy' });
    sessionId = res.body.data.sessionId;
  });

  test('returns round data with required fields', async () => {
    const res = await request(app)
      .post('/api/game/round')
      .send({ sessionId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(data.roundId).toBeDefined();
    expect(data.dishName).toBeDefined();
    expect(data.tiles).toBeInstanceOf(Array);
    expect(data.correctIngredients).toBeInstanceOf(Array);
    expect(data.tamilName).toBeDefined();
    expect(data.region).toBeDefined();
  });

  test('tiles have name and isCorrect fields', async () => {
    const res = await request(app)
      .post('/api/game/round')
      .send({ sessionId });

    const tile = res.body.data.tiles[0];
    expect(tile.name).toBeDefined();
    expect(typeof tile.isCorrect).toBe('boolean');
  });

  test('returns 400 without sessionId', async () => {
    const res = await request(app)
      .post('/api/game/round')
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns error for unknown sessionId', async () => {
    const res = await request(app)
      .post('/api/game/round')
      .send({ sessionId: 'nonexistent-session-id' });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/game/validate', () => {
  let sessionId: string;

  beforeEach(async () => {
    const sessionRes = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy' });
    sessionId = sessionRes.body.data.sessionId;
    await request(app).post('/api/game/round').send({ sessionId });
  });

  test('validates an answer and returns score data', async () => {
    const res = await request(app)
      .post('/api/game/validate')
      .send({ sessionId, answer: [], timeRemaining: 15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(typeof data.isCorrect).toBe('boolean');
    expect(typeof data.scoreGained).toBe('number');
    expect(typeof data.totalScore).toBe('number');
    expect(typeof data.roundsPlayed).toBe('number');
    expect(data.roundsPlayed).toBe(1);
  });

  test('returns 400 without sessionId', async () => {
    const res = await request(app)
      .post('/api/game/validate')
      .send({ answer: [] });

    expect(res.status).toBe(400);
  });

  test('returns 400 without answer', async () => {
    const res = await request(app)
      .post('/api/game/validate')
      .send({ sessionId });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/game/reset', () => {
  test('resets session successfully', async () => {
    const sessionRes = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy' });
    const { sessionId } = sessionRes.body.data;

    const res = await request(app)
      .post('/api/game/reset')
      .send({ sessionId });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeDefined();
  });

  test('returns 400 without sessionId', async () => {
    const res = await request(app).post('/api/game/reset').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/game/scores', () => {
  test('returns leaderboard array', async () => {
    const res = await request(app).get('/api/game/scores');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.leaderboard).toBeInstanceOf(Array);
  });
});

describe('POST /api/game/scores', () => {
  test('submits score for session and returns leaderboard', async () => {
    const sessionRes = await request(app)
      .post('/api/game/session')
      .send({ mode: 1, difficulty: 'easy', playerId: 'integration-tester' });
    const { sessionId } = sessionRes.body.data;

    const res = await request(app)
      .post('/api/game/scores')
      .send({ sessionId });

    expect(res.status).toBe(200);
    expect(res.body.data.leaderboard).toBeInstanceOf(Array);
  });

  test('returns 400 without sessionId', async () => {
    const res = await request(app).post('/api/game/scores').send({});
    expect(res.status).toBe(400);
  });
});
