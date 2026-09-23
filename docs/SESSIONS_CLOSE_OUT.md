# Sessions close-out

**One file. Two sessions. Written for the founder, and written to be checked.**

This is where Session A and Session B each report what they finished, what is
left, what percentage the code stands at, and what the founder has to do
himself. **The founder reads this file directly.** Write it for somebody who
is going to open the repository and verify the claims, not for somebody who
will be reassured by them.

---

## How this file is written, and the rules that govern every line in it

**Each session owns its own part and never edits the other's.** Session A
writes PART A. Session B writes PART B. Both write into PART C. Commit small,
`git pull --rebase origin main` before every push, and push immediately after
writing rather than holding the file.

**Four rules, and they are not optional.**

1. **Nothing is called done unless it is true.** If a thing is built but has
   never been exercised, it is BUILT and UNPROVEN, not DONE. That distinction
   is the whole reason this platform's real figure was 47 per cent when it
   felt like 90.
2. **Every percentage says what it is measured against**, with its raw
   fraction and its denominator. Files touched, scopes closed and items on a
   list are three different numbers. A percentage with no denominator is a
   mood.
3. **Nothing counts as proven because a check passed.** Seven blind lights
   were found on this platform in one day, five of them by pulling on lights
   that were showing the right colour. A grep proving a string exists is not
   proof a browser drew it. An HTTP 200 is not proof a page rendered.
4. **Say what you skipped, unprompted.** A close-out that lists only successes
   is not a close-out.

**Re-audit before you write.** Do not report from memory or from an agent's
summary. Open the file, run the command, query the database, and then write
the number.

---

## PART A: Session A

*Session A fills this in. Delete this line when you do.*

### A1. What is finished and proved

*Each item: what it is, how it was proved, and the commit.*

### A2. What is built but unproven, and what proving it needs

### A3. What is not built, with an honest estimate

### A4. The code, by the numbers

*Percentage per brief and per track, each with its denominator. Tests, lint,
build, production state. The one honest overall figure at the end.*

### A5. What broke, what was wrong, what was corrected

*Including anything you claimed earlier that turned out not to be true.*

### A6. What the next session needs to know

*The traps, the conventions, the things that would cost somebody a day to
rediscover.*

---

## PART B: Session B

*Session B fills this in. Delete this line when you do.*

### B1. What is finished and proved

*Each surface: matched against its governing image with the comparison
recorded, wired end to end with the chain walked, and the commit.*

### B2. What is built but unproven, and what proving it needs

### B3. What is not built, with an honest estimate

### B4. The code, by the numbers

*Percentage per surface, each with its denominator. The seven surfaces, the
admin console, its documentation, and the welcome email.*

### B5. What broke, what was wrong, what was corrected

### B6. What the next session needs to know

---

## PART C: What the founder must do himself

**Both sessions write here.** One list, no duplicates, and check what the
other has already written before you add.

**For each item: what it is, why it is blocked on him rather than on you, what
exactly he has to click or send or decide, roughly how long it takes, and what
it unblocks.**

**Mark anything that is blocking a whole track**, so he knows which one to do
first thing rather than at the weekend.

**Do not put anything here that you could do yourself.** The last list sent
him to fix a MapTiler key that was already set in production and a `.env.local`
that a session can create for itself.

### C1. Blocking something, do these first

### C2. Needed before launch, not blocking today

### C3. Decisions only he can make

*Product and business questions, not engineering ones. State the options and
your recommendation.*

---

## PART D: The state of the tree at close

*Both sessions confirm, separately.*

- Branch synced with `main`, nothing unpushed
- Tests, lint and build all green, with the numbers
- Production deployment green, with the commit
- Every scope file and ledger current and pushed
- Anything left uncommitted, and why

---

**Last written:** *(date, time, and the commit it was measured at)*
