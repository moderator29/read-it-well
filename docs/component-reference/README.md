# Component reference: the finish the founder is asking for

Eight files sit next to this one. The founder pasted every one of them in on
7 October 2026 as examples of the motion and the finish he wants across Vallo.
There are also five shadcn registry components he named but did not paste.

Nothing in this directory is Vallo code.

## Why these files do not compile

Every sample imports `framer-motion`, `lucide-react`, a `cn` class helper and
a `motion-tokens` module. This repository has none of the four. Vallo's
`apps/web/package.json` carries no motion library at all: every transition in
the product today is hand written CSS. That is a real finding, not a
complaint, and it is the single biggest reason the last experience pass felt
thin. Section 2 of the handoff says what to do about it.

Nothing under `docs/` is typechecked, linted or bundled, so these files are
inert where they sit. Do not move them into `apps/web/src` as they are.

## How to use them

Port the behaviour. Rebuild the surface.

Vallo's own tokens win over anything in these samples: the colours, the radii,
the shadows, the type scale, the easing curves. The founder wrote that next to
several of the samples himself, in these words:

> all this should be upgraded to our style and our vibes okay but still it okay

> But in our color vibes and ideas okay

> This too receipts but make it totally cool and in our way and different but
> same vibes

So the brief is: take the idea, take the timing, take the gesture, then make it
better than the sample and unmistakably Vallo.

## The eight pasted samples

| File | What it does | Where it belongs in Vallo |
| --- | --- | --- |
| `UnfoldAccordion.tsx` | Content unfolds with the chevron and the spacing moving together, not a height jump | True Cost breakdown, listing facts, agreement clauses, support answers |
| `SlidePagination.tsx` | The active indicator slides between pages instead of blinking | Get Started, inner onboarding, listing photos, story rails |
| `DragToConfirm.tsx` | A final action confirmed by a drag rather than a tap | Release money, confirm inspection, withdraw, delete a listing |
| `BookCallButton.tsx` | A button that opens into its own small scheduling surface | Book an inspection, request a call with an agent, schedule a viewing |
| `DynamicIsland.tsx` | A pill that grows into profile, share and metadata states | The top of a listing, an agent's identity, share, live booking state |
| `ParticleDelete.tsx` | A row that disintegrates into particles when removed | Saved items, filters, drafts, uploaded documents, notifications |
| `PaymentStatus.tsx` | Pending, success and failure as one animated money surface | Every payment result screen, deposit, withdrawal, release |
| `PaymentReceiptPrinter.tsx` | A receipt that prints out of the top of the sheet, line by line | Receipts, payouts, referral earnings, statements |

## The five registry components he named

Run these in `apps/web`. shadcn is not initialised in this repository yet, so
`npx shadcn@latest init` comes first, and it has to be configured to write into
Vallo's existing structure rather than inventing a parallel `components/ui`
convention that fights the one already there.

```
npx shadcn@latest add Surajmaurya1/easyui/button
npx shadcn@latest add Surajmaurya1/easyui/batch-gesture-tray
npx shadcn@latest add Surajmaurya1/easyui/ai-response
npx shadcn@latest add Surajmaurya1/easyui/glass-navbar
npx shadcn@latest add Surajmaurya1/easyui/payment-receipt-printer
```

Read whatever these pull in before you wire it. A registry component arrives as
source, and source that arrives from outside the repository is reviewed like any
other contribution: check what it imports, check it carries no network calls, and
bring its colours onto Vallo's tokens before it ships.

### The one instruction attached to a registry component

On `glass-navbar`, the founder was specific, and it is easy to get this backwards:

> this glass nav should be used in many areas but in our style and identity you
> feel me when I click the 3 hamburger it pull I love that it should not be our
> side nav bar but side nav bar in inner areas inner features inner pages or
> other features areas pages etc you know where we used it best same as the rest

Read that twice. The glass navbar is **not** a replacement for Vallo's main side
navigation. It is the pattern for navigation **inside** a feature: the inner
pages of a desk, a workspace, an analytics area, a settings group, a property
command centre. The hamburger pull he likes is the gesture he wants there.

## What is missing from this list, and has to be designed

The founder named these in prose rather than pasting code. They are part of the
same brief:

- The flip card. Still unbuilt and still carrying plain glass. It has to use the
  real 3D icon set, and the flip has to be a flip, with depth and a mid turn
  state. `docs/design/references/GOVERNING-flip-mid-turn.png` is the governing
  frame for it.
- A premium glass card in the shape of a debit card, for money surfaces.
- The startup screen, which today holds the logo far too long.
- The passcode screen a returning member sees instead of a sign in form.
