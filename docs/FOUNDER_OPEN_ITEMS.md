# The founder's open items

**Live list of everything only the founder can do, with what is closed and
when. Updated 22 September 2026.** The build session keeps its own copy in the
ledger's needs-the-founder section; this file is his.

---

## Closed on 22 September

| Item | What was done |
| --- | --- |
| MapTiler key | Key created at cloud.maptiler.com, origin locked to `vallospaces.com`, `*.vallospaces.com`, `*.vercel.app` and `?`. The `?` is required or maps go blank inside the native shell, which sends no ordinary web origin. `NEXT_PUBLIC_MAPTILER_KEY` set in Vercel as a Config variable, production and preview. |
| Resend into Supabase | The Send Email Hook is live at `https://www.vallospaces.com/api/auth/email-hook`, with `SUPABASE_AUTH_HOOK_SECRET` set in Vercel. Supabase no longer sends any email itself; our own code renders every auth message. Verified on a real signup. |
| The confirmation code length | Supabase was issuing eight digits while the form was built for six and silently truncated, so a correct code read as wrong. Email OTP Length set to six in the dashboard. The code side of it is a separate fix, because hardcoding the length in three places is the real defect. |

---

## 23 September: email immutability, and the one dashboard setting worth changing

**You asked me to disable email change at project level or tell you exactly
where. Here is the honest answer: THERE IS NO PROJECT-LEVEL SWITCH THAT
DISABLES IT.** I checked the Supabase documentation rather than guessing. The
only related setting is **Secure Email Change**, at

> Dashboard -> Authentication -> Providers -> Email

and it does not forbid a change. It decides whether a change needs confirming
from **both** the old address and the new one, or only the new one. That is a
hardening, not a prohibition.

**Turn it ON if it is not already.** With it on, a stolen session alone cannot
move somebody's address, because the old mailbox has to agree. That is worth
doing whatever else we do.

**THE PROHIBITION ITSELF NOW LIVES IN OUR CODE, IN THREE PLACES**, because
that is where it can be made absolute:

1. **Nothing offers it.** No server action calls `updateUser({ email })`. A
   source sweep (`lib/auth/email-immutable.test.ts`) walks every `.ts` and
   `.tsx` file in the application and fails if any caller ever appears. It
   finds exactly one write today and names it: the account deletion purge,
   which replaces an address with a `deleted.invalid` pseudonym. That is
   erasure, not a change, and it runs as the service role inside a job.
2. **The confirm screen will not redeem one.** `email_change` was in the list
   of token types our confirm screen accepted. It is out. Even a link minted
   outside the product cannot be completed.
3. **The email hook refuses to deliver the code.** If a change were started
   from the Supabase dashboard itself, GoTrue would ask our hook to post a code
   to the new address. It now answers "not permitted" and sends nothing.

Each of the three is held by a test, and I proved each test can fail by
breaking the thing it guards and watching it go red.

### And the answer to your other question: is the `email_change` template dead

**Yes, and now by construction rather than by luck.** Nothing initiates a
change, the confirm screen refuses the token, and the hook refuses to send the
mail. Before today it was dead only because nobody had tried.

### One thing this does NOT stop, and you should know it

**Deleting an account frees its address.** The purge rewrites the address to a
`deleted.invalid` pseudonym specifically so the real one can be used again, and
that comment is in the code and predates today. So delete-and-re-register is a
reset button on the mailbox link that `account_identities` records. That is a
defensible product decision and it is also a gap in the abuse story in
`docs/ONE_PERSON_MANY_ACCOUNTS.md`. **It is your call which one wins**, and I
have not changed it.

---

## Open, and urgent

### 121 LIGHT TWINS, WHICH IS THE REAL LIGHT-MODE FAULT

You said the icon plates are dull navy on white and the ground token is the
cause. It was measured and the cause is not the plate: every lighter plate
loses MORE artwork than the navy one, because the artwork carries both bright
highlights and dark strokes, so no paper value improves it. **The plate is
dark to serve artwork drawn for a dark ground.**

23 of the 144 glass objects ship a designed light twin. **121 do not**, and in
daylight a twinned mark and an untwinned one are two different materials
sitting in the same row. That is what you are seeing.

**No amount of code closes this. It is a render order:**

| What | Detail |
| --- | --- |
| Count | **121 PNGs** |
| Where | `apps/web/public/brand/glass/light/` |
| Names | **exactly** their dark counterparts in `glass/` |
| Size | **256 x 256**, which is what all 144 dark and all 24 existing light files are |
| Weight | about 2.6MB total |
| What they are | **designed twins, not filters.** A 3D glass object lit for a dark ground does not become a light one by inversion |

The asset layer is otherwise clean: 144 names against 144 dark files, zero
drift either way, and a new test now binds both lists to the directory in both
directions so an incoming twin that is named but not delivered fails at the
gate. **That failure mode matters more than a missing file sounds:** a name
claimed without its file makes the component suppress the plate, so somebody in
daylight gets a broken image on a white page with nothing behind it.

### THREE ARTWORK FILES ONLY YOU CAN COMMISSION, AND THE EXACT SIZES

Item 6 asked for a light variant of the lockup, "not a filter, not an opacity
change". That instruction is right and it is why this is here rather than
done: a 3D glass rendering lit for a dark ground does not become an ink
drawing by filter. Recolouring the dark asset IS the filter you ruled out.

What the build needs, each at the existing artwork's real aspect ratio:

| File | Size |
| --- | --- |
| `vallo-wordmark-light.png` | 1516 x 334 |
| `vallo-mark-light.png` | 1228 x 1174 |
| `vallo-logo-light.png` | 1024 x 1024 |

**The seam is built and waiting**, so these drop in with one edit and every
appearance switches together. Three things were found while enumerating them:

* `Logo.tsx` already IS the seam for in-app surfaces. Two screens bypass it
  with hard-coded paths and are being brought back through it.
* **The auth screen must NOT switch.** It is locked dark in both themes by a
  standing ruling, so the dark mark is permanently correct there.
* **The emails must do nothing, and that is the right answer rather than a
  limitation.** They are dark-ground BY DESIGN, painted three times over
  precisely because mail clients cannot be trusted, and Gmail strips
  `prefers-color-scheme` entirely. The email carries its own ground, so the
  reader's theme is not the question.


### `CRON_SECRET` HAS WHITESPACE ON IT, AND IT IS BREAKING EVERY PRODUCTION DEPLOY

**Re-save it with no trailing newline or space. That is the whole fix, and it
unblocks two things at once.**

Vercel is refusing to build. Its own words, off the failed deployment:

```
errorCode:    INVALID_CRON_SECRET
errorMessage: The `CRON_SECRET` environment variable contains leading or
              trailing whitespace, which is not allowed in HTTP header values.
```

**Every production deployment since about 16:25 has failed**, four in a row and
counting. The site is still serving the build from 16:23. So:

* None of today's work is live, however green main is.
* The cron jobs still get no bearer, because the deployment that is serving
  them predates the variable entirely. That is exactly what the new refusal
  field has been reporting as `no-bearer`.

It was pasted with a newline, which is what happens when a secret is copied.
Re-save the same value without it, and both problems end: the deploy goes
through and the scheduler starts injecting the header.

**The earlier newline diagnosis was right about the mechanism and wrong about
the variable.** I said a pasted newline was making values differ and then
withdrew it when the misspelt name turned up. The name was real and so was the
whitespace; they were two faults stacked on the same afternoon, and I could
not see the second because the API will not show a sensitive value. Vercel
could see it, and said so in a field nobody had read.

### THE OLDER DIAGNOSIS, SUPERSEDED: THE VARIABLE WAS SPELLED `CRONS_SECRET`

**ONE LETTER. Rename it and the seven jobs come back.**

Read off the project's own environment: there is a production variable named
**`CRONS_SECRET`**, updated today at about 15:12, and **no variable named
`CRON_SECRET` at all**.

Vercel's scheduler sends `Authorization: Bearer $CRON_SECRET`, spelled exactly
that way. A variable called `CRONS_SECRET` is read by nobody: not by Vercel,
and not by us either, since nothing in this codebase mentions it. So the cron
requests arrive carrying no bearer at all, and our own door refuses them, which
is precisely the 401 we have been reading all day.

**THE FIX:** rename `CRONS_SECRET` to `CRON_SECRET`, production, same value as
`RECONCILE_CRON_SECRET`. A redeploy is not needed for the scheduler to pick it
up, but one happens on every push anyway.

I could not do this myself: the value is sensitive and the API will not hand it
over, so I cannot copy it into a correctly named variable. The name is the only
thing I can see, and the name is the fault.

`vercel.json` declares exactly the seven paths that are failing, so nothing
else about the wiring is wrong.

### The older diagnosis, superseded


**Measured at 15:10 today, after the two secrets were set and Vercel was
redeployed: the jobs are STILL being refused.** Two fresh refusals at 15:05
(hold sweep) and 15:10 (paystack reconcile). So this is not a redeploy that
has not landed; it is a third value that has not been set.

THREE values have to agree and only two of them were changed:

| Where | Name | Role | Status |
| --- | --- | --- | --- |
| Vercel | **`CRON_SECRET`** | **what Vercel's own scheduler SENDS**, as `Authorization: Bearer <CRON_SECRET>` | **not changed. This is the one.** |
| Vercel | `RECONCILE_CRON_SECRET` | what our own code COMPARES against | set to the new value |
| Supabase Vault | `vallo_reconcile_secret` | what the pg_cron path sends | set to the new value |

`lib/cron/auth.ts` compares the presented bearer against
`process.env.RECONCILE_CRON_SECRET`, and its own header says it: "Vercel Cron
sends `Authorization: Bearer <CRON_SECRET>`; the deploy must hold the same
value under BOTH names." Setting one name and not the other leaves the
platform scheduler presenting the old token to a door that now expects the new
one, which is exactly what the 15:05 and 15:10 refusals show.

**Set `CRON_SECRET` in Vercel to the same freshly generated value and
redeploy.** Nothing else needs to change.

**One thing that IS confirmed working:** those two refusals came through as
"locked out" at HIGH severity, where every one of the previous 256 read
"unauthorised" at medium. That is today's fix live in production: our own
scheduler being locked out of our own platform no longer reads like a stranger
probing a URL.

### THE ORIGINAL ENTRY, KEPT FOR THE RECORD


**`RECONCILE_CRON_SECRET` on the host no longer equals `CRON_SECRET` on the
scheduler.** Everything below follows from that one mismatch, and setting them
equal ends all of it.

Measured in the live database, not inferred:

| Measure | Value |
| --- | --- |
| `audit_log` rows for `entity_type = 'cron_job'` | **0. Not one, ever.** |
| Open `risk_alerts` | **256, and every single one is a refused cron job** |
| Oldest | 19 September 00:05 |
| Newest | today, 14:20 |

All seven jobs, every one refused at the door with 401: hold sweep 87 times,
pg cron watch 87, reconcile 69, inventory drift 4, account purge 3, saved
search alerts 3, complete stays 3.

**What has not been happening for four days, and what it has actually cost,
which are different questions.** The jobs that are refused are: the account
purge, the hold sweep, the money sweep on both its routes, stays completion,
inventory drift and saved search alerts.

**MEASURED, THE HARM TO DATE IS NIL, and I am correcting my own alarm.** I
wrote that deletion requests past their thirty day promise were going
unpurged, which implied there were some. There are none:

| Table | Rows |
| --- | --- |
| `account_deletion_requests` | **0** |
| `bookings` | **0** |
| `saved_searches` | **0** |
| `reservations` | **0** |

So no promise has been broken, no hold is stuck on anybody's money, and **the
purge backlog does not need a manual first run, because there is no backlog**.

That does not make the outage less worth fixing. It makes it cheap to fix
NOW rather than expensive to discover later: the first real user is the one
who would have paid for it, and a scheduler that has never once succeeded is
not a scheduler anybody should trust with the first deletion request.

**And the way it was reported is the exact pattern you named.** Each refusal
raised a MEDIUM alert reading "unauthorised", which looks like a stranger
probing a URL rather than our own scheduler being locked out of its own
platform. Four days of the entire fleet being down, reported hourly, in the
colour of a nuisance. That is now a CRITICAL naming the job and the secret to
fix, so the next occurrence is loud on the first hour.

**The older reconciliation outage is a second, separate fact** and it is still
true: 474 `wallet.reconciliation.run` rows, the newest dated **29 August**,
while `cron.job_run_details` reports succeeded every hour including today.


**1. The Vault site URL, which is costing money right now.**
`vallo_site_url` in the Supabase Vault points at a per deployment Vercel URL
that no longer exists, so the payment reconciliation job has been returning
`DEPLOYMENT_NOT_FOUND` since 29 August while the scheduler reported success
every hour. That job is the only thing that recovers a Paystack charge whose
webhook never arrived. **Set it to `https://www.vallospaces.com`**, which is
the stable alias, and www rather than the apex because the apex is a 308
redirect.

**2. The Supabase auth email rate limit.**
`GOTRUE_RATE_LIMIT_EMAIL_SENT` sits at or near two an hour. That made sense
while Supabase's shared sender was doing the work and makes no sense now that
Resend is. At two an hour the third person to sign up inside an hour is
refused by the platform before any of our code sees them. **Raise it on the
Auth rate limits page before anybody is invited.**

**3. The five probe rows in production.**
A migration that forges JWT claims to prove a stranger cannot read a
reservation ended on an UPDATE instead of a raise, so it committed instead of
rolling back. Five rows are live in production tables, including the only
reservation this platform has. Removing them loses data, so it is the
founder's call. **Recommendation: delete them, after the session writes down
exactly what the five are.** They are test artefacts, and the only reservation
on the platform being a forged one is the same dishonesty the whole of today
was spent removing.

**4. The auth screen slogan.**
"Real Estate reimagined!" still sits beside the lockup on the sign-in screen.
The landing no longer says it. **Recommendation: remove it entirely** rather
than replace it, because the new headline already does that job one screen
earlier.

---

## Open, not urgent

**5. Receiving mail at hello@vallospaces.com. THIS IS STILL OPEN AND IT
MATTERS.**

Resend sends and does not receive, so today anybody who replies to a Vallo
email is writing into nothing. That address is about to go in front of agents,
landlords, developers and Apple's review team.

What has been tried and where it stands:

- **ImprovMX.** The forwarding route. The verification link they emailed did
  not work. **To retry: delete the unverified forwarding address in the
  ImprovMX dashboard and add it again, which fires a fresh email. Copy the
  link and paste it into the browser address bar rather than tapping it, and
  check spam.** Three things kill that link: expiry, spam filtering, and a
  mail app mangling it.
- **Zoho Mail.** Ruled out. The free plan is no longer available and the
  signup is a maze.
- **ForwardEmail.net.** The recommended alternative, because the entire setup
  is DNS records and there is no verification link at all. Free. Forwards into
  Gmail rather than giving a real mailbox.
- **Cloudflare Email Routing.** Also free and good, and its verification goes
  to the Gmail destination which is reachable, so no link problem. Needs the
  nameservers moved off Vercel to Cloudflare and every DNS record recreated
  there, which is a bigger job with real risk to a live site.

**The stopgap, which should ship regardless of which of those wins.**
`lib/email/client.ts` already accepts `replyTo` and already sends it as
Resend's `reply_to`; nothing sets a default. An `EMAIL_REPLY_TO` environment
variable, read where `EMAIL_FROM` is read and applied as the default, means
every reply lands in the founder's Gmail from today. The email still comes
from hello@vallospaces.com. The only cost is that the Gmail address is visible
to whoever replies.

**Caution for whichever provider wins:** SPF is a single TXT record on the
domain, and if both Resend and the mailbox provider send mail, that one record
has to include both. Getting it wrong sends half the platform's mail to spam.

**6. Leaked password protection.** Not a free toggle after all: Supabase gates
it behind the Pro plan. It was on the store checklist as one click and it is
not. Treat it as a paid item.

**7. D-U-N-S number, then Apple, then Google.** The D-U-N-S is free and takes
up to thirty business days, and both stores require it for an organisation
account. It is the longest clock the company has.

**8. The solicitor and Paystack questions.** Both drafted and waiting to send.
Paystack first, because it is free and may remove the licensing question
entirely if the money can be split at the processor and never reach the
company's account.

**9. Real supply.** Sixty four listings, all examples, zero transactions. No
amount of engineering fixes it and it is the largest thing standing between
this platform and a business.
