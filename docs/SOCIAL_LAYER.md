# House Hub: the social layer

Thinking document, not a build order. Nothing here is implemented. It exists
so the shape can be argued with before a line of it is written.

**Superseded in part by `docs/SOCIAL_TODO.md`**, which is the build order: the
same place-rooted idea, taken further into Nigerian culture, with the visual
system, the full data model and the sequenced checklist. Where the two disagree,
SOCIAL_TODO wins. This file is kept for the reasoning behind the shape.

Owner brief, 2026-07-30: a social layer where people post, meet neighbours,
find friends, reach people nearby and message each other. Agents may post
house previews and carry an agent mark beside their name. Our AI answers in
comments when summoned. Original, not a clone of X or Facebook. A feature,
never the centre of the platform.

---

## 1. The one idea that makes it ours

X and Facebook are **people-first**: you follow accounts, and place is
incidental. Every clone inherits that and then competes on network effects it
cannot win.

RentMe already owns something none of them have: **place**. Cities, areas,
estates, campuses, and a verified supply of homes inside them. So the social
layer should be **place-rooted**, not people-rooted.

> You do not follow strangers. You enter a place, and the place has a
> conversation running inside it.

That single inversion gives us a product that is structurally different, is
useful from day one with zero followers, and is impossible for a general
social network to copy without our inventory.

A hub is a place: Lekki Phase 1, Yaba, UNILAG, Gwarinpa. You are in the hubs
you live in, stayed in, or care about. The feed is "today in this place",
not "everyone you have ever followed".

---

## 2. Post kinds, and why each one earns its place

Five kinds. Each solves a real Nigerian need rather than being a format for
its own sake.

**Ask.** A question about a place. "Is there light in Ogudu today?" "Any
trusted plumber around Ojota?" "How is Third Mainland this morning?"

This is the wedge. Power, water, traffic and security are the four questions
that govern daily life here, and no platform answers them structurally. An
Ask post is useful within minutes of posting and useful again to the next
person who searches it. It is also the cheapest possible reason to open the
app on a day you are not booking anything.

**Vibe.** An ordinary post: text and photos, rooted in a hub. The social
baseline.

**Link up.** Explicitly for meeting people: a football viewing, a gym partner,
a jollof spot on Saturday. **It expires**, in 24 to 72 hours, chosen by the
poster. Expiry is the design: a plan that has passed is noise, and a feed
that cleans itself never rots. This is also the safest possible framing for
meeting strangers, because the post is public, place-bound and time-bound.

**Showcase.** Agents only. A house preview that renders a **real listing
card** inline, and the post is only permitted when it references a listing
that is genuinely PUBLISHED. No fake inventory can enter the social surface,
by construction. This is the agent's shop window and our supply flywheel.

**Moment.** Post-stay, offered after a completed booking: "just checked out
of this place in Ikoyi". Ties the social graph to the booking graph, which is
the one thing a general social network can never replicate.

---

## 3. Engagement primitives, deliberately not likes and retweets

A single primary reaction, with a brand gesture rather than a thumb: a **pulse
that lights** on tap, echoing the glow language. Long press opens a small set:

- **Vibe**: the general positive signal.
- **Helpful**: the important one. On an Ask post this is the currency, and
  it is what feeds reputation. Usefulness is scored, not volume.
- **Been there**: place-specific social proof, only on posts bound to a
  location. Cheap to give, genuinely informative.
- **Save**: reuses the existing saved concept.

**Replies**, not comments, and the count shows live participants rather than a
raw number, because "6 people talking" is a stronger invitation than "6".

**Seen by N nearby** rather than a raw view count. Place-rooted, more
meaningful, and it quietly discourages the vanity metric race.

Three structural refusals, each deliberate:

1. **No infinite scroll.** The feed is a session: "Today in Lekki Phase 1"
   with a real end and a marker. Data is bought in bundles here, and a feed
   that ends respects that. It also protects the booking product from being
   cannibalised by a slot machine.
2. **No public follower counts.** Clout-chasing invites exactly the fake
   accounts and rental scams we exist to prevent. Standing is earned through
   Helpful and badges, not audience size.
3. **No stranger DMs by default.** Contact is a request the other person
   accepts. This matters most for women, and adoption depends on it.

---

## 4. @rentmebot: the AI in the comments

Summoned by name in a post or reply. It answers in thread, visibly a bot,
never impersonating a person.

**What makes ours different from a general chat bot in comments: it can hand
back real inventory.** An answer can carry listing cards, a map pin, or a
Message the agent action. It is a discovery engine sitting inside a
conversation, not a novelty.

Worked examples:

- "@rentmebot 2 bedroom under 500k near here" returns three real listings in
  that hub's area, each tappable.
- "@rentmebot what does rent run in Yaba" answers from our own catalogue
  aggregates and says how many listings that figure is based on.
- "@rentmebot is this place verified" answers from the listing row, and
  explains that the verified badge is first-party inventory only.

**Guardrails, non-negotiable:**

- It reads **public post context only**. Never private messages, never another
  user's bookings, wallet or profile. It has no service role, ever.
- One reply per summon. It does not follow up unless summoned again.
- Rate limited per user and per thread, on the durable limiter already built.
- It never arbitrates a dispute, never promises a refund, never quotes a price
  it cannot source from a real listing. Money, safety and fraud go to support.
- It does not take abuse bait, and it does not reply to a post the scanner has
  flagged.
- A hard monthly cost ceiling and a kill switch on the existing feature flags
  table, because an open summon surface is an open spending surface.

Tone: warm, brief, Nigerian. Pidgin as an opt-in register, per inbox item 19,
never as a default assumption about who is asking.

---

## 5. Safety, which is the real cost of a social layer

This platform moves money. A social surface is an unbounded moderation
liability unless it is designed defensively from the first commit.

- **The fraud scanner extends to posts and replies.** The same trigger pattern
  that flags account numbers and payment talk in messages runs on social
  content, into the same admin queue. Off-platform payment steering is the
  scam, wherever it is typed.
- **Block is bidirectional invisibility.** Mute is one-way silence. Report is
  structured by category into the existing reports table.
- **Showcase posts must reference a PUBLISHED listing**, so social can never
  become a channel for unvetted inventory.
- **Rate limits** on posts per day, replies per minute, hub joins and bot
  summons, on the limiter already built.
- **Link up posts carry the safety line**: meet in public, tell someone where
  you are going. Cheap to add, and it is the difference between a feature and
  a headline.
- **NDPA**: user content needs a retention position, an export path and a
  takedown process before launch, not after.

Honest risk: moderation is a staffing question, not only a software one. A
hub with no one watching it becomes the platform's reputation. I would not
open this to every city at once.

---

## 6. Data model sketch

New tables, every one RLS from creation, following the house pattern.

| Table | Shape |
|---|---|
| `hubs` | id, kind (area, city, campus, interest), name, state_code, city, area, member_count |
| `hub_members` | hub_id, user_id, role, joined_at |
| `posts` | id, hub_id, author_id, kind, body, listing_id (nullable, showcase only), expires_at (nullable, link up), created_at |
| `post_media` | post_id, storage_path, width, height |
| `post_replies` | id, post_id, author_id, parent_id, body |
| `reactions` | target_type, target_id, user_id, kind, unique per user per target per kind |
| `post_views` | aggregated per post, with a nearby count |
| `blocks` / `mutes` | user_id, other_id |
| `bot_invocations` | id, target, user_id, prompt, answer, cost, for abuse and cost control |

`reports` already exists and gains new target types. `notifications` already
exists and gains social kinds. The storage bucket pattern and the message
scanner both extend rather than being rebuilt.

---

## 7. Sequencing, and my actual recommendation

The instinct is to build a feed. I would not.

**Ship the wedge first: Hubs plus Ask plus Helpful.** That is a useful product
on its own, it is defensible, it fits Nigeria exactly, and its moderation
surface is small enough to watch. If Ask works, the rest earns its way in.

1. **S0** Hubs, membership, Ask and Vibe posts, reactions, report, block,
   mute, scanner extension. One city.
2. **S1** Replies, Link up with expiry, Showcase bound to real listings.
3. **S2** @rentmebot, behind a flag, rate limited and cost capped.
4. **S3** Profiles and badges (see `docs/BADGES.md`).
5. **S4** Nearby discovery and presence.

A feature, not the centre: the entry point belongs in the app, but the default
tab stays discovery. The day the social layer out-competes booking for
attention is the day it starts costing us money.
