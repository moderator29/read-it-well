# Savings pots

Money a person sets aside inside their **own** wallet — rent money, house money
— so that spending it takes a deliberate act.

**Pots earn nothing.** No interest, no yield, no return, no lock-in, no penalty.
That is a deliberate limit, not an omission: paying a return on customer
balances is a regulated activity, and a savings product that implies one without
a licence for it is the kind of promise that ends a company. The schema is
written so that a return is not something it can express — there is no column
that could hold a rate.

---

## You have to apply these yourself

Two migration files are in `supabase/migrations/`:

| File | What it does |
| --- | --- |
| `20260812090000_a_wallet_can_set_money_aside.sql` | adds two values to the `wallet_entry_kind` enum |
| `20260812090100_pots_move_money_under_the_wallet_lock.sql` | the table, RLS, the guard trigger, and the two money functions |

**Run them in that order, as two separate statements.** Postgres will not let a
new enum value be *used* in the same transaction that adds it, which is why the
enum is on its own and why they cannot be pasted together.

The Supabase MCP connected to my session points at a different account from
RentMe's, so I have not run these against your database and will not — applying
a migration to the wrong project is exactly the failure worth being careful
about. Open the **SQL editor** in your Supabase dashboard and paste each file,
the same way you set the Vault secret.

After applying, regenerate the types so the app layer can see the new table:

```
supabase gen types typescript --project-id <your-ref> > apps/web/src/lib/supabase/database.types.ts
```

---

## What the schema guarantees

- **The pot balance and the ledger can never disagree.** Both money functions
  write the `wallet_entries` row and update `wallet_pots.balance_minor` in one
  transaction, under the *same* `for update` lock on the wallet row that the
  withdrawal path takes. Two concurrent moves cannot both pass the balance
  check.
- **Nobody can write a balance directly.** There is no RLS policy that permits
  it, and a `before update` trigger raises if `balance_minor` changes outside
  the two functions. That matters because an UPDATE policy in Postgres covers
  the whole row: without the trigger, a "rename my pot" request could carry a
  new balance and RLS would allow it.
- **Both functions are service-role only.** A SECURITY DEFINER function whose
  first argument is *whose wallet* must never be callable by `anon` or
  `authenticated`. The server actions resolve the session and pass the id.
- **Spendable excludes pending debits.** Money already committed to an in-flight
  withdrawal cannot also fund a pot.
- **Both are idempotent on the reference**, like every other money path here.
- **A pot cannot go negative** — a check constraint, plus the functions refuse
  to take out more than is in it.
- **Money out works on an archived pot.** Closing a pot must never be able to
  strand money inside it.

## Why `pot_hold` and `pot_release` rather than reusing `transfer_out`/`in`

A transfer means money left for somebody else. Money moved into a pot has not
left the wallet at all — it is the same person's money, one step further from
being spent. A statement row calling that a transfer lies to the person reading
it about where their money went.

The names follow the escrow pair they behave like: a hold takes money out of
spendable, a release puts it back.

## The app layer is already shipped, and it waits for you

Server actions, the pots section, create, top up and take out are all on main.
**They appear by themselves the moment you run the SQL** — there is nothing to
redeploy.

Until then `readPots()` answers `unavailable`, the wallet draws no pots section,
and every action answers "Savings pots are not switched on for this account
yet." Verified against a running build with the table absent: the wallet returns
200 and the words "Set aside" appear zero times.

The generated types do not know about `wallet_pots` yet, so the read and the
insert go through narrow casts contained in `lib/wallet/pots.ts` and
`lib/wallet/pot-actions.ts` — the same approach `lib/wallet/rpc.ts` already
takes for the money functions, and for the same reason. Regenerating the types
changes nothing; the casts simply stop being load-bearing.
