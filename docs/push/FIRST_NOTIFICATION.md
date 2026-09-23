# The first notification

**For the founder. Everything on this page you can do alone, in about a
minute, with no account to open and no money to spend.**

Read the first four lines before anything else:

- **Nothing has ever reached a device.** Not once, not in a test, not in a
  screenshot.
- **The key is already set.** As of 23 September a VAPID pair has been
  generated and put on Production and Preview
  (`docs/BUILD_07_LEDGER.md` section 71). **So part one below is a CHECK, not a
  task.** This page was written before that happened and the first draft told
  you to generate a pair; that instruction has been removed, because following
  it now would be destructive. See the warning under part one.
- **Web Push needs nobody and costs nothing.** It works on Android phones, on
  desktop browsers, and on iPhones from iOS 16.4 once Vallo is added to the
  home screen.
- **Android through Firebase and iPhone through Apple are separate, later, and
  one of them costs 99 USD a year.** They are at the foot of this page. You do
  not need either of them to see a notification arrive.

---

## Part one: check the key, and DO NOT GENERATE A NEW ONE

> ### Read this before you run anything
>
> **A VAPID pair is an identity, not a password, and replacing it is a
> destructive act.** Every browser that subscribes is bound to the PUBLIC half.
> Generate a new pair and every device already enrolled goes silent for ever,
> with nothing on the device and nothing in the database saying why; they come
> back only if each person opens Vallo again and re-enrols.
>
> It was safe to create the first pair because `push_tokens` was empty. **It
> will never be that safe again.** So: do not run
> `npx web-push generate-vapid-keys` against production to "fix" anything. If
> something is wrong, part one tells you what, and almost nothing is fixed by a
> new pair.

Open this in any browser, on the phone or the laptop. It is a plain page you
can read with your eyes, and it prints **no secret value ever**:

```
https://<your site>/api/push/key
```

| What it says | What it means | What to do |
|---|---|---|
| `{"configured":true,"publicKey":"B..."}` | The deployment has the pair and the two halves belong together. **This is what it should say today.** | Go to part two, then part three. |
| `{"configured":false,"missing":["NEXT_PUBLIC_VAPID_PUBLIC_KEY",...],"supplier":"..."}` | The build does not have the key or keys it names. | The variables are set but the build predates them: `NEXT_PUBLIC_` values are compiled in at BUILD time, not read at run time, so **redeploy**. If they are genuinely not in Vercel, they are in Vault and go back in as they came out. |
| `{"configured":false,"reason":"public_key_malformed"}` | The value is set but is not a key. | A character was lost in the paste. Paste it again from Vault. |
| `{"configured":false,"reason":"keys_are_not_a_pair"}` | The two halves do not belong together. | **This is the one that would otherwise waste an afternoon**, because every send is then refused 401 with no explanation. It means one half was replaced without the other. Put the matching half back from Vault. **Only if both halves are genuinely lost is a new pair the answer, and then read the warning above first.** |

That last check is done by the deployment itself, arithmetically, from the two
halves. It is not a guess.

**Locally instead of on Vercel**, `apps/web/.env.local` takes the same two
variables and `apps/web/.env.local.example` has them with the same notes.
A LOCAL pair may be a different pair: nothing on your machine shares
subscriptions with production, so generating one for local work is safe and
costs nothing. `.env.local` is not in the repository and must never be.

---

## Part two: what each variable is, for when you need to look

| Variable | What it is | Note |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the Public Key | Public by design. A browser cannot subscribe without it, so it has to be in the page. |
| `VAPID_PRIVATE_KEY` | the Private Key | **Never give this one the `NEXT_PUBLIC_` prefix.** That prefix compiles a value into the browser bundle, where anybody can read it, and anybody holding this key can send notifications to every Vallo device. |
| `VAPID_SUBJECT` | a contact address | Optional. A real requirement of the standard rather than a courtesy: some push services refuse a request without one. Defaults to `mailto:hello@vallospaces.com`, so you can leave it alone. |

---

## Part three: the handset

1. **On the phone, open Vallo and sign in.**
   - **On an iPhone you must add Vallo to the home screen first**, with Share
     then Add to Home Screen, and then open it from the home screen icon.
     Safari does not give a website notifications; it gives an installed one
     notifications. Inside plain Safari the settings screen will tell you this
     in as many words rather than showing a button that cannot work.
   - On Android, Chrome works as it is.
2. **Go to Settings, then Notifications.** Scroll to **On your phone**.
3. **Tap the button that offers to turn notifications on for this device.**
   Say yes to the Vallo screen, then yes to the system prompt behind it.
   - The system prompt is spent once. If you say no to it, the only way back is
     your own phone settings, and the screen will tell you so rather than
     offering a button that leads nowhere.
4. **The device now appears in the list below the button**, with when it was
   set up and a short code like `Device 4f1c8a20b3d7`. That code is generated
   from the subscription and cannot be turned back into one; it is there so you
   can tell two identical phones apart, and it is safe to read aloud.

If the device appears in that list, the subscription exists and the database
has it. **That is not yet a notification.**

---

## Part four: the one request

**Do this from a laptop, signed in to the same Vallo account, in the same
browser you are signed in with.** `POST /api/push/self-test` sends to **every
live device on your own account**, so firing it from the laptop is what puts a
notification on the phone without needing a console on the phone.

Open the browser's developer console on any Vallo page and run:

```js
await fetch("/api/push/self-test", { method: "POST" }).then((r) => r.json());
```

### What success looks like

```json
{
  "ok": true,
  "accepted": 1,
  "attempted": 1,
  "results": [
    { "deviceRef": "4f1c8a20b3d7", "platform": "web", "status": 201, "outcome": "accepted" }
  ],
  "note": "A 2xx means the push service accepted the message, not that a handset displayed it. ..."
}
```

**And a notification appears on the phone, titled Vallo, saying "Push is
working. This is a test you asked for."** Tapping it opens your notifications
list.

### READ THIS PART, BECAUSE THE STATUS CODE IS NOT THE PROOF

**A `201` means the push service took the message. It does not mean a screen
lit up, and it cannot.**

The body we send is encrypted to that one subscription. Google's push service
cannot read it either, so it accepts a message no browser can open exactly as
cheerfully as it accepts a good one. A 201 proves four things and they are all
worth having: the credentials are right, the signature was accepted, the
endpoint is alive, and the message is on its way. It proves nothing about what
the handset then did with it.

**The screen is the only proof of the last hop.** If you get a 201 and no
notification appears, the message reached the push service and the handset or
the service worker did not finish the job. That is a real failure and it is a
different one from a bad key.

### What failure looks like

| Answer | What happened | What to do |
|---|---|---|
| `503 {"reason":"unconfigured"}` | The deployment has no Supabase connection at all. | Nothing to do with push. |
| `401 {"reason":"signed_out"}` | You are not signed in in that browser. | Sign in and run it again. |
| `409 {"reason":"no_devices"}` | No live device on a platform this deployment can reach. | Part four did not finish, or every device was turned off from the settings list. |
| `502` with `"status": 401` on a result | The push service refused our signature. | The two halves are not a pair, or the private key was pasted with a character missing. Go back to part one, which settles it arithmetically. |
| `502` with `"status": 403` | The subscription belongs to a different public key. | The pair was regenerated after that device enrolled. Turn the device off in Settings and turn it on again. |
| `502` with `"status": 404` or `410` | The subscription is dead. | Normal after a browser reinstall or a long absence. Enrol the device again. The drain retires a gone token by itself. |
| `502` with `"status": 0` | The request never completed: a timeout, a reset, a blocked host. | A network problem between the deployment and the push service, not a credential problem. |
| `200`, `"accepted": 1`, and no notification | The push service has it and the device did not show it. | See the three checks below. |

### If the send was accepted and nothing appeared

1. **Check the phone did not silence it.** Quiet hours do not apply here:
   the self-test bypasses the queue and the policy entirely and goes straight
   to the transport. But the phone's own Do Not Disturb does apply.
2. **Check the service worker is the current one.** On a desktop browser:
   developer tools, Application, Service Workers. It should show one worker at
   scope `/`, from `/sw.js`, activated. Everything a person sees, the title,
   the body, the icon and where a tap lands, is decided in
   `apps/web/public/sw.js`.
3. **Check the device was not turned off between enrolling and sending.**
   Settings, Notifications: if the row is gone from the list, the subscription
   was retired and the send went to a dead endpoint.

---

## After the test: how a real notification differs

The self-test goes straight to the push service. A real one does not, and the
difference is worth knowing before you judge it as late or missing.

- **A real notification is queued, not sent immediately.** Anything that writes
  a row to `notifications` is put on `push_queue` by a database trigger, and a
  scheduled job drains that queue **every five minutes**. So a booking request
  may take up to five minutes to buzz. That is the design, not a fault: it is
  what lets eleven things that happened while you were away arrive as one.
- **Quiet hours apply to a real one.** They are off by default; when a person
  turns them on, the default window is 22:00 to 07:00 West Africa Time, and
  anything about money ignores it, because sitting on a failed withdrawal until
  morning is worse than waking somebody for it.
- **Preferences apply to a real one.** Settings, Notifications, the channel
  toggles above the device list.
- **Several at once become one.** Above three ordinary notifications the phone
  shows a single row saying how many things happened. Money is never folded
  into that count and is never closed by it.

---

## Android and iPhone, which are separate and later

Neither is needed for anything above. Both are for the **native applications**,
not for the website, and the website already reaches an Android phone and an
installed iPhone through Web Push.

**Android, Firebase Cloud Messaging. Supplied by you. Costs nothing in money.**
It needs a Google account and a Firebase project created in a console, which is
why it is yours and not a build session's. Two variables, `FCM_PROJECT_ID` and
`FCM_SERVICE_ACCOUNT_JSON`, and then **the half everybody forgets**: the same
Firebase project must also give you `apps/web/android/app/google-services.json`,
which is a file in the repository and not a variable. Without that file an
Android handset never obtains a token, so the server credential on its own
sends to nothing.

**iPhone, Apple Push Notification service. Supplied by you. Costs 99 USD a
year.** It needs an Apple Developer membership, and
`apps/web/ios/App/App/App.entitlements` already records that this account does
not exist. Until it does there is no native iOS push and no entitlement that
will build. The `.p8` signing key downloads **once** and cannot be downloaded
again.

`apps/web/.env.example` has all of these with the same notes, one comment per
variable. The deployment will also tell you itself: `describeCredentials()` in
`apps/web/src/lib/push/credentials.ts` names every missing variable and who
supplies it, and the drain refuses to claim queue rows for a platform it has no
credential for, so nothing queued today is lost by waiting.

---

## What is owed, said here rather than left for you to notice

- **There is no monochrome Vallo mark for the Android status bar.** A
  notification carries a badge there, drawn as a flat silhouette, and there is
  no such file in `apps/web/public/`. No badge is named at all rather than
  naming one that does not exist, so Android draws the browser's own small mark
  beside our notification. It is a blemish, it is not a failure, and closing it
  needs one 72 by 72 pixel monochrome PNG from whoever owns the icon set.
- **Nothing on this page has been run against a real push service.** It was
  written from the code and from what each answer means. The build container
  cannot reach `mtalk.google.com:5228`, which is the host a browser completes a
  push registration over, so no subscription could be created here and there
  was nothing to send to. Every failure row in the table above is a documented
  status from the Web Push standard and from this repository's own handling of
  it, **not something that was observed happening**. The first run of this page
  is yours, and if a step is wrong it is worth saying so.
- **That the key is on production is taken on the ledger's word, not measured.**
  `docs/BUILD_07_LEDGER.md` section 71 records the pair being created and set on
  Production and Preview on 23 September. This container's egress proxy refuses
  a CONNECT to the production host, so it could not be read from here. **Part
  one settles it in one look** and is the first thing on this page for that
  reason.
