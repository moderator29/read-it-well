# The recordings

Eleven v3, the same voice as Videos One and Two. Recorded 17 October 2026.

| File | Film | State |
|---|---|---|
| `signup.mp3` | the sign-up film | **in use.** Aligned (95/95 words, DP cost 1.46) and installed as `films/signup/timeline.json`. |
| `referral-take1-OLD-SCRIPT.mp3` | the referral film | **cannot ship.** Read from the script as it stood before the 17 October correction. |
| `listing-take1-OLD-SCRIPT.mp3` | the listing film | **cannot ship.** Same. |

## Why the two takes cannot ship

They were recorded from `THREE-SHORT-FILMS.md` minutes before three lines in
it were corrected against the live product, so they say things Vallo does not
do. Proved, not guessed: aligning each take against the corrected script and
against the original gives

| | corrected script | original script |
|---|---|---|
| referral | DP cost 5.67, six flags | DP cost 3.37, two trivial flags |
| listing | DP cost 2.75, one failed alignment | DP cost 2.44, no flags |

and the recogniser's own free hypothesis for the referral take's third island
comes back `when a friend signs up with ed and finishes verifying who they
are`, which is the old line word for word.

The referral take says "No limit on how many friends you bring, and no catch
in the small print" over a film that shows the screen printing "Qualified
referrals counted a month: 1,500". The listing take says a place is live the
moment it is described, when every workspace is an application whose last
step is "Check and send".

Re-record both from the corrected blocks in `THREE-SHORT-FILMS.md`, at the
same settings. The takes are kept because they are the only measurement of
how fast this voice actually reads: 2.95 words a second with a 0.32 s breath,
which is what `films/provisional.mjs` is now tuned to.

## Putting a recording under a film

    python3 scripts/marketing/audio/timings.py --voice <take.mp3> \
        --script docs/marketing/voiceover/scripts/<proj>.txt --out <dir>
    node scripts/marketing/video/films/install-voice.mjs <proj> \
        <dir>/timings.json docs/marketing/voiceover/scripts/<proj>.txt

`install-voice.mjs` regroups the aligner's sentences into the script's own
lines (the films count sentences by line, s(1)..s(9)), places each on the
beat grid keeping the gaps the voice actually left, and snaps the music
markers to bar lines. It refuses outright if a word in the recording is not
the word in the script, which is how the two bad takes were caught.
