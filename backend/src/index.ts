import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { gameRouter } from './routes/game';
import { hintRouter } from './routes/hint';
import { apmRouter } from './routes/apm';
import { apmLoader } from './services/apmLoader';

export const app = express();
const PORT = process.env.PORT || 3002;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.use('/api/game', gameRouter);
app.use('/api/hint', hintRouter);
app.use('/api/apm', apmRouter);

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? 500;
  console.error(err);
  // Only expose message on 4xx — 5xx messages may leak implementation details
  const message = status < 500 ? err.message : 'Internal server error';
  res.status(status).json({ error: true, code: 'INTERNAL_ERROR', message, timestamp: new Date().toISOString() });
});

if (require.main === module) {
  apmLoader.init()
    .then(() => {
      console.log('[APM] Skills and prompts loaded');
      app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
    })
    .catch(err => {
      console.error('[APM] Failed to initialize:', err);
      process.exit(1);
    });
}
