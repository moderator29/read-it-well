# Recommendations

The living backlog required by Master Rule 21. Each entry states the problem, why
it matters, the approach, and the phase it belongs to. Recommendations are not
approved scope.

Last updated: 2026-07-28

---

## Critical before MVP

### R-01. Decide the admin navigation
**Problem.** Four incompatible admin rails across four source-of-truth
references. **Why it matters.** Navigation determines routing, layout shells,
permission boundaries and the entire admin section list. Building against the
wrong one is the most expensive single mistake available right now.
**Approach.** Owner picks one. Reference 04's rail is the only one that looks
purpose built; the others carry consumer leftovers such as Saved Items and
Upgrade to Pro inside a Super Admin rail. **Phase.** Before Phase 3.

### R-02. NDPA 2023 compliance
**Problem.** Nigeria's Data Protection Act is not mentioned in any specification.
**Why it matters.** A Nigeria-first platform processing personal data at scale
has statutory obligations including data controller registration and a
designated protection officer. Registration has lead time measured in weeks.
**Approach.** Legal review now, in parallel with build. **Phase.** Start
immediately, must complete before public launch.

### R-03. Define the commercial model
**Problem.** No commission or take rate exists. Reference 09 shows a guest-paid
service fee but no recipient, and reference 08 offers "zero service fees" to Pro
members. **Why it matters.** Build §16 requires recording gross, platform fee,
agent share, processor charges and net settlement. None of that is computable.
**Approach.** Owner sets the rate and decides whether the service fee is
platform revenue. **Phase.** Before Phase 4.

### R-04. Money as integer minor units, everywhere
**Status.** Already implemented in `packages/i18n` and the listing types.
**Why it keeps its entry.** It must be enforced across the API and database when
those land. A single float column reintroduces the defect.

### R-05. KYC standard for agent payouts
**Problem.** The agent application collects bank and payout details at step 5
with no identity verification standard. **Why it matters.** Paying out to
unverified identities is how marketplaces become money laundering vectors.
**Approach.** BVN or NIN verification during agent onboarding. **Phase.** Before
the first payout.

### R-06. Test suite
**Problem.** No specs exist. **Why it matters.** Master Rule 71 requires tests,
and Master Rule 72 requires end to end coverage of signup, login, listing
approval, booking, payment and agent mode. **Approach.** Start with the auth
flow, since it is the first real business logic. **Phase.** With Phase 1.

---

## Important before launch

### R-07. Content Security Policy
Nonce based, compatible with Next streaming. Other security headers are already
set at the edge.

### R-08. Native review of Yoruba, Hausa and Igbo
Current translations are functional but were not written by native speakers.
Marketing copy especially should be rewritten rather than translated.

### R-09. Accept-Language negotiation
A first time visitor with a Yoruba browser currently gets English.

### R-10. Light theme design pass
Tokens are scaffolded so components stay token driven, but no reference is light
and the theme has had no design review.

### R-11. Device tier degradation ladder
Glass and blur are expensive on low end Android. `.nf-glass` already falls back
to a solid surface without `backdrop-filter`, but a real tier system that also
drops the aurora and the isometric scene detail is needed. Master Rule 52.

### R-12. Add a Request Changes action to admin listing review
The designed screen offers only Approve and Reject. Build §8 mandates
`CHANGES_REQUESTED`, and rejecting a listing over one bad photo is a poor agent
experience that Design §15 explicitly warns against.

### R-13. Replace placeholder listing imagery
Cards currently draw a gradient skyline. Real photography arrives with the media
pipeline and Cloudinary.

---

## Post launch

### R-14. Saved searches with alerts
Already designed in reference 09, including price bands and email toggles, and
listed as a future idea in both specifications. Build the event foundations
early so it is cheap later.

### R-15. Boost and Feature listing
Paid promotion products visible in reference 09 with no specification behind
them. Real revenue potential, needs a product definition.

### R-16. Video, virtual tours and floor plans
The icon set and reference 09's media manager both anticipate them. Out of the
10 photo MVP cap.

### R-17. Airport pickup and car rentals
Consumer entry points in reference 08. The icon family already carries Car
Rental, Taxi, Bus, Train, Flights and Airport, so the expansion path is
anticipated in the assets.

---

## Experimental

### R-18. Multi-currency
The icon pack ships Naira, Dollar, Euro, Pound, Yen and **Cedi**. Cedi is
Ghanaian, which suggests West African expansion was in mind when the assets were
made. `formatMoney` already takes a currency argument, so the formatting layer
is ready.

### R-19. Vector sources for the icon pack
If genuine vector or high resolution sources exist for the 192 icon set, they
would beat hand authoring the remaining glyphs. The `Icon3D` API is designed so
this swap touches no call site.

### R-20. Demand heatmap
Capture search events from the first query so the business can see where users
look before inventory exists there.
