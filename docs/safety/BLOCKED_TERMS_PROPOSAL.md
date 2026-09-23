# `public.blocked_terms`: a starter list for review

**Status: PROPOSED. Nothing here is in the database.** The table ships empty and
this file does not change that. The founder reviews, cuts and approves, and only
then does anything get inserted.

**Why it cannot stay empty.** `private.objectionable_pattern()` is
`case when count(*) = 0 then null`, and both scanners skip the abuse branch on
null. An empty table is a filter that accepts everything. **Apple guideline 1.2
and Google Play's user generated content policy both require a filter**, so the
platform cannot submit with this table empty. The hourly watch now raises
`content.filter.empty` at critical until it is seeded.

---

## 1. READ THIS BEFORE THE LIST, BECAUSE IT DECIDES HOW LONG THE LIST SHOULD BE

**A match HOLDS a post for human review. It does not delete it, ban anybody, or
tell the author anything true about why.** `private.scan_post()` sets
`status = 'HELD'` with the reason "This may break our content standards.
Somebody is reading it before it goes up", and raises a `risk_alerts` row.

Three consequences that should govern every entry:

1. **A false positive costs a real person their post and costs us a review.** On
   a platform with seven accounts that is invisible. At ten thousand posts a day
   a careless list is a full-time job nobody has.
2. **The Scunthorpe problem is real and the regex makes it worse.**
   `objectionable_pattern()` builds `\m(term1|term2)\M`, and `\m`/`\M` are word
   boundaries, so a substring inside a longer word will NOT match. That is
   correct and it is why the list must hold WORDS, never fragments.
3. **A term list is not moderation.** It catches the careless and the obvious.
   It does not catch a threat phrased politely, and it will hold a Yoruba word
   that happens to collide with an English slur. The human queue is the product;
   this is the net in front of it.

**So: short, unambiguous, and biased towards precision over recall.** It is
cheaper to miss a slur and catch it on report than to hold a hundred legitimate
posts about property in Lagos.

---

## 2. SOURCING, SO THE BASE IS NOT MY OPINION

For the English abuse half, take an established, maintained, openly licensed
list rather than anything hand-written here. The two worth starting from:

- **LDNOOBW "List of Dirty, Naughty, Obscene and Otherwise Bad Words"** (CC0,
  multilingual, used widely as a baseline). Its English file is the standard
  starting point.
- **Google's `profanity-filter` word lists** and the `better-profanity` package
  corpus, both permissive.

**Take the base, then CUT.** Both lists are built for blocking profanity on
children's products and are far too broad for an adult property marketplace. A
person writing "this landlord is a bloody nightmare" should not be held.

**My recommendation: cut the base to the categories in section 4 only**, which
is roughly a tenth of either list.

---

## 3. THE HIGHEST VALUE HALF, AND IT IS NOT PROFANITY

**The fraud patterns are worth more to this platform than every slur combined**,
because they are what actually happens in Nigerian property. They are also
unambiguous, so they carry almost no false-positive cost.

**Note the scanner ALREADY catches two of these** and these entries are additive:
a bare ten-digit run (account numbers) and `payment|transfer|pay me|account
number|acct|bank`. What follows is what that misses.

### 3a. Advance fee and inspection fee scams

```
agency fee before viewing
inspection fee before
pay before you see
pay before viewing
pay to inspect
inspection fee is non refundable
caution fee before
```

### 3b. Off-platform payment steering, which is the pattern that costs most

```
send the money to my personal
pay into my personal account
use opay
use kuda
use palmpay
use moniepoint
transfer to my momo
western union
moneygram
send via crypto
pay in usdt
pay in btc
gift card
itunes card
steam card
```

### 3c. Documentation and title fraud

```
no c of o needed
no certificate of occupancy
fake survey
fake allocation
government acquisition free
omo onile settled
family land no dispute guaranteed
```

### 3d. Urgency and isolation, the two levers every advance fee scam pulls

```
this offer expires today
last chance today
do not tell the agent
keep this between us
dont involve vallo
outside the platform
off the app
whatsapp me directly
call me on whatsapp
```

**These need review by somebody who knows the market.** Several are legitimate in
some contexts: an agent may genuinely have an inspection fee, and "no C of O"
may be an honest disclosure rather than a lie. **Holding for review is the right
response to all of them** precisely because a human has to read the context.

---

## 4. THE ABUSE HALF: CATEGORIES, NOT A DUMP

What a filter for "objectionable material" has to cover for both stores:

| Category | Include | Deliberately exclude |
|---|---|---|
| **Racial and ethnic slurs** | The unambiguous English set from the LDNOOBW base | Reclaimed usages are a human-queue problem, not a list problem |
| **Ethnic hatred, Nigeria-specific** | Slurs against Igbo, Yoruba, Hausa/Fulani and Niger Delta people, plus the civil-war era terms that still circulate | Ordinary ethnonyms. "Igbo landlord" is a description |
| **Sexual content and solicitation** | Explicit sexual acts, and solicitation phrasing, which matters because shortlets attract it | Anatomy in a medical or ordinary sense |
| **Sexual and gender-identity slurs** | The unambiguous set, including the common Nigerian-English ones | Orientation words used descriptively |
| **Religious hatred** | Terms attacking Muslims or Christians as groups | Religious words. "Church" and "mosque" are landmarks in listings |
| **Violence and threats** | Explicit threats to kill, harm or "deal with" a named person, and ritual-killing references | "Kill" in ordinary idiom. This category needs phrases, not words |
| **Child safety** | The unambiguous terms. **Zero tolerance, and these should escalate rather than merely hold** | Nothing. This category takes no false-negative risk |

**A recommendation on the last row.** `blocked_terms.severity` already exists and
defaults to `high`. Child-safety terms should be `critical`, and the desk should
treat that row differently from a held post about an inspection fee. That is a
one-line change in the scanner and I will make it if you agree.

---

## 5. PIDGIN, YORUBA, HAUSA AND IGBO

**I am not writing these and you should not accept them from me.** Every one of
the four needs a native speaker, for a reason that is not politeness:

**The false-positive risk in these languages is much higher than in English**,
because the word boundaries `\m`/`\M` are ASCII-oriented and Yoruba and Igbo
carry diacritics that people routinely drop when typing. A term written with
tone marks will not match the same word typed without them, and a term written
without them may match an innocent word that only differs by tone. **Getting
this wrong holds legitimate posts by the people the platform most needs.**

What I can say usefully:

- **Pidgin** carries most of the abuse traffic on Nigerian platforms and is the
  most likely gap if it is skipped. It is also the hardest for a list, because
  spelling is unstandardised: the same insult has four written forms.
- **The scam phrases in section 3 have Pidgin equivalents** and those matter more
  than the slurs. "No tell agent", "make we do am outside", "send am give me
  direct" are the same three patterns.
- **Ask a speaker for TEN terms per language, not a hundred.** A short list that
  a person stands behind beats a long one nobody has read.

**Suggested structure for the ask**, so you can hand it to somebody directly:

> For Yoruba / Hausa / Igbo / Pidgin, give me: the five most common ethnic or
> personal slurs a person would actually type on a property app, and the five
> most common ways somebody says "pay me directly, off the platform". Write each
> both with and without diacritics, as people really type them.

---

## 6. WHAT I WOULD DO ON DAY ONE

If the goal is to stop the store refusal and start learning:

1. **Seed section 3 in full** (about 35 fraud phrases). High value, near-zero
   false positives, and it is the behaviour that costs your users money.
2. **Seed the child-safety and explicit-threat categories** from the base list.
   Non-negotiable for both stores.
3. **Seed a cut-down slur set**, English only, maybe 60 terms.
4. **Ship with the other four languages empty** and a dated note saying so,
   rather than with my guesses in them.
5. **Read the held queue weekly for a month** and let the real traffic tell you
   what is missing. The list you end with should be mostly things you learned,
   not things you predicted.

**Roughly 100 to 120 terms on day one**, not a thousand.

---

## 7. HOW TO INSERT IT, WHEN YOU HAVE APPROVED IT

The table is `term text primary key`, `severity`, `created_at`. It is born
locked: RLS on, revoked from `anon` and `authenticated`, readable only by the
definer functions and the service role.

**Terms are matched case-insensitively** (`~*` in both scanners), so store them
lowercase. **One word or one phrase per row**, no regex metacharacters: the
pattern builder joins them with `|` inside `\m(...)\M`, so a stray `(` or `|` in
a term breaks the whole filter for every post. **That is worth a check constraint
and I will add one if you want it.**

Nothing is inserted until you say so.
