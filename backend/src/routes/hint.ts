import { Router, Request, Response, NextFunction } from 'express';
import { generateHint, generateCulturalContext } from '../services/hintService';
import { useHint } from '../services/gameService';

export const hintRouter = Router();

hintRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return next(Object.assign(new Error('sessionId required'), { status: 400 }));
    const { hintsUsed } = useHint(sessionId);
    const hint = generateHint(sessionId);
    res.json({ success: true, data: { hint, hintsUsed, penaltyPoints: 10 } });
  } catch (e) { next(e); }
});

hintRouter.get('/cultural/:dishId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = generateCulturalContext(req.params.dishId);
    res.json({ success: true, data: ctx });
  } catch (e) { next(e); }
});
