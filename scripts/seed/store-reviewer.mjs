#!/usr/bin/env node

/**
 * Seed the account an App Store and Play Store reviewer signs in with.
 *
 * ===========================================================================
 * WHY THIS EXISTS, AND WHY IT EXISTS BEFORE THE LOGIN DOES.
 * ===========================================================================
 *
 * Both stores require credentials a reviewer can sign in with. This repository
 * has never had a signed-in session to look at: no build session has been able
 * to open an authenticated surface, which is why every claim about one in
 * every report has been unproven, and it is why the founder could open the
 * product and find a pitch page where a wizard was supposed to be.
 *
 * The login itself is the founder's to choose. Everything else is written now,
 * so that the moment he has it this is ONE COMMAND and not an afternoon.
 *
 * ===========================================================================
 * RUNNING IT
 * ===========================================================================
 *
 *   SEED_REVIEWER_EMAIL=... SEED_REVIEWER_PASSWORD=... \
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed/store-reviewer.mjs
 *
 * `--dry-run` reports exactly what it would do and touches nothing, which is
 * the first thing to run against a database that holds real people.
 *
 * ===========================================================================
 * WHAT IT PROMISES AND WHAT IT REFUSES TO DO
 * ===========================================================================
 *
 * IT IS IDEMPOTENT AND IT TOUCHES ONE ACCOUNT. Run it twice and the second run
 * finds the account, resets the password to the one in the environment, and
 * changes nothing else. It writes no listing, no booking, no message and no
 * row belonging to anybody else. A seeding script that invents supply is a
 * script that puts invented supply in front of a reviewer, and rule 15 has
 * something to say about that.
 *
 * IT NEVER PRINTS THE PASSWORD. Rule 16. The address is printed because the
 * founder has to paste it into App Store Connect and Play Console, and it is
 * the address he just typed in.
 *
 * IT PROVES THE LOGIN RATHER THAN ASSUMING IT. The last thing it does is sign
 * in with the ANON key, exactly as the product would, and report whether a
 * session came back. A seeded account nobody has signed into is the same
 * unproven claim this script exists to end.
 *
 * IT SAYS WHAT THE REVIEWER WILL ACTUALLY MEET. The catalogue is example stock
 * today and the script says so in its report rather than letting a green tick
 * imply a shop with something in it.
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.argv.includes("--dry-run");

/** The version strings the product serves, kept in one place in the app. */
const LEGAL_VERSIONS = [
  { document: "terms", version: "2026-09-22" },
  { document: "privacy", version: "2026-09-22" },
];

/**
 * Who the reviewer is, as far as the product is concerned.
 *
 * A real Nigerian state and local government, because `handle_new_user`
 * validates both against `public.states` and `public.local_governments` and
 * silently stores null for anything it cannot match, which would leave the
 * reviewer's profile half empty for no visible reason.
 */
const PROFILE = {
  first_name: "Store",
  surname: "Reviewer",
  state_code: "LA",
  /* `la_eti_osa`, checked against `public.local_governments` rather than
     guessed: the first version of this line said "eti-osa", which the trigger
     matches against nothing and stores as null, which is the exact silent half
     empty profile the comment above warns about. */
  lga_code: "la_eti_osa",
  occupation_code: null,
  display_name: "Store Reviewer",
};

function required(name) {
  const value = (process.env[name] ?? "").trim();
  if (value.length === 0) {
    console.error(`MISSING ${name}. Nothing was changed.`);
    console.error("");
    console.error("This script needs five values and will not guess any of them:");
    console.error("  SEED_REVIEWER_EMAIL         the login a store reviewer signs in with");
    console.error("  SEED_REVIEWER_PASSWORD      its password, which is never printed");
    console.error("  NEXT_PUBLIC_SUPABASE_URL    the project");
    console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY  used to PROVE the login works");
    console.error("  SUPABASE_SERVICE_ROLE_KEY   used to create the account");
    process.exit(1);
  }
  return value;
}

function line(label, value) {
  console.log(`  ${label.padEnd(28)}${value}`);
}

async function findUserByEmail(admin, email) {
  /* `listUsers` is paged and this estate is small, but the loop is written
     properly anyway: a script that works until the hundredth account is a
     script that fails on the day somebody is watching. */
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`could not list accounts: ${error.message}`);
    const hit = (data?.users ?? []).find((user) => (user.email ?? "").toLowerCase() === wanted);
    if (hit) return hit;
    if ((data?.users ?? []).length < 200) return null;
  }
  return null;
}

async function main() {
  const email = required("SEED_REVIEWER_EMAIL");
  const password = required("SEED_REVIEWER_PASSWORD");
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceKey = required("SUPABASE_SERVICE_ROLE_KEY");

  if (password.length < 12) {
    console.error("SEED_REVIEWER_PASSWORD is shorter than 12 characters. Nothing was changed.");
    console.error("This account is published to two app stores. Give it a real password.");
    process.exit(1);
  }

  console.log("");
  console.log("SEEDING THE STORE REVIEWER ACCOUNT");
  line("project", url);
  line("login", email);
  line("password", "not printed, and never will be");
  line("mode", DRY_RUN ? "DRY RUN, nothing will be written" : "writing");
  console.log("");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existing = await findUserByEmail(admin, email);

  if (DRY_RUN) {
    line("account", existing ? `exists (${existing.id})` : "would be created");
    line("email confirmed", existing?.email_confirmed_at ? "already" : "would be set");
    line("terms receipt", `would record ${LEGAL_VERSIONS.map((l) => `${l.document}@${l.version}`).join(", ")}`);
    line("wallet", "would be created if absent");
    console.log("");
    console.log("DRY RUN COMPLETE. Nothing was written. Drop --dry-run to do it.");
    return;
  }

  let userId;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`could not update the account: ${error.message}`);
    userId = data.user.id;
    line("account", `found and updated (${userId})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      /* Confirmed on creation. A reviewer cannot open our confirmation email,
         and an unconfirmed account is a sign-in that fails in front of the one
         person whose opinion decides whether this ships. */
      email_confirm: true,
      user_metadata: PROFILE,
    });
    if (error) throw new Error(`could not create the account: ${error.message}`);
    userId = data.user.id;
    line("account", `created (${userId})`);
  }

  /* The sign-up trigger writes the profile, the role and the handle. It runs
     on insert, so it has already run by the time createUser returns; this
     reads the result rather than trusting it, because a profile that did not
     land is a reviewer looking at a nameless account. */
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, state_code, lga_code")
    .eq("id", userId)
    .maybeSingle();
  line("profile", profile ? `${profile.display_name ?? "no name"} (${profile.state_code ?? "no state"})` : "MISSING, see handle_new_user");

  const { data: social } = await admin
    .from("social_profiles")
    .select("handle")
    .eq("user_id", userId)
    .maybeSingle();
  line("handle", social?.handle ? `@${social.handle}` : "none claimed");

  /* The receipt, exactly as the product writes it at sign up, because an
     account created by a script is still an account that accepted the terms
     and `public.terms_acceptances` is the only place that is recorded. */
  const { error: acceptError } = await admin.from("terms_acceptances").upsert(
    LEGAL_VERSIONS.map((legal) => ({
      user_id: userId,
      document: legal.document,
      version: legal.version,
      source: "store_review_seed",
    })),
    { onConflict: "user_id,document,version", ignoreDuplicates: true },
  );
  line("terms receipt", acceptError ? `NOT recorded: ${acceptError.message}` : "recorded");

  /* A wallet, so the money surfaces render their real empty state rather than
     their unavailable one. It holds nothing and this script never credits it:
     putting invented naira in front of a reviewer is a different kind of lie
     from an empty balance. */
  const { error: walletError } = await admin
    .from("wallets")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  line("wallet", walletError ? `NOT created: ${walletError.message}` : "present, and empty");

  /* THE PROOF. Everything above used the service role, which can do anything
     and therefore proves nothing about whether a person can sign in. This is
     the product's own front door. */
  const front = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signInError } = await front.auth.signInWithPassword({
    email,
    password,
  });
  console.log("");
  if (signInError || !session?.session) {
    console.log(`SIGN IN FAILED: ${signInError?.message ?? "no session came back"}`);
    console.log("The account exists but a reviewer could not use it. Do not submit yet.");
    process.exitCode = 1;
    return;
  }
  console.log("SIGN IN PROVED. A session came back from the anon front door.");
  await front.auth.signOut();

  console.log("");
  console.log("WHAT THE REVIEWER WILL ACTUALLY MEET, SAID PLAINLY:");
  const { count: listings } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "PUBLISHED");
  const { count: real } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "PUBLISHED")
    .eq("is_demo", false);
  line("published listings", String(listings ?? 0));
  line("of those, not examples", String(real ?? 0));
  if ((real ?? 0) === 0) {
    console.log("");
    console.log("  EVERY PUBLISHED LISTING IS AN EXAMPLE. A reviewer signing in with this");
    console.log("  account will browse example stock. That is a supply problem and not a");
    console.log("  seeding problem, and it is stated here rather than left to be discovered.");
  }
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  console.error("Nothing further was attempted.");
  process.exit(1);
});
