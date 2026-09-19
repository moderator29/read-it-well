# V3's proofs: messaging, inspections, notifications, the assistant

Surfaces: `/messages`, `/messages/[id]` (both faces), `/messages/share/[kind]/[id]`,
`/inspections`, `/notifications`, `/assistant`.

Every shot here was taken from a PRODUCTION server, per section 13.3:

    flock <lock> -c 'cd apps/web && NEXT_DIST_DIR=.next-v3 npx next build'
    cd apps/web && VALLO_PREVIEW_HARNESS=1 NEXT_DIST_DIR=.next-v3 npx next start -p 3163
    node scripts/verify-shots.mjs --base http://localhost:3163 <routes>
    node scripts/verify-shots.mjs --light --base http://localhost:3163 <routes>

The harness door is the lead's `previewHarnessIsOpen` in
`apps/web/src/lib/preview-harness.ts`, which refuses on Vercel whatever the
variable says. Before it existed the harness 404ed on the only server whose
pictures the ledger accepts, and the first shot taken here came back as the
"This page has checked out" screen; that is what the door closed.

`verify-shots.mjs` wrote every one of these files, so its theme, stylesheet and
stuck-Reveal hydration guards passed on every route. No route was skipped.

## Governing images

| Surface | Governing image |
| --- | --- |
| `/messages/[id]`, stay face | `GOVERNING-chat-booking-card.png`, `founder/GOVERNING-thread-hotel-booking.jpg` |
| `/messages/[id]`, property face | `founder/GOVERNING-thread-rental-enquiry.jpg` |
| `/assistant` | `BF49B814-5C2F-4761-A48C-89A12C040ED1.png` |
| `/messages`, `/messages/share`, `/inspections`, `/notifications` | none; register inherited, colour and glow from `GOVERNING-landing-desktop-hero.png` |

## The capsule sweep

A shape ruling is about the ratio, so the surfaces were measured rather than
grepped: every element on every route was read for its box and its computed
radius, and anything where twice the radius reaches the shorter side was
listed. Rule ten passes clean on all of these, because every one of them reads
correctly in the source.

After the fixes the only elements on these seven routes whose corners meet in
the middle are avatars, plus the two unread COUNT badges that section 13 exempts
by name (`.nf-inbox-row__count`, `.nf-notif__count`). There is no capsule on a
text-bearing control and no round icon button anywhere in messaging.
