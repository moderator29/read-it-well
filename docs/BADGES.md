# Badges: earned standing for agents and members

Thinking document, not a build order. Nothing here is implemented.

Owner brief, 2026-07-30: badges for agents and for ordinary members, earned by
accomplishment, different marks for each side, grantable by an admin even when
not earned, with the admin console as the centre of it.

---

## 1. The principle

A badge is a **claim the platform makes on someone's behalf**. If it can be
farmed, it is worth nothing and it actively misleads a guest deciding whether
to trust a stranger with rent money. So every badge here is earned from
**events we already record**, not from self-declared activity.

Two ladders, different shapes, because the two sides are trusted for different
things.

- **Agents** are trusted with property, money and someone's arrival at a gate.
  Their ladder is **trust and reliability**.
- **Members** are trusted with honesty and good conduct. Their ladder is
  **usefulness and good citizenship**.

Vanity metrics are deliberately absent from both. There is no badge for
posting a lot.

---

## 2. The agent ladder

Every criterion below is computable from tables that already exist.

| Badge | Object | Earned when |
|---|---|---|
| Verified Agent | `shield-check` | Identity and payout account verified, application APPROVED |
| First Listing Live | `keys-home` | First listing reaches PUBLISHED |
| Fast Responder | `clock-check` | Median first reply under one hour across 20 conversations |
| Ten Stays Hosted | `calendar-check` | Ten bookings reach CONFIRMED and complete |
| Inspection Champion | `home-check` | Ten inspection confirmations recorded in chat |
| Five Star Streak | `reviews` | Ten consecutive five star reviews |
| Estate Specialist | `map-spot` | Five or more PUBLISHED listings in one area |
| Photo Pro | `camera` | Ten listings pass the quality gate with no rejections |
| RentMe Elite | `house-sparkle` | All of the above, and no open trust flag for ninety days |

Elite is deliberately hard and deliberately **revocable**: an open flag
suspends it. A top badge that survives bad behaviour is worse than no badge.

**The agent mark in social.** Beside an agent's name on a post, a compact chip:
the `shield-check` object plus the word Agent in brand blue. It is not one of
the earned badges, it is a role marker, and it must read differently from a
member badge so nobody confuses "is an agent" with "is good at it".

---

## 3. The member ladder

| Badge | Object | Earned when |
|---|---|---|
| Verified Member | `user-verified` | Email and phone confirmed |
| First Stay | `luggage-check` | First completed booking |
| Neighbour | `home-search` | Joined a hub and earned five Helpful |
| Local Guide | `map-route` | Twenty five Helpful on Ask posts within one hub |
| Honest Reviewer | `reviews` | Five reviews written after real completed stays |
| Connector | `chat-duo` | Ten accepted link ups |
| Guardian | `shield-home` | Three reports upheld by a moderator |
| Year One | `gift-star` | One year since joining |

Local Guide is the one to watch. It is scoped to a **single hub**, so it says
"this person knows Yaba", which is a far more useful claim than a global
score, and it is much harder to farm.

---

## 4. Visual language

No new artwork is needed for a first version. Every object above already
exists in the commissioned pack of 57, so badges inherit the platform's
material language for free.

- **Agents** render on a **deep neon plinth**: the object over the electric
  blue glow, reading as authority.
- **Members** render on a **paper plinth**: the object over a light neutral
  tile, reading as warmth rather than rank.

That single split lets someone tell the two ladders apart at a glance without
reading a word, and it works in both themes.

Sizes follow the icon convention: 20 to 24px inline beside a name, 40 to 48px
in a profile row, 64px and up in the earned moment.

**The earned moment matters.** A badge that appears silently is a badge nobody
values. Earning one deserves a designed reveal, a notification row and a
shareable card. That is the cheapest retention mechanic in the whole document.

---

## 5. Data model sketch

| Table | Shape |
|---|---|
| `badges` | code (pk), name, description, audience (agent, member), object_name, tier, criteria jsonb, manual_only boolean |
| `user_badges` | user_id, badge_code, granted_at, granted_by (nullable), reason, evidence jsonb, revoked_at |

`evidence` records **why** it was granted: the booking count at the time, the
conversation sample, the hub. That is what makes a badge auditable rather than
a rumour, and it is what lets us revoke one honestly.

Awarding runs as a scheduled job over the existing tables, which is another
thing waiting on `pg_cron`. Manual grants go through the admin console and
write an `audit_log` row like every other privileged action, with the actor,
the target, the badge and the reason. A granted badge and an earned badge are
distinguishable in the data, and I would not hide that distinction in the UI
either.

---

## 6. The admin console as the centre

This is the piece that makes badges a system rather than a gimmick:

- Grant and revoke, with a mandatory reason, fully audited.
- A queue of who is one step from the next badge, which doubles as a supply
  quality report.
- Badge definitions editable without a deploy, so criteria can be tuned.
- Bulk grant for a launch cohort or an apology.
- Revocation review whenever a trust flag lands on a badge holder.

---

## 7. Honest risks

- **Gaming.** Helpful can be traded between friends. Mitigation: Helpful only
  counts from accounts with a completed stay or a verified phone, and only one
  Helpful per pair per week counts towards a badge.
- **Badge inflation.** Nine agent badges is already near the ceiling. Adding
  more cheapens all of them.
- **Perceived unfairness.** If admins hand out what others earn, the ladder
  dies. Manual grants should stay rare, be visibly distinct, and be audited.
- **It is not a substitute for verification.** A badge is a summary of
  behaviour. The identity and payout checks remain the actual gate.
