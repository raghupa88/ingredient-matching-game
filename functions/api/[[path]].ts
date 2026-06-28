interface Env {
  WORKER_URL?: string;
}

// Proxy all /api/* requests to the Cloudflare Worker backend.
// WORKER_URL can be set as a Pages environment variable in the dashboard;
// falls back to the production worker URL.
export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const workerBase = env.WORKER_URL ?? 'https://ingredient-game-api.raghupa88.workers.dev';
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, workerBase);

  const proxied = new Request(target.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'follow',
  });

  return fetch(proxied);
};
