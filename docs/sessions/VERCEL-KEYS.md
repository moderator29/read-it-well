# Vercel keys (project read-it-well-web, Production)

Corrected 7 October 2026 against the founder's own list of what is set. Names
only; never paste a value into chat or git.

## Already set (23)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, the `FCM_*` keys, `CRON_SECRET`, `RECONCILE_CRON_SECRET`,
`TERMII_API_KEY`, `RESEND_API_KEY`, `EMAIL_REPLY_TO`, `ANTHROPIC_API_KEY`,
`GOOGLE_PLACES_API_KEY`, `NEXT_PUBLIC_MAPTILER_KEY`, `LITEAPI_KEY`,
`LITEAPI_WHITELABEL_DOMAIN`, `NEXT_PUBLIC_AUTH_PROVIDERS`, `CALENDAR_SYNC_ENABLED`,
`VALLO_PUBLIC_CATALOGUE`.

`VAPID_SUBJECT` is not needed: `lib/push/credentials.ts` defaults it.

## Still missing

| Key | What it unblocks | Note |
| --- | --- | --- |
| `TERMII_SENDER_ID` | SMS one-time codes (phone confirmation) | Value `Vallo`, awaiting Termii approval |
| `PAYSTACK_TEST_SECRET_KEY` | Test-mode charges on preview deployments | Paystack > Settings > API Keys, test mode |
| `PAYSTACK_GUARANTEE_SUBACCOUNT` | Only if the Guarantee reserve returns | Retired at 0 percent; can stay unset |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` | iPhone push | Apple Developer > Keys |
| `EMAIL_FROM` | The sender on every email | e.g. `Vallo <hello@vallospaces.com>`, a verified Resend domain |
| `NEXT_PUBLIC_SITE_URL` | Absolute links in emails, share cards, callbacks | `https://www.vallospaces.com` |
| `SENTRY_DSN` | Error monitoring | Optional |

## Arriving later

- `PAYLUK_SECRET_KEY` (and `PAYLUK_TEST_SECRET_KEY` for previews): issued with merchant
  access after KYC. The adapter is built against Payluk's documented shapes and fixtures
  behind the `payments_payluk_on` switch, so the key is the only thing left to add.
  In the Payluk dashboard then: webhook `https://www.vallospaces.com/api/payluk/webhook`
  and whoPays = seller.

## Not needed

`YELLOWCARD_*`, `VALLO_NIMC_*`, `WHATSAPP_*`.

## Not a Vercel key, but needed for the phone apps

- A new native build (iOS and Android) for the plain launch screen, Face ID and push.
- Android: the real SHA-256 signing fingerprints in `apps/web/public/.well-known/assetlinks.json`.
- iOS: `aps-environment` set to `production` for the App Store build.
