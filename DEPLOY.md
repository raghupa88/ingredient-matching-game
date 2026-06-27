# Deployment Guide — Cloudflare Pages + Workers

## Architecture

- **Frontend** → Cloudflare Pages (serves `frontend/dist/`)
- **Backend** → Cloudflare Workers (Hono-based `backend/src/worker.ts`)
- **Local dev** → unchanged; Express runs via `npm run dev` on port 3002

## Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions** on your GitHub repo:

| Secret | Description | Where to get it |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | CF API token with Pages + Workers permissions | [CF Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Use "Edit Cloudflare Workers" template, then add Pages:Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | CF Dashboard → right sidebar on any page |
| `VITE_API_URL` | Full URL of your deployed Worker | Obtained after first Worker deploy (see below) |

## First-Deploy Steps

### 1. Install and build locally

```bash
npm ci
npm run build:worker --workspace=backend
# Creates backend/dist-worker/worker.js
```

### 2. Deploy the Worker (to get its URL)

```bash
cd backend
npx wrangler login          # opens browser to authenticate
npx wrangler deploy         # deploys and prints the Worker URL
```

The Worker URL looks like `https://ingredient-game-api.<your-subdomain>.workers.dev`.

### 3. Set the VITE_API_URL secret

In GitHub → Settings → Secrets → `VITE_API_URL` = `https://ingredient-game-api.<your-subdomain>.workers.dev`

Also update `frontend/.env.production` with the real URL before committing (optional — the secret overrides it in CI).

### 4. Create the Cloudflare Pages project (first time only)

```bash
cd frontend
npm run build           # or: npx vite build
npx wrangler pages deploy dist --project-name ingredient-matching-game
```

### 5. Push to main — auto-deploys both

```bash
git push origin main
```

The `.github/workflows/deploy.yml` pipeline runs on every push to `main` and:
1. Builds the frontend with `VITE_API_URL` from secrets and deploys to CF Pages
2. Bundles the Worker with esbuild and deploys via Wrangler

## Adding Environment Variables to the Worker

Set runtime env vars (e.g. `DISCORD_WEBHOOK_URL`) in the CF dashboard:
**Workers & Pages → ingredient-game-api → Settings → Variables**

Or add them to `backend/wrangler.toml` under `[vars]` for non-secret values.

## Local Dev

Local dev is unchanged — Express still runs on port 3002:

```bash
npm run dev   # starts frontend (5173) + backend Express (3002)
```

The worker entry (`backend/src/worker.ts`) is only bundled and used in production.
