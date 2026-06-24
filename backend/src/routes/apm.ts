import { Router, Request, Response, NextFunction } from 'express';
import { apmLoader } from '../services/apmLoader';

export const apmRouter = Router();

apmRouter.get('/skills', (_req: Request, res: Response) => {
  res.json({ success: true, data: { skills: apmLoader.listSkills() } });
});

apmRouter.get('/prompts', (_req: Request, res: Response) => {
  res.json({ success: true, data: { prompts: apmLoader.listPrompts() } });
});

apmRouter.post('/skill/:name', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fn, args = [] } = req.body;
    const result = apmLoader.invokeSkill(req.params.name, fn, ...args);
    res.json({ success: true, data: { result } });
  } catch (e) { next(e); }
});

apmRouter.post('/prompt/:name/render', (req: Request, res: Response, next: NextFunction) => {
  try {
    const rendered = apmLoader.renderPrompt(req.params.name, req.body.vars ?? {});
    res.json({ success: true, data: { rendered } });
  } catch (e) { next(e); }
});
