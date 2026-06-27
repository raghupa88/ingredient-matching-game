# Branch Protection Rules for `main`

## Required Status Checks

The following CI checks must pass before any PR can be merged into `main`:

| Check Name | Workflow | Description |
|---|---|---|
| `CI / skills-tests` | `ci.yml` | APM skills unit tests (Jest) |
| `CI / backend-tests` | `ci.yml` | Backend integration tests (Jest + Supertest) |
| `CI / frontend-unit` | `ci.yml` | Frontend unit tests (Vitest) |
| `CI / typecheck` | `ci.yml` | TypeScript strict-mode typecheck for backend and frontend |
| `CI / build` | `ci.yml` | Production build (frontend Vite + backend tsc) |

## How to Enable Branch Protection

1. Go to the repository on GitHub: https://github.com/raghupa88/ingredient-matching-game
2. Click **Settings** (top navigation bar).
3. In the left sidebar, click **Branches** under "Code and automation".
4. Under "Branch protection rules", click **Add rule** (or **Add classic branch protection rule**).
5. In the "Branch name pattern" field, enter: `main`
6. Enable the following options:

   - [x] **Require a pull request before merging**
     - [x] Require approvals: 1 (recommended)
     - [x] Dismiss stale pull request approvals when new commits are pushed

   - [x] **Require status checks to pass before merging**
     - [x] Require branches to be up to date before merging
     - Search for and add each check:
       - `CI / skills-tests`
       - `CI / backend-tests`
       - `CI / frontend-unit`
       - `CI / typecheck`
       - `CI / build`

   - [x] **Require conversation resolution before merging**

   - [x] **Do not allow bypassing the above settings**

7. Click **Save changes**.

## Notes

- The E2E workflow (`e2e.yml`) runs only when `frontend/playwright.config.ts` exists. It is not listed as a required check here because the e2e test suite has not been merged yet. Add `E2E Tests / Playwright E2E` to required checks once `feat/e2e-tests` is merged.
- No secrets are required for the CI workflows. Secrets for CD (deployment tokens, Discord webhooks, etc.) will be documented separately in PR-D.
- Status check names use the format `<workflow name> / <job name>`. The workflow name is set by the `name:` field at the top of the YAML file.
