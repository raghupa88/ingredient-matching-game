## What this PR does

<!-- One paragraph describing the change and why it's needed -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Docs / config only
- [ ] Tests only

## Checklist

### Security
- [ ] All new API inputs are validated; bad input returns `400`
- [ ] No secrets or tokens committed (check `.env.example` if new vars added)
- [ ] CORS config unchanged or still restricted to known origins
- [ ] Client-supplied scores are NOT trusted — server session state is used

### Code quality
- [ ] No `any` types added (or commented with justification if unavoidable)
- [ ] No `console.log` left in production paths
- [ ] No duplicated constants — using canonical locations in `types/game.ts` / `score-calculator.js`
- [ ] APM skills remain pure CommonJS with zero external dependencies (if skills changed)

### Tests
- [ ] New skill functions have unit tests in `skills/__tests__/`
- [ ] New backend routes have integration tests in `backend/src/__tests__/`
- [ ] New frontend state changes have tests in `frontend/src/__tests__/`
- [ ] All 118 existing tests still pass (`npm test`)

### APM consistency (if `apm.yml` changed)
- [ ] `apm-lock.yml` updated with new/changed agents or skills
- [ ] New agents declared in `copilot-extension/package.json` → `contributes.chatParticipants`
- [ ] `.env.example` updated if new env vars added
- [ ] `CLAUDE.md` and `.github/copilot-instructions.md` updated if architecture changed

### Tamil food (if dishes changed)
- [ ] New dishes include `tamilName` (Tamil script), `region`, `funFact`, `ingredients[]`, `decoys[]`
- [ ] Tamil Nadu dishes maintain 3× weight in `dish-randomizer.js`

## Screenshots / logs (if UI or API changed)

<!-- Paste relevant output, curl responses, or screenshots here -->
