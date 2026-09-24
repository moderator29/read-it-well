## What changes

<!-- One or two sentences on what the code does now that it did not before. -->

## Why

<!-- The problem, finding ID (e.g. RECOMMENDATIONS.md W-1) or decision this answers. -->

## How it was checked

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Relevant Playwright spec(s) in `apps/web/tests/` run against a server, if a screen, guard, CSP or service worker changed

<!-- Anything else you ran, and what it showed. -->

## Checklist

- [ ] Money stays integer kobo (`*_minor`); no new copy of balance arithmetic
- [ ] Migrations: file named to the applied version, applied migrations untouched, RLS/grants/indexes included, behaviour probed
- [ ] New environment variables added to `apps/web/.env.example`, `docs/ENVIRONMENT.md` and the README
- [ ] No secrets, keys or personal data in code, fixtures, logs or migrations
- [ ] Docs made wrong by this change are updated in this PR

## Not proven yet

<!-- What this change claims but has not been shown to do, if anything. -->
