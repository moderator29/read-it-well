# Vallo: the handoff

Written 13 October 2026. This is the only handoff in the repository. Read it first, then work.

## Paste this to start a session

> You are the lead engineer for Vallo (VALLO SPACES LTD), a Nigerian property and stays marketplace. Read `HANDOFF.md` in the repo root, then `apps/web/AGENTS.md`. Work on branch `claude/rentme-v2-platform-audit-xuvg0a`. Seyi is the founder: short answers, plain words, no em dashes, decide the obvious things yourself and keep going. You may run all database changes and all repo work on the working branch without asking. Use up to 4 parallel agents, one branch and one worktree each, and audit every result before merging it. Never push to `main` unless Seyi says so in that message. Say plainly what you could not verify. Start with section 6 of the handoff.

## 1. The founder and how Seyi works

- **Seyi** (Omojuni Oluwaseyifunmi Ebenezer): founder, CEO and CTO. Works from a phone, pays for this personally, and hits usage limits, so waste nothing. Writes fast with typos: read the intent.
- **Answer first.** One or two lines of result, then detail only if it matters. Lists beat paragraphs. No theory, no long preambles.
- **No em dashes** anywhere: code, docs, copy, messages. A repo gate enforces it.
- **Decisions are Seyi's, defaults are yours.** Recommend one clear option. When a question has an obvious answer, act and say what you chose. Ask only when the whole task depends on something only Seyi has. Seyi often says "tell me the best approach and do it": do it.
- **Never ask Seyi to run what you can run.** Database changes, repo work and merges to the working branch are pre-authorised. If a tool blocks you, say so once and give the exact SQL or command.
- **Verify before asserting.** Seyi has been burned by confident wrong answers and a misread timestamp. Check one thing at a time, correct yourself in one sentence, then move on. Say "committed", "pushed", "tested" and "compliant" only when true, and list what you could not test.
- **Test twice.** Run the gates twice and keep the output honest.
- **Fast and parallel.** Run agents in parallel, tell them to finish, merge as each reports. Report status in a few lines.
- **Industry standard, clean, premium.** Copy what big platforms do (Airbnb, Booking.com, OpenTable) and adapt it for Nigeria. One design language, one way of doing each thing. Enhance what exists; never build a second version of a screen.
- **Security.** Never print, log or commit a credential. Never ask anyone to paste a key or password into chat. Keys that were pasted in chat before must be rotated (see section 6).
- **Merging to main** happens only when Seyi says "push to main" in that message. Then verify the Vercel production deploy. No pull request unless asked.

## 2. Product rules that never change

- **Free to use.** Listing is free. Vallo charges only on a completed deal. Pro is optional, never required. Renters and guests pay exactly the listed price with nothing added.
- **Every cost is shown before booking**, including charges at the door. Hosts must not charge anything not listed on Vallo or add a charge with no stated reason. Hosts accept the Terms, Privacy Policy and Host Agreement before publishing.
- **Vallo never holds customer money.** Licensed partners hold payments and escrow. The UI stays Vallo-native; provider names appear only where the law requires. Never fabricate a balance, reference or transaction.
- **Viewings never take money.** Money moves only after the inspection and the renter's decision.
- **Restaurants:** booking a table is free, the restaurant confirms, the diner pays the bill at the restaurant or through Vallo. Vallo bills the restaurant 1,000 naira per seated table. Bill payment through Vallo (Paystack split, 2 percent commission) stays off until Paystack keys and each restaurant's subaccount exist.
- **An owner account and an agent account are separate.** One account holds one side.
- **Words and claims.** Copy lives in `packages/i18n`. Never claim "safe", "checked" or "verified" unless a mechanism backs it (a test polices this). Use `countOf` for plurals. Never use font-weight 500 in app CSS. The dock's resting icons stay brand blue. The logo has the same colours in light and dark.
- **Names.** The company is VALLO SPACES LTD (contracts, legal pages). The product is Vallo. RentMe and NaijaFinds are dead and never appear in anything new.

## 3. Company facts

- VALLO SPACES LTD, RC 9870413, TIN 2623712661609, incorporated 18 September 2026. Office: Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, FCT, Abuja. Share capital 1,000,000 naira.
- Co-founders agreement dated 13 October 2026, with the lawyer for review, not yet signed: Seyi 45 percent (CEO and CTO), Samuel Soledayo Babatola 35 percent (Chief Growth Officer, UK; invests US$20,000, of which US$6,000 is received; leads investor funding), Kareem Adetiba Tunde 20 percent (Chief Operating Officer, Akure). Four-year vesting with a one-year cliff from 18 September 2026. Major decisions need all three. Two of three approve every bank payment. CAC still shows 523,000 / 297,000 / 180,000 shares until the transfers are filed after signing.
- Order for the bank: CAC certificate, then SCUML, then the corporate account.

## 4. Where things live

- **Repo:** `moderator29/read-it-well`. Next.js 16 in `apps/web` (this version differs from older docs: read `apps/web/AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code). Shared packages in `packages/*`. Capacitor shells in `apps/web/android` and `apps/web/ios`; they load the live site, so web changes need no app build.
- **Production:** `main` deploys to https://www.vallospaces.com. Vercel project `read-it-well-web` (team vallospacelstd): pass the project name, never a team id.
- **Database:** Supabase project `uccixoonmbhrnyczyigt`.
- **Apps:** package `com.vallospaces.app`. iOS 1.0.0 (built 9 October, includes App-Bound Domains so the service worker runs) is in Apple review. Android is in Play production review. Versions come from `npm run sync:versions`. Firebase project `vallo-6f946` (Android push), APNs team `X74KD52994` (iPhone push).
- **Founder admin account:** Phantomfcalls@gmail.com (`super_admin`). QA accounts use `+qaadmi` and `+qamember` plus-addresses; their passwords were pasted in chat and must be rotated.
- **Design tokens:** `packages/design-tokens/src/tokens.css`. Back-button rules: `docs/BACK_NAVIGATION.md`. Money design: `docs/MONEY_ARCHITECTURE.md`. Decisions record: `docs/DECISIONS_2026-10-13.md`. Founder rulings D51 to D85: `docs/sessions/DIRECTIVES-2026-10-05.md`. Database statements the connector cannot run: `docs/DB_NOTES.md`.

## 5. How work is done

- **Gates** (all must pass before a commit batch and again at the end), from the repo root: `node apps/web/scripts/check-no-em-dash.mjs`, `check-valuation-words.mjs`, `check-css-tokens.mjs`, and `node scripts/check-migrations.mjs`. In `apps/web`: `npx tsc --noEmit -p .`. In this sandbox tsc shows only the known errors in `components/calls/media/session.ts` (livekit-client is missing) and `.next/types/validator.ts`.
- **Tests:** run only the tests for the areas you touched; the full suite takes about 20 minutes and four `calls.dom` tests fail here for the same livekit reason. Many repo tests police copy, claims, routes, plurals, returned errors and docs: fix the code or the register, never weaken a test.
- **New routes** go in `src/lib/nav/route-parents.ts`, `route-labels.ts` and `src/lib/routing/known-routes.ts`. A public route also goes in `PUBLIC_SEGMENTS` in `src/proxy.ts`, in `src/proxy.test.ts` and in `src/lib/i18n/public-locale.ts`.
- **Database changes:** apply with the Supabase MCP `apply_migration`, in small chunks (use `$fn$` quoting and start each with `set lock_timeout = '5s';`). Save the same SQL as `supabase/migrations/<version>_<name>.sql` using the version the database recorded, then `node scripts/check-migrations.mjs --record <file>`. Drafts go in `supabase/migrations/pending/`. Read each agent's migration against the live function definitions and grants before applying. The connector freezes for 60 seconds on any statement containing `DELETE` or `DROP FUNCTION`: do not disguise them; give Seyi the SQL.
- **New pg_cron jobs** also go in `PG_CRON_JOBS` (`apps/web/src/lib/admin/reads/jobs.ts`) and the table and count in `docs/ADMIN_CONSOLE.md` (42 today).
- **Agents:** brief each one fully (goal, files, rules, "never push, never touch main, no live database writes, no DROP"), one branch `track/<name>` and one worktree each, at most 4 at once because memory is short. Audit the diff, run the gates, then merge into the working branch. Agents write the code; you own the database and the merge.
- **Sandbox limits:** no production build, no device, and MapTiler, Payluk, LiveKit and Termii are unreachable. Check providers from production at `/admin/operations/providers`. `gh` is the built-in API client only.

## 6. Open items

- **Seyi to do:** allow notifications on the iPhone and report the enrolment step (the push token table is empty); rotate every credential pasted in chat (QA passwords, the APNs key, Firebase service-account keys, the old vallo-44059 key); watch Apple and Play reviews; time a repeat app launch on a phone (target under 0.5 seconds; the first launch after install still waits for the network); run the optional statements in `docs/DB_NOTES.md`; connect Paystack for restaurants.
- **Lawyer:** Terms section 14 still carries the retired Guarantee wording; the Host Agreement text was written by engineering; the co-founders agreement is out for review. After signing, file the share transfers at CAC.
- **Next engineering:** native-speaker review of the Hausa, Igbo and Yoruba strings written by agents; check the landmark pins on a map; sign-in with a real account to test the new flows end to end (agents tested with fixtures only); push token and call ringing on iPhone; ownership document upload needs a live trial.
- **Known gaps:** a landlord with no published listing shows as "Agent" on others' view of them (needs the agent type exposed); the Hausa, Igbo and Yoruba text is machine-written; restaurant deposits (flag off) conflict with "free table booking" if ever enabled.
