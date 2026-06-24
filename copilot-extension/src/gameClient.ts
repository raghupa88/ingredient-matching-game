const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3002';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json() as { success: boolean; data: T; message?: string };
  if (!json.success) throw new Error(json.message ?? 'Backend error');
  return json.data;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}/api${path}`);
  const json = await res.json() as { success: boolean; data: T; message?: string };
  if (!json.success) throw new Error(json.message ?? 'Backend error');
  return json.data;
}

export async function getLeaderboard() {
  return get<{ leaderboard: { playerId: string; score: number; timestamp: string }[] }>('/game/scores');
}

export async function listSkills() {
  return get<{ name: string; status: string; description: string }[]>('/apm/skills');
}

export async function isBackendReachable(): Promise<boolean> {
  try {
    await get('/apm/skills');
    return true;
  } catch {
    return false;
  }
}
