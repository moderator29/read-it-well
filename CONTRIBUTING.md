# Contributing to Vallo

Start with the [README](README.md) for setup and architecture, and [`docs/PRODUCT.md`](docs/PRODUCT.md) for what the product is and the words it uses.

## Branches and pull requests

- `main` is what production deploys from. Nobody pushes to it directly. Do the work on a branch, open a pull request into `main`, and merge only when CI is green.
- Keep each branch to one concern. A schema change, the code that uses it, and the doc that describes it belong together. Unrelated clean-up belongs in a separate branch.
- Fill in the pull request template. Say what changed, why, how you checked it, and what is still unproven.

## Commits

- Write each subject line as a sentence about what the code now does, in the imperative or the present tense. Examples: "Spendable arithmetic lives in one place", "Move the loose root documents into docs/". Do not prefix it with ticket numbers or session names.
- Use the body for the reason and for anything a reviewer could not work out from the diff.
- Make each commit build and pass its own tests.
- Commits carry the author's own identity. Do not add tool-generated trailers (co-author lines, session links) to commit messages or pull request descriptions.

## Before you push

Run all four gates from the repository root:

```bash
npm run typecheck
npm run lint        # ESLint, check-css-tokens, check-valuation-words
npm run test        # Vitest
npm run build       # the only gate that catches bad "use server" exports
```

CI runs the same four on every push and pull request to `main`. If you change a screen, a route guard, the CSP or the service worker, also run the relevant Playwright spec in `apps/web/tests/` against a running server (`BASE_URL=http://localhost:3210 node apps/web/tests/<name>.spec.mjs`).

If you add a dependency, commit the `package-lock.json` change with it. CI installs with `npm ci`, and that fails when the lockfile and a `package.json` disagree.

## Database migrations

Migrations live in `supabase/migrations/`. The README's [Database and migrations](README.md#database-and-migrations) section has the full rules. In short:

- Name each file `<14-digit UTC version>_<what_it_does>.sql`. The version must equal the one recorded in `supabase_migrations.schema_migrations`. Apply the migration first, then rename the file to match.
- Every applied migration has a committed file, and every committed file has been applied. Drafts go in `supabase/migrations/pending/`.
- **Never edit an applied migration.** Write a new one.
- A new table gets RLS, policies, grants and covering indexes on its foreign keys in the same migration. A new column on a table granted to `anon` column by column needs its grant too.
- Open each file with a comment saying what it changes and why.
- Probe the behaviour after applying, as the real role, with a control that must succeed. A migration that applies cleanly has not proved anything.

## Money

- Vallo never holds customer money. Read [`docs/MONEY_ARCHITECTURE.md`](docs/MONEY_ARCHITECTURE.md) before touching payments, and do not reintroduce a wallet, balance or escrow.
- Every amount is **integer kobo**, in a `bigint` column whose name ends in `_minor`. Money never passes through a float, and division gets explicit rounding.
- The ledgers (`ledger_entries`, `guarantee_reserve_entries`) only ever get new rows. Every money write is idempotent on a unique reference.
- User-facing wording about money comes from `apps/web/src/lib/money/copy.ts`. Do not write new copies of it in components.

## Comments

Comments describe the code and why it is the way it is: the constraint, the incident that justified it, the thing that will break if someone changes it. Do not describe how the code came to be written. That means no session names, worker or ticket narration, or "as requested in handoff X". That history belongs in commit messages and the pull request. If a comment cites a document, point at a live one in `docs/`, not at `docs/archive/`.

## Secrets and personal data

- Never commit a secret, key, token, password or real person's contact details. That includes test fixtures, probe logs and migrations. `.env.local` is ignored. Keep it that way.
- New environment variables go in `apps/web/.env.example` with a comment and in `docs/ENVIRONMENT.md`, in the same change as the code that reads them. A unit test enforces the second.
- Server-only values never get the `NEXT_PUBLIC_` prefix.
- If a secret is exposed, rotate it first and clean up afterwards.

## Documentation

- Live documentation is listed in [`docs/README.md`](docs/README.md). When your change makes one of those documents wrong, update it in the same pull request.
- Retired material and dated build records go to `docs/archive/`. Do not add plans, ledgers or status reports to the top of `docs/`.
