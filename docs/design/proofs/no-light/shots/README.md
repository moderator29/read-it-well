# These five shots are a SIGNAL, not the proof

Taken by the light mode removal worker against a **dev server**, with the
operating system's colour preference forced to light, on 23 September. All five
came out dark: root `color-scheme: dark`, no `data-theme` attribute, painted
canvas about `rgb(2, 4, 30)`, and form controls inheriting the dark scheme.

**That is not this repository's proof bar and they are not presented as
meeting it.** The worker said so itself in its hand-back and it was right. A
dev server is not what anybody runs: it serves a different branch of the code
in places, it does not exercise the production build, and `next build` had
never been run by either session at the time these were taken.

They are committed because a signal is worth more than nothing while the real
proof is outstanding, and because leaving them uncommitted in a shared tree is
how work gets lost when a container is reclaimed.

**What would replace them:** the same five routes walked against a production
`next start`, with the OS preference forced to light, once a green build
exists. Until that is done, light mode removal is BUILT AND UNPROVEN on the
only measure that counts.
