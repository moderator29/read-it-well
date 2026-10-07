# Keys to add in Vercel (project read-it-well-web, Production)

The Vercel connection in this session cannot see the `read-it-well-web` project (it only
sees one unrelated project in the team), so this list is everything the code reads.
**Skip any that are already set.** Names only; never paste a value into chat or git.

## 1. Must have, or the app does not run

| Key | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project settings > API (publishable / anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project settings > API (secret / service role) |
| `NEXT_PUBLIC_SITE_URL` | `https://www.vallospaces.com` |
| `CRON_SECRET` | Any long random string; Vercel cron sends it, the job routes check it |
| `RECONCILE_CRON_SECRET` | Any long random string (the reconciliation job) |

## 2. Money: Paystack (card payments, stays, hotels, restaurant deposits, referral payouts)

| Key | Where to get it |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard > Settings > API Keys (`sk_live_...`) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Same page (`pk_live_...`) |
| `PAYSTACK_TEST_SECRET_KEY` | Same page, test mode (`sk_test_...`), for previews |
| `PAYSTACK_MODE` | `live` in Production, `test` in Preview |
| `PAYSTACK_FLOAT_SECRET_KEY` | Only if referral payouts use a separate Paystack account; otherwise leave unset |
| `PAYSTACK_GUARANTEE_SUBACCOUNT` | Only if the Guarantee reserve is used (it is retired at 0 percent; can stay unset) |

Also in the Paystack dashboard: **Webhook URL** `https://www.vallospaces.com/api/paystack/webhook`.

## 3. Money: Payluk (wallet, deposits, withdrawals, transfers, rental escrow)

| Key | Where to get it |
| --- | --- |
| `PAYLUK_SECRET_KEY` | Payluk merchant dashboard (`sk_live_...`) |
| `PAYLUK_TEST_SECRET_KEY` | Payluk merchant dashboard, staging (`sk_test_...`), for previews |

Also in the Payluk dashboard: **Webhook URL** `https://www.vallospaces.com/api/payluk/webhook`
(signed with your secret key), and **whoPays = seller** (the lister bears Payluk's fee).

## 4. Push notifications (phone and web)

| Key | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generate once: `npx web-push generate-vapid-keys` (public half) |
| `VAPID_PRIVATE_KEY` | The private half of the same pair |
| `VAPID_SUBJECT` | `mailto:support@vallospaces.com` |
| `FCM_PROJECT_ID` | Firebase console > Project settings (`vallo-44059`) |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase > Project settings > Service accounts > Generate new private key (paste the whole JSON) |
| `APNS_KEY_ID` | Apple Developer > Keys > a key with Apple Push Notifications |
| `APNS_TEAM_ID` | Apple Developer > Membership (`X74KD52994`) |
| `APNS_PRIVATE_KEY` | The `.p8` file contents of that key |
| `APNS_BUNDLE_ID` | `com.vallospaces.app` |
| `APNS_PRODUCTION` | `true` for the App Store build |

## 5. Email, SMS and phone sign-in

| Key | Where to get it |
| --- | --- |
| `RESEND_API_KEY` | resend.com > API keys |
| `EMAIL_FROM` | e.g. `Vallo <hello@vallospaces.com>` (a verified domain in Resend) |
| `EMAIL_REPLY_TO` | e.g. `support@vallospaces.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support@vallospaces.com` |
| `TERMII_API_KEY` | Termii dashboard (SMS one-time codes) |
| `TERMII_SENDER_ID` | Your approved Termii sender name |
| `SEND_SMS_HOOK_SECRET` | Supabase > Auth > Hooks > Send SMS hook secret |
| `SUPABASE_AUTH_HOOK_SECRET` | Supabase > Auth > Hooks secret |
| `PHONE_SIGNIN_ENABLED` | `true` |

## 6. AI assistant, maps, monitoring

| Key | Where to get it |
| --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API keys |
| `NEXT_PUBLIC_MAPTILER_KEY` | maptiler.com > Account > Keys |
| `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` | sentry.io > Project > Client keys (optional) |
| `OPS_ALERT_EMAIL` | Where operational alerts go, e.g. your email |

## 7. Product switches set by environment (set to `true` to turn on)

| Key | What it turns on |
| --- | --- |
| `VALLO_PUBLIC_CATALOGUE` | Signed-out visitors can browse listings |
| `VALLO_SOCIAL_SIGN_IN` | Google / Apple sign-in buttons (needs the providers enabled in Supabase Auth) |
| `NEXT_PUBLIC_PASSKEY_SIGNIN_ENABLED` | Passkey (Face ID / fingerprint) sign-in |
| `CALENDAR_SYNC_ENABLED` | Hotel and shortlet calendar sync |
| `CSP_ENFORCE` | Enforce the content security policy (recommended `true` once tested) |
| `NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL` | Store links once the apps are live |

## 8. Later, only if you use them

- **Identity (NIN):** `VALLO_NIMC_MERCHANT_CODE`, `VALLO_NIN_HMAC_KEY`
- **WhatsApp:** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `NEXT_PUBLIC_WHATSAPP_NUMBER`
- **Yellow Card (international, stablecoin, phase 22):** `YELLOWCARD_API_KEY`, `YELLOWCARD_API_SECRET`, `YELLOWCARD_WEBHOOK_SECRET`, `YELLOWCARD_API_BASE`
- **Hotel supply via LiteAPI** (not built; your decision pending): no key yet

## Also not a Vercel key, but needed for the phone apps

- A **new native build** (iOS and Android) for: the plain launch screen, Face ID, push.
- Android: your real **SHA-256 signing fingerprints** in `apps/web/public/.well-known/assetlinks.json`.
- iOS: `aps-environment` set to `production` for the App Store build.
