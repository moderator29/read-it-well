# Back navigation

Where every back control on Vallo goes, and why. Written 29 September 2026 after
the founder's report: "there are many back buttons that take me to places
they're not supposed to."

The decision is one pure function, `chooseBack` in
`apps/web/src/lib/nav/resolve.ts`. The hierarchy it reads is
`apps/web/src/lib/nav/route-parents.ts`. Every drawn back arrow and Android's
hardware back button take that same decision.

## The rule

**Back goes to the screen you came from when that screen is inside the product
and safe to return to. Otherwise it goes to the screen's declared parent.**

Before this change the rule was "use history only when the screen behind *is*
the declared parent, otherwise go to the parent". Anyone who had walked in got
sent to a parent they had never opened. A listing opened from Home went back to
Search. A profile opened from a post went back to the top of the feed. A booking
opened from Notifications went back to Plans. The parent is still the right
answer for a cold deep link, and now that is the only case where it is used.

### When the screen behind is refused

`refuseHistory(current, previous)` refuses the screen behind in these cases,
and Back goes to the declared parent instead:

| Refusal | The screen behind is... | Why |
| --- | --- | --- |
| `no-previous` | unknown: a cold deep link, or a browser without the Navigation API | Without proof there is no history walk |
| `not-in-app` | another site or app | Back must not leave the product |
| `door` | sign in, sign up and their steps, `/auth/callback`, password reset, `/welcome`, `/start`, `/open`, `/home-or-landing`, `/admin/enter`, `/s/[token]`, `/offline` | A signed-in person is never sent back to a login page. This was the founder's first example |
| `flow` | a form or payment that ends in a navigation: new message, share pickers, new story or post, new ticket, profile edit, complaint, booking review, checkout, crypto pay, rent pay, rent review, move-in, profile setup forms, verification, phone, passcode, list a property, mandate, host apply, start and transfer | Back never goes back into a form that was already submitted |
| `success-flag` | carrying `?done=` | That URL is a redirect's receipt |
| `descendant` | a child of the current screen, or the same screen | This is the entry a previous "up" left behind. Going back to it would loop |
| `other-workspace` | in a *different* workspace (agent, host or admin) while the current screen is inside one and is not that workspace's landing page | Back inside a console never crosses into another console |
| `undeclared` | not in the route map | Never guessed |

The declared parent always wins when it is the screen behind (`history-is-parent`),
even when it is itself a door or a flow. For example, `/sign-up/verify` goes back
to `/sign-up/email`.

A consumer screen behind a workspace screen *is* returned to. A help page opened
from the agent drawer goes back to the agent dashboard. "List a property" opened
from the Create sheet goes back to where the sheet was opened.

### Mechanics

- **Up replaces, it does not push.** When the parent is used, it
  replaces the current history entry (`router.replace`). The browser's own back then
  continues backwards and never returns to the screen the person just left. A
  push used to leave a stack of up-navigations that the browser then replayed.
- **Same-screen entries are skipped.** A search re-filtered three times, a
  sign-up step and an open sheet all leave entries at the same pathname.
  `previousEntry()` (`previous-entry.ts`) finds the nearest entry at a
  *different* pathname and how far back it is. The control then calls
  `history.go(-n)`, so one press leaves the screen.
- **A double tap goes back once.** A second press within 800 ms on the same
  screen is ignored.
- **Redirect parents.** `/search` and `/around` declare `/home-or-landing`.
  That is a server redirect to `/home` for a member and to `/` for anyone else,
  and it is loaded with a real request.
- **Browsers without the Navigation API.** `previousEntry()` returns `null` and
  the declared parent is used. Chromium, Edge and Safari 26.2+ have the API.
  Older Safari and Firefox fall back to the parent, never to a guess.

### Steps inside one screen

These keep their own step back. It goes through `BackControl`'s `onBack`, and
Android goes through `lib/nav/in-page-step.ts`:

- Sign-up step two (`?step=2`, stamped `nfStep`) goes back to step one through
  history, and the answers are kept.
- The welcome slides (stamped `nfGsSlide`) go back one slide. An entry without a
  stamp steps the slide without touching history.
- Wizards (register forms, KYC, host wizard, list a property) go back one step.
  From the first step they leave through the shared `useBack`: to the chooser
  or dashboard the person came from, otherwise to the declared parent. They
  used to push that parent again.
- Sheets and overlays: browser back closes the top sheet
  (`use-sheet-history.ts`). Android's back dispatches Escape to the top overlay.
  Neither changes the page.

### Android hardware back

`lib/native/back-button.ts`, in this order:

1. An overlay is open: it closes.
2. The entry is an in-page step: back one step.
3. The route is a declared ROOT (`/`, `/home`, `/stays`, `/welcome`,
   `/sign-up/finish`): the app closes.
4. Otherwise it takes the same `chooseBack` decision as the drawn control
   (`NativeRuntime` calls `decideBack(..., "android")` and `performBack`).

## The control

There is one component, `apps/web/src/components/ui/BackControl.tsx`.
`BackButton`, `PageHeader`, `BackChevron`, the listing gallery (hero and
floating), the listing section tabs, the thread, the assistant, the inspection
sheet, the register shell, KYC, the host wizard, sign-up step two, list a
property and the welcome slides all draw it.

- 44 by 44 CSS px, drawn as the element's real size (not a pseudo-element
  target). The pill form is 44 tall.
- `arrow-left` at 20 px (`ICON.inline`), the 2.25 px rendered stroke from
  `docs/ICON_SYSTEM.md`.
- Its accessible name says where it goes, for example "Back to Messages", read
  off the live destination after mount (`useBackDestination`, names in
  `lib/nav/route-labels.ts`). Other locales use the translated `common.back`.
  A step back uses the caller's label.
- It is a native `<button type="button">`, so Enter and Space work and it shows
  the platform focus ring. `data-nav-back` is the selector the browser walks use.
  `data-back-destination` holds the path it will go to.
- The surfaces change the material only: `bare` (bars), `plate` (thread,
  assistant), `glass` (`PageHeader`), `media` (over a photograph) and `pill`
  (the profile banner, with the word drawn). A bar's own class
  (`nf-auth__back-btn`, `nf-ws-bar__btn`, `nf-ix-back`) replaces the default
  ink and never the size.
- It sits at the top left of the page header, bar or cover. There is one per
  screen: the admin listing review's second arrow was removed.

## Entry paths checked

| Arrival | Example | Back lands on |
| --- | --- | --- |
| From Home | Home, listing | Home |
| From search results | `/search?beds=2`, listing | `/search?beds=2` with its filters and scroll kept |
| Shared deep link, no history | a fresh tab on `/messages/t1` | `/messages` (parent) |
| From a notification | Notifications, booking or Plans | Notifications |
| From the dock tray | tray Help and support (`/support`) | the screen the tray was opened on |
| From a workspace | agent dashboard, `/support` | agent dashboard |
| After a form or redirect | `/support/new`, `/support/messages` | `/support` (parent), never the form |
| After sign-in | `/sign-in?next=/settings/account`, account | `/settings`, never sign-in |
| Across workspaces | `/host/rooms`, then `/agent/listings` | `/agent/dashboard`, never the host workspace |
| Re-filtered search | Home, three `/search?…` entries | Home in one press |
| Sheets and steps | `?step=2`, welcome slides, open sheets | the previous step, or the sheet closes |
| Loop guard | inbox, thread, Back, Back | thread to inbox, then inbox to Home |

## Wrong destinations found and fixed

Each of these was a real destination under the old code. Each has a test in
`src/lib/nav/resolve.test.ts`, and most are also walked by
`tests/back-destinations.spec.mjs`.

1. A listing opened from Home, Saved, a thread, a booking or the agent's
   listings went to `/search`.
2. A stay opened from stay search went to `/stays`, and the search was lost.
3. A profile opened from a post, or from a thread, went to `/around`, and the
   post was lost. The code comments claimed it returned to the post.
4. A post opened from a profile went to `/around`.
5. A thread opened from a listing or a booking went to the inbox.
6. A booking, Plans or an agreement opened from Notifications went to its list
   instead of Notifications.
7. `/search` and `/around` opened cold by a signed-in member went to `/`, the
   marketing page. They now go to `/home-or-landing`.
8. `/search` and `/around` opened from Home went to `/` instead of Home.
9. `/support` opened from the agent or host drawer went to the consumer `/home`
   and left the workspace. From Settings it went to `/home` instead of Settings.
10. Legal pages opened from each other went to `/settings`. Terms opened from
    the sign-up terms gate went to `/settings`, and the gate then bounced the
    person back.
11. Admin records opened from the queue or the support desk went to their own
    desk list (`/admin/people`, `/admin/bookings`).
12. An agent thread opened from agent notifications went to the agent inbox.
13. Every "up" pushed a new entry, so the browser's back returned to the
    screen that had just been left. On the web it now replaces.
14. After an up (thread to inbox), the inbox's back walked straight back into
    the thread. This is now refused as `descendant`.
15. A double tap walked back two screens.
16. The register forms (owner, agent, firm) and the host wizard pushed
    `/profile/setup` or `/host` from their first step, which stacked a second
    chooser.
17. The register "done" screens pushed `/home`, so browser back reopened the
    filed form. They now replace.
18. The admin listing review drew two back arrows, one in the console bar and
    one in the desk head. The desk head arrow is removed.
19. Eleven hand-drawn arrows had glyphs at 16, 20 or 24 px and targets of 40
    or 44 px (KYC and the host wizard were 40). Four were labelled with a
    hard-coded English "Back". All now use `BackControl`.

## Tests

- `apps/web/src/lib/nav/resolve.test.ts`: the map, every came-from case above,
  every refusal, same-screen skipping, the Navigation API distance, Android,
  and a name for every screen.
- `apps/web/src/lib/native/back-button.test.ts`: the real Android listener.
- `apps/web/tests/back-destinations.spec.mjs`: a real Chromium at 390 px
  walking 35 flows (public, signed-in member, agent and host workspaces). It
  checks the landing path, the announced destination, the 44 px size, the
  name, keyboard Enter, no double history entry, a double tap, and browser back
  after a drawn back.

## The table

The **came-from rule applies to every row**: when the screen behind is safe, Back
returns to it. This table lists where Back goes otherwise, that is when the
route is opened cold or the screen behind is refused. It is generated from
`route-parents.ts`. Preview harness routes are left out.

### The app homes

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/home` | ROOT (no drawn control; Android closes the app) |  |
| `/offline` | `/home` | yes, a door |

### Rent side and money

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/search` | `/home-or-landing` |  |
| `/listing/[id]` | `/search` |  |
| `/saved` | `/home` |  |
| `/saved/searches` | `/saved` |  |
| `/inspections/gate/[id]` | `/bookings` |  |
| `/rent/move-in/[listingId]` | `/listing/[listingId]` | yes, a flow (form or payment) |
| `/rent/review/[paymentId]` | `/bookings` | yes, a flow (form or payment) |
| `/record/[code]` | `/search` |  |
| `/rent/pay/[inspectionId]` | `/bookings` | yes, a flow (form or payment) |
| `/rent/share/[id]` | `/agreements` |  |
| `/tenancy/[id]` | `/bookings` |  |
| `/tenancy/[id]/complaint` | `/tenancy/[id]` | yes, a flow (form or payment) |
| `/price` | `/home` |  |
| `/price/area/[id]` | `/price` |  |
| `/agreements` | `/home` |  |
| `/payments` | `/home` |  |
| `/agreements/[id]` | `/agreements` |  |

### Stays, plans and payments

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/stays` | ROOT (no drawn control; Android closes the app) |  |
| `/stays/search` | `/stays` |  |
| `/stay/[id]` | `/stays` |  |
| `/restaurants` | `/stays` |  |
| `/restaurant/[id]` | `/restaurants` |  |
| `/bookings` | `/home` |  |
| `/bookings/[bookingId]` | `/bookings` |  |
| `/bookings/[bookingId]/review` | `/bookings/[bookingId]` | yes, a flow (form or payment) |
| `/checkout` | `/stays` | yes, a flow (form or payment) |
| `/checkout/[bookingId]` | `/bookings/[bookingId]` | yes, a flow (form or payment) |
| `/pay/crypto/[reference]` | `/bookings` | yes, a flow (form or payment) |

### Messages

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/messages` | `/home` |  |
| `/messages/[id]` | `/messages` |  |
| `/messages/new` | `/messages` | yes, a flow (form or payment) |
| `/messages/share/into/[id]` | `/messages/[id]` | yes, a flow (form or payment) |
| `/messages/share/listing/[id]` | `/listing/[id]` | yes, a flow (form or payment) |
| `/messages/share/stay/[id]` | `/stay/[id]` | yes, a flow (form or payment) |
| `/messages/share/booking/[id]` | `/bookings/[id]` | yes, a flow (form or payment) |

### Social

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/around` | `/home-or-landing` |  |
| `/around/[slug]` | `/around` |  |
| `/around/settings` | `/around` |  |
| `/around/new` | `/around/settings` | yes, a flow (form or payment) |
| `/around/manage` | `/around/settings` |  |
| `/post/[id]` | `/around` |  |
| `/stories/new` | `/around` | yes, a flow (form or payment) |
| `/stories/[id]` | `/around` |  |
| `/u` | `/around` |  |
| `/u/[handle]` | `/around` |  |
| `/u/[handle]/edit` | `/u/[handle]` | yes, a flow (form or payment) |
| `/u/[handle]/followers` | `/u/[handle]` |  |
| `/u/[handle]/following` | `/u/[handle]` |  |

### Account, settings and help

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/settings/passport` | `/settings` |  |
| `/assistant` | `/home` |  |
| `/notifications` | `/home` |  |
| `/profile` | `/home` |  |
| `/profile/application` | `/profile` |  |
| `/profile/setup` | `/profile` |  |
| `/profile/setup/[role]` | `/profile/setup` | yes, a flow (form or payment) |
| `/profile/setup/agent` | `/profile/setup` | yes, a flow (form or payment) |
| `/profile/setup/firm` | `/profile/setup` | yes, a flow (form or payment) |
| `/profile/setup/owner` | `/profile/setup` | yes, a flow (form or payment) |
| `/verification` | `/profile` | yes, a flow (form or payment) |
| `/settings` | `/home` |  |
| `/settings/account` | `/settings` |  |
| `/settings/appearance` | `/settings` |  |
| `/settings/devices` | `/settings` |  |
| `/settings/devices/alert` | `/settings/devices` |  |
| `/settings/help` | `/settings` |  |
| `/support` | `/home` |  |
| `/support/messages` | `/support` |  |
| `/support/new` | `/support` | yes, a flow (form or payment) |
| `/support/messages/[id]` | `/support/messages` |  |
| `/settings/interests` | `/settings` |  |
| `/settings/notifications` | `/settings` |  |
| `/settings/payments` | `/settings` |  |
| `/settings/place` | `/settings` |  |
| `/settings/privacy` | `/settings` |  |
| `/settings/privacy/blocked` | `/settings/privacy` |  |
| `/settings/phone` | `/settings` | yes, a flow (form or payment) |
| `/settings/passcode` | `/settings` | yes, a flow (form or payment) |
| `/legal/privacy` | `/settings` |  |
| `/legal/terms` | `/settings` |  |
| `/legal/disclaimer` | `/settings` |  |

### The agent workspace

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/agent/listings/[listingId]/arrival` | `/agent/listings` |  |
| `/agent/listings/[listingId]/mandate` | `/agent/listings` | yes, a flow (form or payment) |
| `/agent/dashboard` | `/home` |  |
| `/agent/analytics` | `/agent/dashboard` |  |
| `/agent/bookings` | `/agent/dashboard` |  |
| `/agent/earnings` | `/agent/dashboard` |  |
| `/agent/inspections` | `/agent/dashboard` |  |
| `/agent/listings` | `/agent/dashboard` |  |
| `/agent/listings/[listingId]/calendar` | `/agent/listings` |  |
| `/agent/listings/[listingId]/board` | `/agent/listings` |  |
| `/agent/listings/[listingId]/status` | `/agent/listings` |  |
| `/agent/list` | `/agent/listings` | yes, a flow (form or payment) |
| `/agent/messages` | `/agent/dashboard` |  |
| `/agent/messages/[id]` | `/agent/messages` |  |
| `/agent/notifications` | `/agent/dashboard` |  |
| `/agent/reviews` | `/agent/dashboard` |  |
| `/agent/settings` | `/agent/dashboard` |  |
| `/agent/portfolio` | `/agent/dashboard` |  |
| `/agent/verification` | `/agent/dashboard` |  |
| `/agent/firm` | `/agent/dashboard` |  |
| `/agent/assistant` | `/agent/dashboard` |  |

### The host workspace

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/host/arrival` | `/host` |  |
| `/host/earnings` | `/host` |  |
| `/host` | `/home` |  |
| `/host/apply` | `/host` | yes, a flow (form or payment) |
| `/host/photos` | `/host` |  |
| `/host/reservations` | `/host` |  |
| `/host/rooms` | `/host` |  |
| `/host/start` | `/host` | yes, a flow (form or payment) |
| `/host/transfer` | `/host` | yes, a flow (form or payment) |
| `/host/assistant` | `/host` |  |
| `/host/settings` | `/host` |  |
| `/host/notifications` | `/host` |  |

### The admin console

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/admin` | `/home` |  |
| `/admin/agents` | `/admin` |  |
| `/admin/alerts` | `/admin` |  |
| `/admin/analytics` | `/admin` |  |
| `/admin/audit` | `/admin` |  |
| `/admin/oversight` | `/admin` |  |
| `/admin/bookings` | `/admin` |  |
| `/admin/bookings/[bookingId]` | `/admin/bookings` |  |
| `/admin/bookings/reservations` | `/admin/bookings` |  |
| `/admin/businesses` | `/admin` |  |
| `/admin/agreements` | `/admin` |  |
| `/admin/examples` | `/admin` |  |
| `/admin/staff` | `/admin` |  |
| `/admin/handbook` | `/admin` |  |
| `/admin/handbook/position` | `/admin/handbook` |  |
| `/admin/fees` | `/admin` |  |
| `/admin/account-recovery` | `/admin` |  |
| `/admin/kyc` | `/admin` |  |
| `/admin/compliance` | `/admin/kyc` |  |
| `/admin/listings` | `/admin` |  |
| `/admin/listings/[id]` | `/admin/listings` |  |
| `/admin/money` | `/admin` |  |
| `/admin/operations` | `/admin` |  |
| `/admin/field-speed` | `/admin/operations` |  |
| `/admin/payments` | `/admin` |  |
| `/admin/people` | `/admin` |  |
| `/admin/queue` | `/admin` |  |
| `/admin/reference` | `/admin` |  |
| `/admin/settings` | `/admin` |  |
| `/admin/social` | `/admin` |  |
| `/admin/standing` | `/admin` |  |
| `/admin/stops` | `/admin` |  |
| `/admin/people/[id]` | `/admin/people` |  |
| `/admin/supply` | `/admin` |  |
| `/admin/support` | `/admin` |  |
| `/admin/switches` | `/admin` |  |

### The public site

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/` | ROOT (no drawn control; Android closes the app) |  |
| `/about` | `/` |  |
| `/areas/[state]/[area]` | `/` |  |
| `/cancellations` | `/` |  |
| `/careers` | `/` |  |
| `/contact` | `/` |  |
| `/delete-account` | `/` |  |
| `/docs` | `/` |  |
| `/docs/[slug]` | `/docs` |  |
| `/eula` | `/` |  |
| `/help` | `/` |  |
| `/r` | `/` |  |
| `/r/[code]` | `/r` |  |
| `/privacy` | `/` |  |
| `/disclaimer` | `/` |  |
| `/safety` | `/` |  |
| `/check` | `/` |  |
| `/standards` | `/` |  |
| `/styleguide` | `/` |  |
| `/terms` | `/` |  |

### Doors and redirects

| Route | Back, opened cold or after an unsafe screen | Never returned to as history |
| --- | --- | --- |
| `/start` | `/` | yes, a door |
| `/sign-in` | `/welcome` | yes, a door |
| `/sign-in/email` | `/sign-in` | yes, a door |
| `/sign-up` | `/welcome` | yes, a door |
| `/sign-up/email` | `/sign-up` | yes, a door |
| `/sign-up/verify` | `/sign-up/email` | yes, a door |
| `/sign-up/finish` | ROOT (no drawn control; Android closes the app) |  |
| `/forgot-password` | `/sign-in` | yes, a door |
| `/forgot-password/code` | `/forgot-password` | yes, a door |
| `/reset-password` | `/sign-in` | yes, a door |
| `/auth/callback` | `/sign-in` | yes, a door |
| `/s/[token]` | `/` | yes, a door |
| `/welcome` | ROOT (no drawn control; Android closes the app) | yes, a door |
| `/home-or-landing` | ROOT (no drawn control; Android closes the app) | yes, a door |