# Fix scope: who owns what while two sessions work in parallel

The **audit fix session** works on branch `claude/vallo-audit-app-store-jzmmd4`. It owns:
- security, RLS and the schema;
- money and escrow correctness;
- store compliance;
- the build pipeline and the tests;
- the claims sweep;
- the repository cleanup;
- every file named in a finding in `docs/THE_AUDIT.md`;
- V-33, the live rent charge, taken from THE_HUNDRED;
- the items THE_HUNDRED lists as "Handed to the audit session".

The **recommendations session** owns the new features and surfaces from `docs/THE_HUNDRED.md` that no audit finding touches.

**To claim a file the other session holds,** add a line below and work on something else until the other session releases it.

## Claims

(none yet)
