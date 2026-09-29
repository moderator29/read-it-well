# Responsive sweep, 29 September 2026

Lane: layout and sizing on phones (320 to 430), tablets (768 to 1180, portrait and landscape) and desktop (1280 to 1920), and mobile sign-in and sign-up. Motion (lane A) and loading and skeletons (lane B) are out of scope. Colours and card styling belong to the clean unified direction builders (`docs/design/CLEAN_UNIFIED_DIRECTION.md`); this lane keeps layout, sizing and spacing in step with it.

## How it was measured

A Playwright sweep ran against the shared dev server, signed out and signed in as the QA member. It passed the passcode lock the way a member would. Widths: 360x740, 390x844, 430x932, 768x1024, 1024x1366, 1180x820 and 1440x900. Phones and tablets ran with touch and mobile viewport emulation. Dark and light were both captured. On every capture it measured:

- **Horizontal overflow.** A visible box crossing the viewport edge with no clipping or scrolling ancestor. `scrollWidth` alone cannot fail here, because the root is `overflow-x: clip` (see `tests/_overflow.mjs`).
- **Tap targets under 44 by 44.** A pseudo-element hit area counts. Inline links in running text are exempt.
- **Inputs under 16px.** iOS zooms the page when one of these is focused.
- **Clipped text.** Hidden overflow with no ellipsis.
- **Broken words.** A single word rendered across two lines, which `overflow-wrap: anywhere` hides from every overflow check.
- **Covered controls.** Interactive elements under fixed or sticky chrome at the scroll end.

The keyboard was simulated two ways. The first shrinks the layout viewport (older Android). The second stubs `window.visualViewport` (iOS, and Android's default "resizes visual").

Screenshots and JSON reports are in the session scratchpad under `responsive/before`, `responsive/mobile` and `responsive/probe`.

## Findings, by priority

### P1 (fixed)

| # | Where | Width | What | Fix |
|---|---|---|---|---|
| 1 | Sign up | phone | With the keyboard up, the focused field (Confirm password at 566 to 618 in a 508px viewport) sat under the pinned Next bar. On iOS the bar was behind the keys. | `KeepPillInView` publishes the keyboard height as `--nf-kb`, and the sticky bar uses it as its `bottom`, so it rides on the keys. The focused field is scrolled clear of the bar, and the safe-area padding is dropped while typing. Verified: bar bottom = keyboard top (508), field at 362 to 414. |
| 2 | Sign in, sign up | phone | The return key said nothing useful, and Enter in the email field would submit sign-in with an empty password. | `enterKeyHint` is set to next or go. Enter on a "next" field moves to the next empty field. Verified: Enter on email focuses the password, with no refusal and no navigation. |
| 3 | Auth fields | phone | Email and code fields could autocapitalise or autocorrect ("Ada@..."). | Derived in `Field`: email, code and off fields get `autocapitalize=none`, `autocorrect=off`, `spellcheck=false` and `inputmode=email`. Name fields capitalise words. The password field stays literal even when shown. |
| 4 | Listing detail | 768 (and any slow hydration) | The pinned price bar rendered a page down (top 4168 in a 1024 viewport). The splash flag stayed `on` when hydration missed its last `animationend`, and the filled `#main` animation then trapped every `position: fixed` child. | `ThresholdStage` reads the splash state on mount and in the give-up timer, not only from the event. Verified: top 948, `#main` transform `none`. |
| 5 | Notifications (and every inline `PageHeader` with a text action) | 360 | The title broke mid-word ("Notificatio / ns"). | The header row wraps. The title keeps an 11rem basis, and the actions take their own end-aligned line only when needed. |
| 6 | Price Check period | 360 | "Three months" truncated to "Three ...". | Full-width `Segmented` labels wrap to two balanced lines inside the 44px item. |

| 7 | /search result list | 360, 390, 430 | At the end of the list, "Show 24 more" stopped under the floating map/list pill. | While the pill is on the page, the docked shell also reserves the pill's height (`list-views.css`). Verified: button 603 to 654, pill 698 to 746 at 390. |
| 8 | Account settings rows | 360 | "What you are looking for" squeezed its note to six lines beside "Nothing in particular", and the chevron wrapped alone to the row's foot. | A row with a note has a 9.5rem label floor, so a long value and its chevron wrap together. Short values ("On", "5 devices") stay inline. |
| 9 | Sign in, short screens | 320x568, phones in landscape | The Sign in pill started below the fold before anything was typed. | Under 640px of height the block is 10rem. Verified: pill at 473 to 525 of 568. |

### P2 (fixed)

| # | Where | Width | What | Fix |
|---|---|---|---|---|
| 7 | Dock | 640 to 1023 | Edge to edge (about 750px at 768), five tabs spread thin: a stretched phone. | Capped at 34rem and centred with offsets, so the auto-hide transform is untouched. The design is unchanged. |
| 8 | Landing category tiles | 1024+ | "Apartments" and "Commercial" clipped to "Apartm..." beside the glyph. | The glyph stacks above the name in the four-column grid. |
| 9 | Landing AI showcase pips | tablets | Targets were 24 wide. | 44 by 44. |
| 10 | Agent rail "Apply to list" | 1180 | Target was 32x30. | Uses the shared `nf-tap` hit area. |
| 11 | Auth, tall tablets in portrait | 768x1024, 1024x1366 | The column was top-aligned, leaving the lower third empty. | The column is centred under the block, a little above the middle. |
| 12 | Auth small print | all | "Privacy / Policy" broke across lines. | Link names never wrap internally. |
| 13 | Host tab rail | 360 to 430 | The rail ran 4px past both screen edges (measured -4 to 364). Its bleed was a fixed 20px against gutter-token padding. | The bleed is overridable (`--nf-chiprow-bleed`), and HostNav sets it to the gutter. Verified: rail 0 to 360, first tab at 16. |
| 14 | Admin security-key step | 360 to 430 | The card ran flush to both edges. | Wrapped in the page gutter with the safe-area top. Verified: 16 to 344. |
| 15 | "Report this listing / place" | phones | Target was 20px tall. | `nf-tap`. |
| 16 | "Your saved places" (/saved/searches) | phones | Target was 26px tall. | `nf-tap`. |
| 17 | Landing card-stack dots | tablets | Targets were 24 wide. | 44 by 44. The row still fits between its arrows. |

### P2 (in the tree, committed by Builder 1 with `tokens.css`)

| # | Where | What |
|---|---|---|
| 18 | Page gutter (`--nf-pad-shell`) | Was 24 to 40. Now 16 at 360, about 24 at 768 and 32 from 1280, continuous, per spec section 1.4 and the brief. |

### Checked and left as is

- **Rail on iPad landscape (1180x820).** The nav list is taller than the room (664 of 584) and scrolls inside the rail. Nothing is lost.
- **Feed chip on /around.** It is 33px drawn and 44px with its `::after`. The flag was a rounding artefact.
- **Post author names on /around.** These are clipped single-line names beside the avatar, which links to the same profile at 44px.
- **Map attribution links on /price.** These are standard attribution text.
- **Desktop rail rows (1440).** Rows are 40px for a fine pointer and reach 44px on touch.
- **The dev "N" badge and the "Compiling" chip** in screenshots are Next dev chrome.

## Per breakpoint

- **Phone (360 to 430).** 18 public and auth routes and 49 signed-in routes were checked at 360, 390 and 430: 201 captures, plus 8 admin routes. Public and auth returned zero flags. Every signed-in flag is either fixed above or listed as checked or open below. Keyboard behaviour was verified at 320x568, 360x740 and 390x844.
- **Tablet portrait (768).** Search and saved lists use two columns. The dock is now phone-proportioned and centred. The listing's pinned bar is now pinned (item 4).
- **Tablet landscape (1024 to 1180).** The side rail takes over from 1024. Home, messages and settings have content at a reading width beside the rail.
- **Desktop (1440).** The founder-approved auth screens are unchanged. Content is capped by `--nf-content-max` (1440) or `--nf-content-read` (1120).

## Open items

- **Large page header (builder's `PageHeader variant="large"`, uncommitted).** It breaks "Notifications" mid-word at 360 and 390, the same defect as item 5. The fix (a wrapping row with an 11rem title basis) has been sent to the lead for the builder.
- **Listing location link.** The link under the listing title is 26px tall. `listing/[id]/page.tsx` is in another engineer's in-flight edit; the fix is `nf-tap` on that link.
- **Admin console interior.** It is behind a hardware security key, which a headless browser cannot pass and which was not bypassed. Only the step-up screen was measured. The admin preview harness is the way to check the desks.

- **Messages on iPad landscape and desktop** is a centred single column. A list-and-thread split (spec section 8.3 names the panes) would suit 1024+. That is a feature, not a sizing fix.
- **Android `interactive-widget`.** It is not set. The auth screens now handle both keyboard models themselves. Setting `resizes-content` globally would change how every fixed bar behaves on Android, so it needs its own pass.
- **Motion lane.** The splash entrance fills `#main` with a transform while it plays (about 1.9s on first load). During that time any `position: fixed` child is laid out against `#main`. After item 4 this is transient only. A `fill-mode` of `backwards` on `nf-threshold-forward` would remove it entirely.
