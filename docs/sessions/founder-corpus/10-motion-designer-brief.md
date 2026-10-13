# The motion designer's brief, and the Get Started page

Source: the founder's message of 6 October 2026, carrying his motion designer's
own prompt.

This file is the founder's own words. It is not a summary and it has not been
edited for content. The only change made to it is mechanical: the em dash is
forbidden everywhere under `docs/` by `apps/web/scripts/check-no-em-dash.mjs`,
so every em dash has been replaced with a hyphen. Nothing was cut, softened,
reordered or paraphrased.

---

I sent it all to GitHub few mins ago and also help design a deep reference get started page but ours would be full of animations and movements and pull and vibes I got a prompt from my motion designer video session that designed our platform video stuffs and this is the prompt he sent to me pull anything and everything this sessions or any session doing grounded and animations and motions works to use to make our animations and motions in platform feels alive especially in get started/onboarding page pro areas wallets landing page too especially and many many many areas in the platform many animations many cinematic that would make this platform feels alive and also I made all icons have origins because our identity is already adapting and collecting 3d and our 3d icons  orange okay and also this onboarding should be a strong one to go around premiums and clean it’s a refs not thst you build it exactly ours would have more cool stuffs and Animations and motions I want my app and platform to cinematic also the page that shows our logo for ever when click app look image 3 you know the corection to turn to animations not the logo it would be a motions animations designs like how platform and it should be 1.5 secs current can stay for about 8 secs before it shows the get started and when sign in the passcode page so it so fucking bad rn make it premium, yoh feel me ? And now write the final handsoff and prompt and then all new session can start working this is the motions and animations prompt that session gave me “We're building premium in-app animations and motion design for Vallo (Nigeria's real estate + stays platform). The existing marketing engine uses a proven stack - pull from it directly.
Motion stack already in the repo:

* GSAP + `CustomEase` - five named curves: `land` (snap in), `leave` (ease out), `glide` (smooth float), `whip` (fast flick), `drift` (slow settle)
* 3D phone/card components via Three.js - island-style device renders, night rim lighting, env maps
* Card reveal system - cards enter with overhang offset, staggered children, 50-90 px vertical float on entry
* Scene transitions - `data-off` attribute pattern, `hidePill`, caption gap timing
* Seeded random for organic variation (no jarring repeats)
* All timings are deterministic - no `Math.random()` raw calls

Motion principles (match these):

* Every element has intent - nothing moves without a reason
* Entrances are fast (whip/land), exits are slower (leave/drift)
* Stagger children max 60 ms apart - feels like one organism, not a list
* Depth: background layers move at 0.6× foreground speed (parallax)
* Payoff moments (confirm, verify, unlock) get a single sharp impact + subtle scale pop (1.0 → 1.04 → 1.0, 180 ms)

Pages and areas to focus on:

* Onboarding / start screens - hero entrance, CTA pulse, logo reveal
* Pro / premium areas - gated content lift, feature unlock moment
* Cards (property, stay, restaurant) - scroll-driven reveal, tap feedback, favourite toggle
* Bottom sheet / modals - spring entry from below, backdrop blur fade
* Search → results transition - morphing filter pill, list stagger

Goal: animations that feel like a very premium Nigerian-built product - not over-designed, not flat. Think: Airbnb meets Revolut, built for Lagos.
The GSAP + CustomEase setup and the easing curve definitions are in `scripts/marketing/video/engine/` - reference them rather than rebuilding.
”
