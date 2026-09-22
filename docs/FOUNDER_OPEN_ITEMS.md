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

## Open, and urgent

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
