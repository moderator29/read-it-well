# Archive

**Nothing in this folder governs a current decision.**

These are retired documents. They are kept because they record how the platform
got here, what was tried, what was measured and what was rejected, and because
deleting somebody's reasoning is how a team relearns the same lesson twice. They
are **not** a plan, **not** a status and **not** a brief.

If a document in here disagrees with the code, the database, `docs/PRODUCT.md`,
`RECOMMENDATIONS.md`, `ROADMAP.md`, `KNOWN_GAPS.md` or
`ARCHITECTURE_DECISIONS.md`, the archive is wrong. Every time.

Everything durable and still true was carried into `RECOMMENDATIONS.md` before
any of these was moved. If you find something in here that is true, still
relevant and **not** in the live documents, that is a defect in the live
documents. Fix them, do not restore this.

Archived 2026-08-09.

---

## Read this one warning before opening `ui-audit/`

`ui-audit/00-reference-brief.md` is **the document that produced the visual
overload the platform is now removing.** It asked, in these words, for tinted
icon tiles behind list-row glyphs, symbol effects on every state change, a
floating pill island tab bar, photographic imagery inside category chips, and
filled-versus-outline variants of every glyph. The eight audits beside it grade
the codebase against that brief, so all nine inherit its direction.

It is superseded. It is stamped as superseded at the top of the file itself.
**Do not audit anything against it and do not treat its 308 findings as a
backlog.** Some of what it asked for was built and is being reviewed on its own
merits: see `RECOMMENDATIONS.md` D-2.

The audits are also comprehensively stale in fact, not only in direction. They
measured a `globals.css` of 3,167 lines, which is now 71 lines and 19 ordered
partials under `apps/web/src/app/css/`. They record that no `components/ui/`
directory exists, and there are now 12 primitives in it. They record zero
`loading.tsx` files, and there are 60. They record no ESLint config, and there is
one. Every count in those nine files needs re-measuring before it is quoted, and
`RECOMMENDATIONS.md` D-1 says so where the numbers still matter.

Finally: `ui-audit/` holds every remaining em dash in this repository, roughly
963 of them across ten files, against a house rule of zero. They are historical
records from a single session and a mechanical replacement would produce
ungrammatical prose in documents nobody is going to reread. The em dash scan in
CI excludes `docs/archive/`.

---

## What is in here, and why it was retired

| File | Why it was retired | What survived it |
|---|---|---|
| `MASTER_TODO.md` | The organising document for the NaijaFinds build. Its phase tables, route table and counts were corrected repeatedly and were stale again within hours, because two sessions committed in parallel | The build history is in `ROADMAP.md`. The current state is in `docs/PRODUCT.md` section 8 |
| `SESSION_HANDOFF.md` | A snapshot written at one commit. Opened by naming two blockers that are both resolved | Its hard-won gotchas are in `docs/HANDOFF.md` section 6 and `RECOMMENDATIONS.md` T-2 |
| `NEXT_SESSION_PROMPT.md` | A paste-in prompt that told a fresh session the social layer was its "main build". The social layer shipped on 2026-08-04. This file would have caused a rebuild of a shipped subsystem | The house rules it carried are in `docs/HANDOFF.md` section 2 and `docs/PRODUCT.md` |
| `POLISH_PASS.md` | A 50-item working list, most of it closed. Its value was the measured results beside the DONE markers, not the list | Every measurement worth keeping is in `RECOMMENDATIONS.md` under PERF and D |
| `DEAD_ENDS.md` | A half-loop audit. All 6 blockers and 5 of 12 serious findings closed; the inventory findings were closed by deleting the inventory layer | The findings still open are `RECOMMENDATIONS.md` W-3, PERF-5, P-4 and V-6, re-verified rather than copied |
| `agent1-selection.md` | A ranked 50, closed at 22 by the owner. A record of what was considered | Nothing outstanding; the rest is superseded by `RECOMMENDATIONS.md` |
| `recommendations-inbox.md` | 250 raw numbered items, the pool the ranked lists drew from. Cited as `#N` throughout the archive | The ones that still matter are entries in `RECOMMENDATIONS.md` |
| `SOCIAL_TODO.md`, `SOCIAL_LAYER.md` | The two earliest social plans. Both already deferred to `SOCIAL_DESIGN.md` in their own headers. `SOCIAL_TODO` carries 45 unticked checkboxes against finished work | `docs/SOCIAL_DESIGN.md`, which is live |
| `SOCIAL_BUILD.md` | The build order. 112 unticked checkboxes, every one of them shipped. An empty box here is not a gap | Read the database and the route table |
| `SOCIAL_AUDIT.md` | Five rounds of audit, closed out. Its specifications for mentions, the AI summon and the events table were all built | `docs/SOCIAL_DESIGN.md` and the live schema |
| `HYBRID_INVENTORY.md` | The model for blending third-party hotel and restaurant stock. The owner removed third-party inventory from the product entirely, and `apps/web/src/lib/inventory/` no longer exists | The listing quality gate at admission, and the first-party trust argument, are in `RECOMMENDATIONS.md` and `docs/PRODUCT.md` |
| `DATA_SOURCES.md` | Every third-party feed considered, with portals and keys. All of it is out of scope now | The MapTiler licensing exposure, which is not a feed and is real, is `RECOMMENDATIONS.md` M-1. The reasoning that shortlets have no aggregator and are therefore ours to win is in `docs/PRODUCT.md` |
| `intake/00-INTAKE-STATUS.md` | The specification intake for NaijaFinds: 11 references, 12 contradictions, the greenfield recon | Historical only |
| `intake/01-PROJECT-RULES.md` | The owner's 80 Master Rules, indexed by theme. The ADRs cite these by number, so the index is kept here rather than deleted | The rules that bind day to day are restated in `docs/HANDOFF.md` section 2 |
| `ui-audit/*` | See the warning above | `RECOMMENDATIONS.md` D-1, D-2 and D-3 |
