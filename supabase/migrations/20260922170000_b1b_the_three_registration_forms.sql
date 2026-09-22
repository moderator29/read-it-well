-- THE THREE REGISTRATION FORMS, AND THE COLUMNS THEY FILE INTO.
--
-- `GOVERNING-03`, `04` and `05` draw three four screen forms: the owner, the
-- agent and the firm. Every one of them files a real row in
-- `public.agent_applications`, which already carries the person half of what
-- they ask: name, phone, email, address, state, city, id type, id number, the
-- business block and the bank block. This migration adds the nine facts those
-- three forms ask for that the table has never had a place for, and widens one
-- check constraint by two values.
--
-- NOTHING HERE IS A NEW TABLE AND NOTHING HERE IS A NEW ROLE. The person axis
-- (`agents.role`, `agents.firm_id`, `firm_members`) and the pair axis
-- (`listings.listing_role`, `listing_mandates`) are the model
-- `docs/research/ROLE_ARCHITECTURE_RESEARCH.md` Part 2 sets out and they are
-- not built yet. An APPLICATION is not either of those axes: it is what a
-- person said about themselves before anybody checked, and it belongs on the
-- application row. Filing it anywhere else would be recording a claim as a
-- fact, which is the exact failure the three subject badges exist to prevent.
--
-- EVERY COLUMN IS NULLABLE except the team, which defaults to an empty array.
-- Three forms share one table and each one fills a different third of it, so a
-- not null column would be a not null column for two forms that never ask the
-- question. An unasked question reads as null, never as a value.
--
-- NO STATUTORY FIGURE, PENALTY OR PERCENTAGE IS ENCODED HERE. `lasrera_number`
-- is a field a person may fill in, with no default, no requirement and no
-- consequence attached in the database. `docs/BUILD_07_LEDGER.md` section 5
-- holds the LASRERA figures for a lawyer, and until that closes the product
-- says what the field is and never what the law requires.
--
-- NO SECURITY DEFINER FUNCTION IS CREATED BY THIS MIGRATION, so there is no
-- EXECUTE grant to revoke. Rule 21 is satisfied vacuously and the probe
-- asserts the vacuum rather than assuming it: a later reader should be able to
-- see that the question was asked.

/* ------------------------------------------------- the application's role */

alter table public.agent_applications
  /*
   * WHICH OF THE THREE DOORS THIS APPLICATION CAME THROUGH.
   *
   * `type` already exists and is `individual | business`, which has never meant
   * owner or agent: a landlord with one flat and a one person letting agency
   * are both `individual` and the product has been telling them on screen that
   * they are different things. `type` is left exactly as it is, because five
   * surfaces read it and renaming it is a separate, readable change. This
   * column is the honest answer to a question `type` was never asked.
   */
  add column if not exists supply_role text,

  /* -------------------------------------------------- the owner's screens */

  /*
   * WHAT THE OWNER SAYS THEY HOLD ON THE PROPERTY, INCLUDING NOTHING.
   *
   * `none` is a FIRST CLASS VALUE and it is expected to be the commonest one.
   * Most Nigerian land sits outside the formal register and most landlords
   * hold no title document at all, so a column that could not record "none"
   * would be a column that quietly excluded the majority of the supply this
   * platform is trying to build. The figures are not written here and are not
   * printed anywhere in the product: they rest on a search summary rather than
   * a primary source and a lawyer confirms them before any number becomes
   * copy. What ships is the behaviour, which needs no citation.
   *
   * The first three values are spelled exactly as `public.land_tenure` spells
   * them, so the day an ownership document is filed against a LISTING the two
   * vocabularies already agree. `survey_plan` and `utility_bill` are not
   * tenures and are not added to that enum: a survey plan describes a parcel
   * and a utility bill shows occupation, and neither is a claim about title.
   */
  add column if not exists ownership_document text,

  /*
   * THE NEIGHBOURHOOD, WHICH NOTHING ON THIS TABLE COULD HOLD.
   *
   * `state_code` and `city` exist; `area` does not, and "Lekki Phase 1" is not
   * a city. `listings.area` has carried exactly this for a listing since the
   * listing schema was written, and this is the same fact about the person's
   * own registration, spelled the same way.
   *
   * ON THIS ROW `state_code`, `city` AND `area` ARE WHERE THE PERSON OWNS, not
   * where they sleep. The owner form asks "where do you own" and the exact pin
   * belongs to a listing rather than to a registration, which is why
   * `residential_address` is left null by that form rather than filled with a
   * property's address.
   */
  add column if not exists area text,

  /* -------------------------------------------------- the agent's screens */

  /* How long they say they have been doing this. A band, not a date, because
     the form asks for a band and storing a derived date would be inventing a
     precision the person never gave. */
  add column if not exists years_experience text,

  /*
   * THE TWO FEES, IN BASIS POINTS, AND THEY ARE NOT MONEY.
   *
   * Money on this platform is integer kobo and these are not money: they are a
   * share of somebody else's rent, which is a different quantity and a
   * different rounding story. Basis points are the integer form of a
   * percentage: 1000 is ten per cent, 50 is half of one per cent. A float
   * would let 0.1 + 0.2 decide what a tenant owes.
   *
   * NULL IS NOT ZERO HERE AND THE DIFFERENCE IS THE WHOLE POINT. A fee the
   * agent has not declared is drawn as not declared; zero is a claim, and it
   * is a strong one, so nobody is credited with it by a default.
   */
  add column if not exists agency_fee_bps integer,
  add column if not exists legal_fee_bps integer,

  /* --------------------------------------------------- the firm's screens */

  /*
   * A FIELD, AND ONLY A FIELD.
   *
   * No requirement, no default, no consequence, and nothing in this database
   * refuses a firm that leaves it empty. What the law requires, of whom, and
   * what ignoring it costs are all unconfirmed here: the register was
   * unreachable and every claim about it reaches us through a search summary.
   * A hard gate built on that would empty the supply side of the one city that
   * matters most on a claim nobody has read the source of.
   */
  add column if not exists lasrera_number text,

  /* Which of the two routes on "prove you work here" the applicant chose: a
     letter on the firm's paper, or a named principal who confirms them. */
  add column if not exists association_proof text,

  /* The principal's email, when that is the route. It is a claim about
     somebody else, so it is stored as what the applicant typed and is never
     treated as a verified address for that person. */
  add column if not exists principal_email text,

  /*
   * THE TEAM THE APPLICANT DECLARES, AS AN ARRAY OF NAME AND EMAIL.
   *
   * NOT `firm_members`. A membership is a fact about two parties and needs the
   * other party's agreement; this is one person listing colleagues before the
   * firm itself has been checked. Recording that as membership would let an
   * application create staff, which is the letterhead failure the firm form
   * exists to catch. The real roster lands with `firm_members` and
   * `agents.firm_id` when the person axis is built, and it will be populated
   * by invitation and acceptance rather than by a form.
   *
   * Empty array and not null, because "they declared nobody" and "we never
   * asked" are the same event for this field: the owner and agent forms do not
   * show the screen at all.
   */
  add column if not exists firm_team jsonb not null default '[]'::jsonb;

/* ------------------------------------------------------- what is accepted */

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_applications'::regclass
      and conname = 'agent_applications_supply_role_known'
  ) then
    alter table public.agent_applications
      add constraint agent_applications_supply_role_known
      check (supply_role is null or supply_role in ('owner', 'agent', 'firm'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_applications'::regclass
      and conname = 'agent_applications_ownership_document_known'
  ) then
    alter table public.agent_applications
      add constraint agent_applications_ownership_document_known
      check (
        ownership_document is null
        or ownership_document in (
          'certificate_of_occupancy',
          'deed_of_assignment',
          'governors_consent',
          'survey_plan',
          'utility_bill',
          'none'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_applications'::regclass
      and conname = 'agent_applications_association_proof_known'
  ) then
    alter table public.agent_applications
      add constraint agent_applications_association_proof_known
      check (association_proof is null or association_proof in ('letter', 'principal'));
  end if;

  /*
   * A FEE IS A SHARE, SO IT LIVES BETWEEN NOTHING AND EVERYTHING.
   *
   * Nought to ten thousand basis points is nought to a hundred per cent. The
   * platform does not cap anybody's fee and this is not a cap: it is the
   * statement that a percentage is a percentage. An agent charging more than
   * the whole rent has mistyped, and refusing it here is cheaper than printing
   * it to a tenant.
   */
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_applications'::regclass
      and conname = 'agent_applications_fees_are_shares'
  ) then
    alter table public.agent_applications
      add constraint agent_applications_fees_are_shares
      check (
        (agency_fee_bps is null or (agency_fee_bps >= 0 and agency_fee_bps <= 10000))
        and (legal_fee_bps is null or (legal_fee_bps >= 0 and legal_fee_bps <= 10000))
      );
  end if;

  /* An array of objects, and nothing else. A team that arrived as a string or
     a number is a bug upstream and it should not be filed. */
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.agent_applications'::regclass
      and conname = 'agent_applications_firm_team_is_a_list'
  ) then
    alter table public.agent_applications
      add constraint agent_applications_firm_team_is_a_list
      check (jsonb_typeof(firm_team) = 'array');
  end if;
end
$$;

/* --------------------------------------------- two more kinds of document */

/*
 * WIDENED, NOT REPLACED. Every row that satisfied the old constraint satisfies
 * this one, so nothing is refused that was accepted yesterday and no data
 * moves.
 *
 *   selfie       `GOVERNING-04` screen two asks an agent for a photograph of
 *                their face beside their ID, which is the only thing that ties
 *                the document to the person holding it. Filing it as
 *                `identity` would mean a reviewer could not tell which of the
 *                two uploads was the document and which was the face.
 *   association  `GOVERNING-05` screen two asks for a letter on the firm's
 *                paper naming the applicant. It is a claim about employment,
 *                not about identity and not about the company's registration,
 *                and `lib/host/onboarding.ts` already uses exactly this word
 *                for exactly this document on the stays side.
 */
alter table public.agent_documents
  drop constraint if exists agent_documents_kind_known;

alter table public.agent_documents
  add constraint agent_documents_kind_known
  check (kind = any (array['identity', 'address', 'business', 'selfie', 'association']));

comment on column public.agent_applications.supply_role is
  'Which of the three registration forms filed this: owner, agent or firm. Distinct from `type`, which is individual or business and predates the two role axes.';
comment on column public.agent_applications.ownership_document is
  'What the owner says they hold on the property. `none` is a first class answer that reaches a published listing and never earns the words ownership verified.';
comment on column public.agent_applications.agency_fee_bps is
  'Declared agency fee in basis points. Null means not declared, which is not zero.';
comment on column public.agent_applications.legal_fee_bps is
  'Declared legal fee in basis points. Null means not declared, which is not zero.';
comment on column public.agent_applications.lasrera_number is
  'A field, not a gate. Nothing in this database requires it or penalises its absence.';
comment on column public.agent_applications.firm_team is
  'Colleagues the applicant declared, as [{name, email}]. Not a membership: `firm_members` is the roster and it is built by invitation.';
