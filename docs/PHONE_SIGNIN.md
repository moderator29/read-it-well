# Phone sign-in (A2), and passwordless email and passkeys (A3)

Written 30 September 2026 by the front door build. Everything here is **off by
default** and stays off until the founder completes the steps below.

## What is built

- **Email code sign-in (A3), live now.** On `/sign-in`, "Email me a code
  instead" opens `/sign-in/code`. It calls Supabase `signInWithOtp` for an
  existing account only (`shouldCreateUser: false`) and `verifyOtp` with
  `type: "email"` (`apps/web/src/lib/auth/email-code.ts`). The mail is the one
  every auth code already uses: the Send Email hook
  (`app/api/auth/email-hook`) renders the `magiclink` type as the code email
  and sends it through Resend from hello@vallospaces.com. No template, SMTP
  setting or sender changes.
- **Phone sign-in (A2), behind `PHONE_SIGNIN_ENABLED`.** "Continue with phone
  number" on `/sign-in` opens `/sign-in/phone` (a 404 while the switch is
  off). The field is a Nigerian mobile number, normalised by `lib/phone.ts`.
  Supabase Auth **generates and checks** the code (`signInWithOtp({ phone })`,
  `verifyOtp({ type: "sms" })`). Our Send SMS hook
  (`app/api/auth/sms-hook/route.ts`) **only delivers** it.
- **The provider**, Termii, behind the existing thin interface
  `OtpTransport` (`lib/phone-otp/transport.ts`, implementation
  `lib/phone-otp/termii.ts`). It tries WhatsApp first (when
  `TERMII_WHATSAPP_ENABLED=true`), then Termii's **DND** route, so MTN and
  Airtel numbers on Do-Not-Disturb still get the code, then the generic
  route. Twilio Verify can replace it later by writing one more
  `OtpTransport`; no screen changes.
- **Passkeys (A3), behind `NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED`.** The installed
  supabase-js (2.110.9) has `signInWithPasskey` and `registerPasskey`, marked
  **experimental**, and the project must switch them on. The sign-in button
  exists (web only, `components/auth/PasskeySignIn.tsx`); registering a
  passkey from Settings is not built yet (it waits on the founder turning the
  feature on, and on the native shell's associated domains).

## Email is not affected, and cannot be

- Resend stays the sender for every platform email (`lib/email/client.ts`,
  hello@vallospaces.com).
- The Supabase Auth email templates and SMTP settings stay exactly as they
  are. Nothing in this work edits `supabase/templates/` or the Send Email hook.
- The Send SMS hook fires only for phone codes: Supabase calls it only when it
  sends an SMS OTP, and the route itself refuses everything while
  `PHONE_SIGNIN_ENABLED` is off.
- `apps/web/src/lib/auth/phone-sign-in.test.ts` proves it: the email sign-in
  and sign-up paths (`lib/auth/actions.ts`, `lib/auth/email-code.ts`), the
  Send Email hook and the email client never import the SMS provider or ask
  GoTrue for a phone code, and the SMS hook never touches email.

## What the founder must set up, in this order

1. **Termii account.** Sign up at termii.com, complete the business KYC, and
   fund the wallet. Note the API key (Dashboard, API settings).
2. **Sender ID.** Request a sender ID (for example `Vallo`) and wait for
   Termii's approval; Nigerian networks need it approved before messages
   deliver. Ask Termii to enable the **DND** route on the account (it carries
   one-time codes to numbers on Do-Not-Disturb).
3. **WhatsApp (optional, recommended).** In Termii, connect a WhatsApp
   Business sender. This needs **Meta Business verification** of VALLO SPACES
   LTD and an **approved message template in the Authentication category**
   (a one-time code, with a copy-code button). Until it is approved, leave
   `TERMII_WHATSAPP_ENABLED` unset and codes go by SMS.
4. **Cost ceiling.** Decide the per-code cost you accept (founder question 7)
   and set a low-balance alert in Termii.
5. **Supabase dashboard** (project `uccixoonmbhrnyczyigt`):
   - Authentication, Sign In / Providers, **Phone**: enable phone sign-in.
     Leave "confirm phone" on (do not auto-confirm), or the hook never runs.
   - Set the SMS OTP expiry (Authentication, Sign In / Providers, Phone) to
     600 seconds and the length to 6.
   - Authentication, **Hooks**, **Send SMS**: type HTTPS, URL
     `https://www.vallospaces.com/api/auth/sms-hook`, generate the secret and
     copy the whole `v1,whsec_...` value.
   - Do **not** touch the Send Email hook, the email templates or SMTP.
   - For passkeys only: Authentication, Passkeys, enable, relying party
     display name `Vallo`, RP ID `vallospaces.com`, origins
     `https://www.vallospaces.com,https://vallospaces.com`. The RP ID must
     never change once people register passkeys.
6. **Vercel environment variables** (Production, then Preview if wanted):
   - `SEND_SMS_HOOK_SECRET` = the value from step 5
   - `TERMII_API_KEY` = from step 1
   - `TERMII_SENDER_ID` = the approved sender ID from step 2
   - `TERMII_WHATSAPP_ENABLED` = `true` only after step 3 is approved
   - `PHONE_SIGNIN_ENABLED` = `true` last, once a test code has arrived
   - `NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED` = `true` only after the Passkeys
     setting in step 5 (a rebuild is needed; it is a public variable)
7. **Privacy notice.** Termii then receives phone numbers and codes: add it to
   the processors in `apps/web/src/lib/legal/privacy.tsx` before switching on.
8. **Test** with your own MTN and Airtel numbers (one on DND), on web and in
   the store app, before telling anyone.

Never put a real key in the repository; every value above lives in Vercel.

## Decisions still open (founder)

- Whether a phone-only account may book or pay before it adds an email. Today
  a new phone account passes the finish-setup gate (terms and 18+) like a
  Google or Apple account and is otherwise an ordinary account.
- The per-code cost ceiling and whether WhatsApp is worth the Meta
  verification now.
- The "Continue with phone number" door on `/sign-up` is built too
  (`components/auth/SignUpOptions.tsx`, shown only while
  `PHONE_SIGNIN_ENABLED` is on); it opens `/sign-in/phone`, which creates an
  account for a new number.
