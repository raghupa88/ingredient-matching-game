import { Router, Request, Response, NextFunction } from 'express';
import * as gameService from '../services/gameService';
import { discord } from '../services/discordService';

export const gameRouter = Router();

const VALID_MODES = new Set([1, 2]);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

gameRouter.post('/session', (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = Number(req.body.mode ?? 1);
    const difficulty = req.body.difficulty ?? 'easy';
    if (!VALID_MODES.has(mode)) return next(Object.assign(new Error('mode must be 1 or 2'), { status: 400 }));
    if (!VALID_DIFFICULTIES.has(difficulty)) return next(Object.assign(new Error('difficulty must be easy, medium, or hard'), { status: 400 }));
    const playerId = String(req.body.playerId ?? 'anonymous').slice(0, 50);
    const session = gameService.createSession(mode as 1 | 2, difficulty as gameService.Difficulty, playerId);
    res.json({ success: true, data: { sessionId: session.sessionId } });
  } catch (e) { next(e); }
});

gameRouter.post('/round', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return next(Object.assign(new Error('sessionId required'), { status: 400 }));
    const round = gameService.startRound(String(sessionId));
    res.json({ success: true, data: round });
  } catch (e) { next(e); }
});

gameRouter.post('/validate', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, answer, timeRemaining = 0 } = req.body;
    if (!sessionId) return next(Object.assign(new Error('sessionId required'), { status: 400 }));
    if (answer === undefined || answer === null) return next(Object.assign(new Error('answer required'), { status: 400 }));
    const result = gameService.validateAnswer(String(sessionId), answer, Number(timeRemaining) || 0);
    // Notify Discord on a perfect round (all ingredients correct)
    if (result.isCorrect && result.partialRatio >= 1) {
      discord.notifyPerfectRound(result.playerId, result.dishName, result.scoreGained).catch(() => {});
    }
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

gameRouter.post('/reset', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return next(Object.assign(new Error('sessionId required'), { status: 400 }));
    gameService.resetSession(String(sessionId));
    res.json({ success: true, data: { message: 'Session reset' } });
  } catch (e) { next(e); }
});

// Submit score using the server-tracked session score (not client-supplied)
gameRouter.post('/scores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return next(Object.assign(new Error('sessionId required'), { status: 400 }));
    const { leaderboard, playerId, score } = gameService.submitScore(String(sessionId));
    const rankIndex = leaderboard.findIndex((e: { playerId: string }) => e.playerId === playerId);
    const rank = rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1;
    // Fire-and-forget Discord notifications — never block the response
    const prevHighScore = leaderboard.length > 1 ? leaderboard[1]?.score ?? 0 : 0;
    discord.notifyScoreSubmitted(playerId, score, rank).catch(() => {});
    if (rank === 1 && score > prevHighScore) {
      discord.notifyHighScore(playerId, score).catch(() => {});
    }
    res.json({ success: true, data: { leaderboard } });
  } catch (e) { next(e); }
});

gameRouter.get('/scores', (_req: Request, res: Response) => {
  res.json({ success: true, data: { leaderboard: gameService.getLeaderboard() } });
});
