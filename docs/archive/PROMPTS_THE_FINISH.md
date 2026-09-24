# The finishing prompts, 22 September 2026

Three prompts written after the build session published its first measured
status at 47 per cent. Kept here so the record is in the repository rather
than only in a chat window.


---

## 1. Session A, finish it

Five more agents. Escrow to an industry standard, the payment method flow end
to end, Price Check stage one, the half-done tracks closed, and then the
unproven register worked top to bottom, because proving what is already built
is what actually moves the figure.

```
Your status report is good and I accept its method. Now close the gap it measured.

You are not at 47 per cent because the work is poor. You are at 47 because built and proven have been allowed to mean the same thing. Finish what is unbuilt, then prove what is built, and the number moves for real.

Take five more agents. Put them on the five biggest remaining blocks, run them alongside what you have, and do not stop.

1. ESCROW, TO INDUSTRY STANDARD, NOT TO A DEMO

Escrow is at 20 per cent and it is the second largest unbuilt block in the briefs. docs/research/ESCROW_END_TO_END_RESEARCH.md part five is the build list. Work every item.

Everything except custody, which is still gated on my solicitor. Build all of it:

The nine fixes before any feature work. The float booked as a liability, which it currently is not anywhere. The invariant asserted, in a test and in a scheduled check: the ledger's escrow float equals the sum over live escrow rows. It has never been asserted in either direction. The nine concurrency probes, written on the two-session pattern that proved the oversell gate, because your own brief says no naira moves until all nine pass and right now that sentence is untested.

Then the whole product surface: the proposal inside a thread, what both parties see while it is held, release, confirm, the auto-release countdown, refund, dispute with its evidence, the admin resolution desk, receipts, and a notification and an email at every state change.

Industry standard means: idempotent everywhere, no double spend under concurrency, every state transition audited, a dispute that captures evidence rather than opinions, a countdown the user can see, money that can always be accounted for to the naira, and copy a lawyer can read without wincing. Escrow is the agency fee first, the purchase deposit through a trustee only, never the purchase balance.

2. THE PAYMENT METHOD FLOW, END TO END

This has never been given a proper pass. Build it properly: add a card, the setup charge, the saved card list, set a default, remove one, and the whole of it inside our own chrome, because the add-card flow is one of the eight money departures still open.

Bank accounts for payouts on the same standard: add, resolve the name against the bank, verify, set a default, remove. Every one of them rate limited, idempotent, and fully notified.

And close the remaining Paystack departures. The access code is already returned on every transaction and still read by nobody. Answer the three open questions with a real test card: does resumeTransaction work without a public key, does 3-D Secure render inside the iframe, does a real card complete. Then wire all seven call sites.

3. PRICE CHECK, WHICH IS AT ZERO AND BLOCKED ON NOBODY

Stage one only: the area report from asking prices described as asking, the neighbourhood power and water facts, the refusal states with notify-me, the map pin ladder for address entry, and the price_check_events instrumentation with its five character geohash and never an address. The word valuation appears nowhere, the lint rule holds it there, and no share artefact ever carries an address.

4. FINISH THE HALF-DONE TRACKS

Track G is 50 per cent and the missing half is structural. agent_applications.supply_role is written and never read, so an approved owner becomes an agent row and the role is discarded at the door. Three forms file three applications the database cannot tell apart afterwards. Close that properly, both axes, the three badges, the single vocabulary read by all fifteen surfaces.

Track O is 75 per cent. Finish it. The switch lives in one place, the dock, confirmed.

And the things your own report flagged and did not finish: welcomeOnce with zero callers, the false closure on the abuse filter where the ledger says CLOSED and the machinery ships an empty term list, the ten built-but-unsent emails, push at zero against forty events, the i18n locale gate, and the store items that refuse us on submission one.

5. THEN PROVE IT

This is the part that actually moves the number.

Work the unproven register in your own file, top to bottom. Every UNPROVEN mark is either converted by observing the real outcome, or it stays and you say why. The four daily cron routes have never had an authorised run: prove them tomorrow morning. The fourteen money call sites have never refused anything: make them refuse, on purpose, and watch it. The five admin desks that draw nothing: give them rows or prove the empty state is correct.

And run a clean end-to-end test of everything you have built in this session, not a unit test. Walk the flows like a person. Write down what broke.

HOW

All agents autonomous, all the time, next scope written before the current one closes. Push to main the moment each piece is green. git pull --rebase origin main before every push. Stay entirely out of Session B's scope file.

Rewrite docs/PLATFORM_STATUS.md at the end of every cycle and push it. I am reading it.

Keep pulling on green lights. Seven blind ones in one day, five found that way. That habit is the most valuable thing this session has.
```


---

## 2. Session B, finish it

```
Finish everything you were given, and finish it to the standard in the brief rather than to a resemblance.

All seven surfaces: the profile page, get started, welcome back, the wallet, send money, inspections, and the whole admin console with its documentation. Plus the welcome email.

Three things I want held to hard:

Exactly like the images, measured not eyeballed. Every surface closes with its side-by-side comparison recorded in your ledger, property by property, and no surface closes without that row. That gate is why the wallet drifted last time.

Wired real, not painted. Every screen walks its whole chain in your ledger: control, action, validation, policy, table, trigger, notification, query, screen. Broken links get named, not routed around.

And nothing ships a claim. The NDIC badge, the encryption badge, the four money tiles, the old slogan, and the fabricated admin figures. The admin console's empty state is the designed state, because the database holds 64 example listings, zero real supply and seven accounts, and every number on those renders will be zero on the day they ship.

Take more agents if you need them. Autonomous, no pausing, push to main as each piece goes green, git pull --rebase origin main first every time.

Keep docs/SESSION_B_SCOPE.md current and read Session A's ledger section 49 for replies. You own lib/admin/reads/ now, so you are no longer blocked waiting on anybody for data.

Tell me when all seven are closed and proved.
```


---

## 3. The audit session, to be sent only once both above report closed

Ten agents, at least one hundred ranked recommendations, one file at
`docs/THE_HUNDRED.md`, and it builds nothing.

```
You are a fresh Claude session on the Vallo repository, moderator29/read-it-well. Two build sessions have just finished a very large body of work. You are here to audit it, find what is missing, and recommend what comes next.

You build nothing. You write one file and you write it well.

READ FIRST

docs/PLATFORM_STATUS.md, which is the outgoing session's own measured status and is written to be checked. docs/HANDOFF_05, 08 and 09. The eleven research files in docs/research/. docs/DESIGN_DIRECTION.md. docs/FOUNDER_OPEN_ITEMS.md. Both ledgers. And the twelve governing images plus the other two reference folders.

Treat every claim in those as a claim. The outgoing session found seven blind lights in a single day, five of them by pulling on lights that were showing the right colour. A grep proving a string exists is not proof a browser drew it. An HTTP 200 is not proof a page rendered. Verify against the live database, the live deployment and the actual files.

RUN TEN AGENTS

1. Money and ledger integrity. Every naira path end to end. Double spend, idempotency, reconciliation, the escrow float and its invariant, refunds, payouts, the wallet, fees. Can every naira be accounted for, always.

2. Security: identity and access. Auth, sessions, tokens, every RLS policy, every SECURITY DEFINER grant, privilege escalation, account takeover, the admin surface.

3. Backend hardening. Rate limits, concurrency, failure modes, retries, timeouts, queue behaviour, what happens when Paystack is down, when Supabase is slow, when a job dies mid-run.

4. Data, privacy and law. NDPA, retention, what personal data we hold and why, what we log, what we should never log, deletion and purge, the SCUML and AML obligations, identity documents.

5. Frontend consistency. The logo in both themes, buttons, icons, containers, the glow, the glass, spacing, type, light mode across every surface. One product or many.

6. Feature completeness. Every layer, every flow, every route. What is built, what is half built, what is declared and empty. Name every dead end.

7. Store and mobile readiness. Both stores, guideline by guideline, plus the native shell and what has never run on a device.

8. Performance and cost. Page weight, query cost, image handling, what a Nigerian phone on a metered bundle actually experiences, and what this runs at on a thousand users.

9. Tooling and developer experience. What tools are missing, what checks do not exist, what would have caught the seven blind lights earlier, CI, observability, alerting.

10. Product and growth. The gaps in the idea, not the code. What a serious platform in this market has that we do not.

THE DELIVERABLE

One file: docs/THE_HUNDRED.md.

At least one hundred recommendations. Big and small, as long as every one of them fits the direction this platform has already set.

For each: a number, a one-line title, which of the ten areas it belongs to, the evidence with path and line or a live query, the severity, the effort, and the precise first step. Ranked, so the top of the file is what to do on Monday morning.

Separate three things clearly and never blur them: what is missing, what is broken, and what would make us better. A missing feature and a security hole are not the same kind of entry.

Mark everything you could not verify. An honesty log at the end naming every claim you took on trust and why.

Write it for somebody who is going to check it. Push it to main and tell me when it is there.
```
