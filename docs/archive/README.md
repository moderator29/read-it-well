# Archive

**Nothing in this folder governs a current decision.**

These are retired documents. They are kept because they record how the platform
got here, what was tried, what was measured and what was rejected, and because
deleting somebody's reasoning is how a team relearns the same lesson twice. They
are **not** a plan, **not** a status and **not** a brief.

If a document in here disagrees with the code, the database, `docs/PRODUCT.md`,
`docs/THE_AUDIT.md`, `docs/RECOMMENDATIONS.md` or
`docs/ARCHITECTURE_DECISIONS.md`, the archive is wrong. Every time.

Everything durable and still true was carried into `docs/RECOMMENDATIONS.md` before
any of these was moved. If you find something in here that is true, still
relevant and **not** in the live documents, that is a defect in the live
documents. Fix them, do not restore this.

Archived 2026-08-09, and added to on 2026-09-23.

**Session scaffolding lives here too.** Handoffs, build ledgers, prompts,
surveys and one-off audit reports were written for the build sessions that
made this platform: briefs and working records passed between them. They
explain how a decision was reached; they do not describe the platform. The
documentation of the platform itself is the rest of `docs/`.

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
| `KNOWN_GAPS.md` | The honest absence list, last updated 9 August 2026 and moved here from the repository root on 23 September. Later surveys found it stale. Code comments and migrations still cite it by name for specific gaps, which is why it is kept rather than deleted | The current state is `docs/THE_AUDIT.md`; open work is `docs/RECOMMENDATIONS.md` |
| `ROADMAP.md` | What had landed as of 9 August 2026, moved here from the repository root on 23 September. A history, not a plan | `docs/THE_AUDIT.md` and `git log` |
| `HANDOFF.md`, `HANDOFF_01_COMPANY.md`, `HANDOFF_02_PLATFORM.md`, `HANDOFF_03_FRONTEND.md`, `HANDOFF_06.md` | Briefs written for build sessions between 14 and 19 September 2026. Each was superseded by the next numbered handoff | What the product is: `docs/PRODUCT.md`; its state: `docs/THE_AUDIT.md`. `HANDOFF_01_COMPANY.md` still holds the only written record of the company obligations (registration, data protection, money rules); lift those into a live document before relying on the archive for them |
| `BUILD_06_LEDGER.md` | The working ledger of the 18 to 19 September build session: scopes, the queue, what landed with its commit. Many code comments cite its sections | The code, and `git log` |
| `FRONTEND_REVAMP.md` | The 16 September survey of the frontend and the glass artwork, written before any of it was wired | `docs/BRAND_MARKS.md`, `docs/ICON_SYSTEM.md`, `docs/DESIGN_DIRECTION.md` |
| `VALLO_DISCOVERY_REPORT.md` | The 18 September discovery report that opened the visual reimagination; its evidence chapters are in `docs/research/` | `docs/DESIGN_DIRECTION.md` |
| `BRANCH_AUDIT.md` | The record of branch heads taken on 15 September before the branch clean-up, kept so a deleted branch can be restored from its SHA | Nothing; it is a record |
| `DATABASE_AUDIT.md` | The Supabase linter run of 7 August 2026. `docs/RECOMMENDATIONS.md` A2-130 records that its headline went stale | Re-run the advisors; `docs/security/GRANT_STATE.md` |
| `audit-2026-09-15/` | The three full audit reports of 15 September (product, engineering, frontend), the evidence behind every A1, A2 and A3 entry | `docs/RECOMMENDATIONS.md`, which carries each finding with its status |
| `SESSION_B_SCOPE.md`, `BUILD_SESSION_B_LEDGER.md` | The scope file and working ledger of the design build session that ran 21 to 23 September 2026 (the welcome flow, sign-in, profile, wallet, inspections and the admin console built to the reference renders). Many code comments cite their sections for the measurements behind a size or colour | The code, `docs/design/CATALOGUE.md` and `git log` |
| `BUILD_05_LEDGER.md`, `BUILD_07_LEDGER.md` | The working ledgers of the platform build sessions of 19 to 23 September 2026. `BUILD_07_LEDGER.md` links to proof screenshots that were deleted from the tree; they resolve in git history at `85c5471` | The code and `git log`; the checked state is `docs/THE_AUDIT.md` |
| `HANDOFF_04_MARKETPLACE.md`, `HANDOFF_05_UPGRADED_WIDE_PLATFORM_BUILD.md`, `HANDOFF_07_LAUNCH_AND_MOBILE.md`, `HANDOFF_08_THE_NEW_WEEK.md`, `HANDOFF_09_THE_DIRECT_PLATFORM.md` | The last five build briefs, 19 to 23 September 2026. Retired when both build sessions closed | What the product is: `docs/PRODUCT.md`; its state and the order of work: `docs/THE_AUDIT.md` |
| `SESSIONS_CLOSE_OUT.md`, `BUILT_VS_PROVEN.md` | The close-out report of the two build sessions and their register of what was built against what was proven | `docs/THE_AUDIT.md`, which re-checked every claim |
| `PLATFORM_STATUS.md` | The measured platform status, rewritten at the end of each build cycle (cycle 4, 23 September 2026 10:40 UTC). It described a moment and the cycles have stopped | `docs/THE_AUDIT.md` |
| `FOUNDER_OPEN_ITEMS.md` | The founder's working list during the build, last updated 23 September 2026 | The items still open were carried into `docs/THE_AUDIT.md` section 11 |
| `PROMPTS_2026-09-22.md`, `PROMPTS_THE_FINISH.md`, `PROOF_RUN_2026-09-22.md`, `PLATFORM_SURVEY_2026-09-22.md` | Prompts, one proof run and one survey written on 22 and 23 September for the build sessions | Nothing; they are records |
| `FOUNDER_ARTWORK_NEEDED.md` | A list of artwork requests, struck when light mode was removed. It still gives command paths into the deleted proofs folder | `docs/design/LIGHT_MODE_REMOVED.md` |
| `REFERENCE_UPLOADS_2026-09-22.md`, `TRACK_G_STATE.md` | Working notes on the 22 September reference uploads and on one design track | `docs/design/CATALOGUE.md` indexes every reference, including the admin renders now in `docs/design/references/admin/` |
| `SWEEP.md` | A generated register of which surfaces had proof screenshots, computed from `docs/design/proofs/`. The proofs are no longer in the tree, so it cannot be regenerated truthfully | Nothing; it is a record |
