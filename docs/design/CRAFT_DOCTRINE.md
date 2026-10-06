# The craft doctrine

**Written by Session 1, 6 October 2026**, from the premium-branding principles the
founder supplied. They were written about video. **Translated to a product they get
sharper, not softer**, because a product is used a thousand times where a video is
watched once.

**This governs taste where the other documents govern specification.** When a session
has a choice the specs do not settle, this decides it.

---

## 1. Intention is everything

> Nothing is done by accident. Every choice needs a purpose: the font, the background,
> the colour, the motion.

**In the product:** a session must be able to say why, for every decision it makes. Why
that radius, why that duration, why that order, why that word. "It looked better" is an
answer. "I copied it" is not.

**The strongest brands are not selling a product, they are giving people a way to
identify through their choices.** Vallo's version of that is specific and worth naming:
a Nigerian renter who uses Vallo is choosing **not to be taken for a ride**. The product
must make that person feel clever and protected rather than merely served. Every screen
either supports that feeling or works against it.

---

## 2. Rules, deliberately kept

> Give yourself real rules and guidelines. To the audience it feels like you decided it
> should be that way.

This is the whole argument for the specification set, and it is why the constraints are
tight rather than loose:

| Rule | Where |
|---|---|
| One blue family, emerald, rose, cyan, one warm spark | North star 3 |
| Four container tiers, one edge treatment each | North star 4 |
| Eight button roles, rectangles by default | North star 5A |
| Eight durations, five eases, named | `MOTION_SYSTEM.md` |
| Two asset tiers | D29 |
| Poppins display, Inter text, three weights maximum | North star 5 |
| One vocabulary, enforced by a test | `PRODUCT.md` section 7 |

**A session that invents a ninth button role or a fifth container has not been
creative. It has broken the thing that makes the product feel decided.**

---

## 3. The negative discipline: not doing what makes it feel cheap

> A huge part of feeling premium is not doing the things that make a brand feel less
> premium. This is where many people fail: too many effects, unnecessary sounds.

**This is the most useful principle in the document, because it is actionable by
subtraction, and subtraction is free.**

The standing list, already enforced: no gloss on symbols, no coins or gems, no streaks
on habits, no countdowns that are not real deadlines, no confetti on a purchase, no
mascots, no badge walls, no neumorphism, no four-hue charts, no fake urgency, no
invented proof, no spinner, no "Something went wrong", no banner on every screen, no
locked control shown as an advertisement.

**Add to it, every session.** The question at the end of every surface:

> **What is on this screen that makes it feel less expensive than it is?**

Then remove that thing. **An element earns its place or it goes.**

---

## 4. One shot, one idea

> One shot equals one idea. Every scene has space to breathe. Key objects are centred.
> The background never interrupts.

**Translated to screens**, this is directive D25 arriving from a different direction:

- **One screen, one job.** The second job becomes an inner page. An overview that
  answers four questions answers none of them well.
- **Space to breathe.** Crowding is the clearest signal of a cheap product and it costs
  nothing to fix. When a screen feels wrong and nobody can say why, it is almost always
  spacing.
- **The subject is the subject.** On a money screen the figure. On a detail page the
  space. On a passcode screen the dots. Everything else is quieter by a visible margin.
- **The background never competes.** The aurora is damped, the glow budget is one
  primary per view, and a texture that draws the eye from the subject is removed.

---

## 5. Animation, three techniques

> Smoothness: ease and overlap your keyframes; linear motion looks cheap.
> Dynamic transitions: avoid direct cuts between scenes unless the message needs one.
> Adaptive rhythm: a video should speed up and slow down rather than run flat.

**Smoothness.** Already the rule: five named eases, no linear motion except a progress
bar that genuinely represents linear progress. **Overlap is the part most often missed**
and it is what separates expensive from competent: a child begins before its parent
finishes, 60ms apart, so the screen moves as one organism.

**Dynamic transitions, not cuts.** This is why `nav-origin` matters so much: a route
that grows from the element that was tapped **belongs** where it appears. A cut makes a
person reorient; a transition carries them. **The direct cut is reserved for the few
places it is the message**: a failure, a hard stop, a security interruption.

**Adaptive rhythm, the one genuinely new idea for the product.** Motion should not run
at one speed everywhere:

| Where | Rhythm |
|---|---|
| Startup and Get Started | **Slow.** 1,500ms and 900ms. Room to be impressed |
| Browsing, scrolling, tabs | **Quick.** 160 to 240ms. Never in the way |
| Money and confirmation | **Deliberate.** Slower than feels necessary, because gravity is the point |
| Payoff | **Sharp, then settled.** The pop is 180ms and the settle is unhurried |
| Error | **Immediate.** 160ms. Never a slow reveal of bad news |

**A product where everything animates at 240ms is flat in exactly the way a video at
one pace is flat.**

---

## 6. Sound, which for a product means haptics

> Avoid sound effects that do not feel important. Then listen to everything and ask
> what feels off. If something is too loud or out of place, remove it.

Vallo is used in public, often on mute. **Haptics are its sound design**, and the
repository already has a haptic grammar (B14).

| Weight | When |
|---|---|
| **Light** | A passcode digit, a chip, a toggle, a tab |
| **Medium** | A primary action committing, a sheet landing |
| **Heavy, rare** | A payoff: payment confirmed, escrow released, verification passed, badge earned |
| **Error** | One sharp pattern, and only for a genuine failure |

**The discipline is the same as sound: if a haptic does not help somebody understand
what happened, remove it.** A product that buzzes at everything is the product that
buzzes at nothing. **Nothing in a list, a scroll or a passive state ever vibrates.**

Real sound stays off by default and is never required to understand anything.

---

## 7. Design before build

> Every great video starts with great design. Storyboard each frame before animating.

**Session 3 does not start a flagship surface by writing a component.** It decides what
the screen is for, what the one subject is, what the order is, and what the motion
says, and it writes that down in its response file. **Then it builds.**

The repository already has the equivalent of a storyboard: the preview harness, 216
pages that render a surface without the application around it. Use it.

---

## 8. The test

Every surface, before it is called done:

1. **Can I say why, for every choice on this screen?**
2. **What here makes it feel less expensive than it is?** Remove that.
3. **What is the one subject, and is everything else quieter?**
4. **Does this transition carry the person, or make them reorient?**
5. **Is the rhythm right for what this screen is for?**
6. **Does every haptic earn itself?**
7. **Would a member who used Vallo last week feel they are in the same product, only
   better?** (D28)

**Seven questions. If any answer is weak, the surface is not finished.**
