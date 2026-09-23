-- THE ABUSE FILTER MATCHED NOTHING, BECAUSE THE TABLE IT READS WAS EMPTY.
--
-- `private.objectionable_pattern()` is `case when count(*) = 0 then null`, and
-- both scanners skip the abuse branch on null. Zero rows is not a small list,
-- it is NO filter, and Apple guideline 1.2 and Play's user generated content
-- policy both require one. This migration seeds it.
--
-- The fraud half is `docs/safety/BLOCKED_TERMS_PROPOSAL.md` section 3, seeded
-- AS WRITTEN, phrase for phrase. Nothing added, nothing cut.
--
-- The abuse half is written from that file's section 4 CATEGORIES, English
-- only, biased towards precision over recall exactly as section 1 instructs.
-- Every row carries its category and a one line reason, because a term nobody
-- can review is a term nobody can defend.
--
-- WHAT IS DELIBERATELY NOT SEEDED: Pidgin, Yoruba, Hausa and Igbo. Section 5's
-- reason still holds and was re-read before this decision: `\m` and `\M` are
-- ASCII-oriented word boundaries, Yoruba and Igbo carry diacritics that people
-- routinely drop when typing, so a term written one way either misses the word
-- it meant or hits an innocent word that differs only by tone. A wrong word in
-- a filter silences a real person in their own language. The one exception is
-- `nyamiri`, which is ASCII, undiacritised in every written form, and has no
-- innocent meaning in any of the four. `docs/i18n/LOCALE_STATE.md` carries the
-- ask for a native speaker.
--
-- SEVERITY. `public.alert_severity` is ('low','medium','high'). There is no
-- `critical`, so the child-safety rows sit at the ceiling the type allows.
-- Section 4's recommendation that they escalate above `high` cannot be honoured
-- without adding an enum label, which is a separate job: `severity` is ALSO not
-- read by `private.scan_post()` today, which hard-codes `sev := 'high'` on any
-- abuse match. Both are recorded in the ledger rather than fixed here.
--
-- THE TRAP THIS MIGRATION DOES NOT SPRING. Every term is joined into ONE
-- regular expression, so a single stray metacharacter breaks the filter for
-- every post on the platform. `blocked_terms_no_regex_metacharacters` was
-- verified present and validated, and proved to REFUSE `pay me|direct`,
-- `(unbalanced`, `any.thing` and a backslash term inside a rolled back
-- transaction, before one row of this was inserted.

alter table public.blocked_terms
  add column if not exists category text,
  add column if not exists reason   text;

comment on column public.blocked_terms.category is
  'Which of the proposal''s categories this term belongs to. Lets the desk read the list by class and cut a whole class at once.';
comment on column public.blocked_terms.reason is
  'One line saying why this term is here. A term with no reason cannot be reviewed, so a reason is required.';

update public.blocked_terms set category = 'fraud.advance-fee' where category is null;
update public.blocked_terms set reason = 'Seeded before reasons were required.' where reason is null;

alter table public.blocked_terms
  alter column category set not null,
  alter column reason   set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blocked_terms'::regclass
      and conname  = 'blocked_terms_category_is_known'
  ) then
    alter table public.blocked_terms
      add constraint blocked_terms_category_is_known
      check (category in (
        'fraud.advance-fee',
        'fraud.off-platform-payment',
        'fraud.title-documents',
        'fraud.urgency-isolation',
        'abuse.racial-ethnic',
        'abuse.ethnic-nigeria',
        'abuse.sexual-content',
        'abuse.sexual-solicitation',
        'abuse.identity-slur',
        'abuse.religious-hatred',
        'abuse.violence-threat',
        'abuse.child-safety'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.blocked_terms'::regclass
      and conname  = 'blocked_terms_reason_is_written'
  ) then
    alter table public.blocked_terms
      add constraint blocked_terms_reason_is_written
      check (length(btrim(reason)) >= 12);
  end if;
end
$$;

-- THE FRAUD HALF. Proposal section 3, as written.
-- Worth more to this platform than every slur combined, and near zero false
-- positive cost, because these are phrases nobody types by accident.

-- THE FRAUD HALF. Proposal section 3, as written.
insert into public.blocked_terms (term, severity, category, reason) values
('agency fee before viewing',        'medium', 'fraud.advance-fee', 'Money demanded before the person has seen anything is the oldest Nigerian letting scam.'),
('inspection fee before',            'medium', 'fraud.advance-fee', 'Same pattern; an honest inspection fee is charged at the inspection, not ahead of it.'),
('pay before you see',               'medium', 'fraud.advance-fee', 'The advance fee scam stated in plain words.'),
('pay before viewing',               'medium', 'fraud.advance-fee', 'As above, in the phrasing agents actually use.'),
('pay to inspect',                   'medium', 'fraud.advance-fee', 'Charging for access to a property that may not exist.'),
('inspection fee is non refundable', 'medium', 'fraud.advance-fee', 'Non refundability is the line that stops the victim asking for the money back.'),
('caution fee before',               'medium', 'fraud.advance-fee', 'A caution fee taken ahead of any agreement is a deposit on nothing.'),

('send the money to my personal',    'high',   'fraud.off-platform-payment', 'Steering payment to a personal account puts it outside every protection Vallo has.'),
('pay into my personal account',     'high',   'fraud.off-platform-payment', 'Same steer, the commonest phrasing of it.'),
('use opay',                         'medium', 'fraud.off-platform-payment', 'Naming a wallet is how a payment is moved off the platform; legitimate uses exist and a human reads it.'),
('use kuda',                         'medium', 'fraud.off-platform-payment', 'Naming a wallet is how a payment is moved off the platform; legitimate uses exist and a human reads it.'),
('use palmpay',                      'medium', 'fraud.off-platform-payment', 'Naming a wallet is how a payment is moved off the platform; legitimate uses exist and a human reads it.'),
('use moniepoint',                   'medium', 'fraud.off-platform-payment', 'Naming a wallet is how a payment is moved off the platform; legitimate uses exist and a human reads it.'),
('transfer to my momo',              'high',   'fraud.off-platform-payment', 'Mobile money to a personal handset, with no record Vallo can reach.'),
('western union',                    'high',   'fraud.off-platform-payment', 'Irreversible once collected, which is exactly why scams ask for it.'),
('moneygram',                        'high',   'fraud.off-platform-payment', 'Irreversible once collected, which is exactly why scams ask for it.'),
('send via crypto',                  'high',   'fraud.off-platform-payment', 'Irreversible and untraceable; no legitimate reason to pay rent this way.'),
('pay in usdt',                      'high',   'fraud.off-platform-payment', 'As above, named.'),
('pay in btc',                       'high',   'fraud.off-platform-payment', 'As above, named.'),
('gift card',                        'medium', 'fraud.off-platform-payment', 'Gift card payment is a scam tell; restaurants on Stays may sell them legitimately, which is why a human reads it.'),
('itunes card',                      'high',   'fraud.off-platform-payment', 'Never a legitimate way to pay for property or a stay.'),
('steam card',                       'high',   'fraud.off-platform-payment', 'Never a legitimate way to pay for property or a stay.'),

('no c of o needed',                 'high',   'fraud.title-documents', 'A certificate of occupancy is not optional; saying it is misrepresents the title.'),
('no certificate of occupancy',      'medium', 'fraud.title-documents', 'May be an honest disclosure, which is exactly why a human reads it rather than a machine refusing it.'),
('fake survey',                      'high',   'fraud.title-documents', 'A forged survey plan is document fraud.'),
('fake allocation',                  'high',   'fraud.title-documents', 'A forged allocation letter is document fraud.'),
('government acquisition free',      'high',   'fraud.title-documents', 'Land under government acquisition sold as free is the commonest Lagos land fraud.'),
('omo onile settled',                'medium', 'fraud.title-documents', 'A promise nobody can make; omo onile claims recur after any single settlement.'),
('family land no dispute guaranteed','high',   'fraud.title-documents', 'A guarantee no seller of family land is in a position to give.'),

('this offer expires today',         'medium', 'fraud.urgency-isolation', 'Manufactured urgency stops the victim checking.'),
('last chance today',                'medium', 'fraud.urgency-isolation', 'Manufactured urgency stops the victim checking.'),
('do not tell the agent',            'high',   'fraud.urgency-isolation', 'Isolating the victim from the one other party who could contradict the story.'),
('keep this between us',             'high',   'fraud.urgency-isolation', 'As above, in its plainest form.'),
('dont involve vallo',               'high',   'fraud.urgency-isolation', 'Explicitly cutting out the platform that would otherwise hold the money.'),
('outside the platform',             'medium', 'fraud.urgency-isolation', 'Off-platform steering; an honest warning uses the same words, so a human reads it.'),
('off the app',                      'medium', 'fraud.urgency-isolation', 'Off-platform steering; an honest warning uses the same words, so a human reads it.'),
('whatsapp me directly',             'medium', 'fraud.urgency-isolation', 'Moving the conversation somewhere Vallo cannot see it or evidence it.'),
('call me on whatsapp',              'medium', 'fraud.urgency-isolation', 'Moving the conversation somewhere Vallo cannot see it or evidence it.')
on conflict (term) do nothing;

-- THE ABUSE HALF. Proposal section 4 categories, English only.
-- Plurals get their own rows: `\M` is a word boundary, so `\mnigger\M` does NOT
-- match "niggers". A list that forgets that catches the singular only.

-- THE ABUSE HALF. Proposal section 4 categories, English only.
-- Plurals get their own rows: `\M` is a word boundary, so `\mnigger\M` does NOT
-- match "niggers". A list that forgets that catches the singular only.
insert into public.blocked_terms (term, severity, category, reason) values
('nigger',        'high', 'abuse.racial-ethnic', 'Racial slur with no innocent use in English.'),
('niggers',       'high', 'abuse.racial-ethnic', 'Plural of the above; the word boundary means the singular row cannot catch it.'),
('nigga',         'high', 'abuse.racial-ethnic', 'The same slur; reclaimed use is for the human queue to judge, not for this list.'),
('niggas',        'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('coon',          'high', 'abuse.racial-ethnic', 'Racial slur; no ordinary use on a property or hospitality platform.'),
('coons',         'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('chink',         'high', 'abuse.racial-ethnic', 'Anti-Chinese slur.'),
('chinks',        'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('gook',          'high', 'abuse.racial-ethnic', 'Anti-Asian slur.'),
('gooks',         'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('spic',          'high', 'abuse.racial-ethnic', 'Anti-Hispanic slur.'),
('spics',         'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('wetback',       'high', 'abuse.racial-ethnic', 'Anti-Mexican slur.'),
('wetbacks',      'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('kike',          'high', 'abuse.racial-ethnic', 'Antisemitic slur.'),
('kikes',         'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('paki',          'high', 'abuse.racial-ethnic', 'Anti-Pakistani slur in British English, which Nigerian English inherits.'),
('pakis',         'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('wog',           'high', 'abuse.racial-ethnic', 'British racial slur aimed at black and brown people.'),
('wogs',          'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('darkie',        'high', 'abuse.racial-ethnic', 'Racial slur based on skin colour.'),
('darky',         'high', 'abuse.racial-ethnic', 'Alternative spelling of the above; spellings do not share a row.'),
('sambo',         'high', 'abuse.racial-ethnic', 'Racial caricature term.'),
('raghead',       'high', 'abuse.racial-ethnic', 'Slur aimed at Muslims and South Asians by appearance.'),
('ragheads',      'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('towelhead',     'high', 'abuse.racial-ethnic', 'Slur aimed at Muslims and South Asians by appearance.'),
('towelheads',    'high', 'abuse.racial-ethnic', 'Plural of the above.'),
('jungle bunny',  'high', 'abuse.racial-ethnic', 'Racial slur; the two words are never innocent in that order.'),
('porch monkey',  'high', 'abuse.racial-ethnic', 'Racial slur; the two words are never innocent in that order.'),

('nyamiri',       'high', 'abuse.ethnic-nigeria', 'Anti-Igbo slur; ASCII, undiacritised in every written form, and with no innocent meaning in any Nigerian language.'),
('nyamiris',      'high', 'abuse.ethnic-nigeria', 'Plural of the above.'),

('blowjob',       'high', 'abuse.sexual-content', 'Explicit sexual act; no ordinary use in a listing, a review or a bio.'),
('blowjobs',      'high', 'abuse.sexual-content', 'Plural of the above.'),
('cumshot',       'high', 'abuse.sexual-content', 'Pornographic vocabulary with no other meaning.'),
('cumshots',      'high', 'abuse.sexual-content', 'Plural of the above.'),
('creampie',      'high', 'abuse.sexual-content', 'Pornographic vocabulary; the dessert is two words and will not match.'),
('gangbang',      'high', 'abuse.sexual-content', 'Explicit sexual act.'),
('gangbangs',     'high', 'abuse.sexual-content', 'Plural of the above.'),
('handjob',       'high', 'abuse.sexual-content', 'Explicit sexual act.'),
('rimjob',        'high', 'abuse.sexual-content', 'Explicit sexual act.'),
('deepthroat',    'high', 'abuse.sexual-content', 'Explicit sexual act.'),
('bukkake',       'high', 'abuse.sexual-content', 'Pornographic vocabulary with no other meaning.'),

('escort service',   'high',   'abuse.sexual-solicitation', 'Solicitation phrasing aimed at shortlet and hotel listings.'),
('escort services',  'high',   'abuse.sexual-solicitation', 'Plural of the above.'),
('call girl',        'high',   'abuse.sexual-solicitation', 'Solicitation phrasing.'),
('call girls',       'high',   'abuse.sexual-solicitation', 'Plural of the above.'),
('runs girl',        'high',   'abuse.sexual-solicitation', 'Nigerian English for transactional sex; the commonest local phrasing on a stays platform.'),
('runs girls',       'high',   'abuse.sexual-solicitation', 'Plural of the above.'),
('sex for rent',     'high',   'abuse.sexual-solicitation', 'Coercive exchange aimed directly at tenants; the harm this platform is most exposed to.'),
('rent for sex',     'high',   'abuse.sexual-solicitation', 'The same offer with the words the other way round.'),
('pay with sex',     'high',   'abuse.sexual-solicitation', 'Coercive exchange offered in place of money; the same harm as sex for rent.'),
('hookup for cash',  'high',   'abuse.sexual-solicitation', 'Solicitation phrasing.'),
('sugar daddy',      'medium', 'abuse.sexual-solicitation', 'Often a joke and sometimes solicitation, so it holds for a human rather than being treated as certain.'),
('sugar mummy',      'medium', 'abuse.sexual-solicitation', 'Often a joke and sometimes solicitation, so it holds for a human rather than being treated as certain.'),

('faggot',        'high', 'abuse.identity-slur', 'Slur; the shortened form is left out because it means a cigarette in British English.'),
('faggots',       'high', 'abuse.identity-slur', 'Plural of the above.'),
('tranny',        'high', 'abuse.identity-slur', 'Slur aimed at transgender people.'),
('trannies',      'high', 'abuse.identity-slur', 'Plural of the above.'),
('shemale',       'high', 'abuse.identity-slur', 'Slur, and pornographic vocabulary.'),
('shemales',      'high', 'abuse.identity-slur', 'Plural of the above.'),

('kafir',            'high', 'abuse.religious-hatred', 'Used as a slur against non-Muslims; the doubled spelling is excluded because of kaffir lime on the restaurant side.'),
('kafirs',           'high', 'abuse.religious-hatred', 'Plural of the above.'),
('christ killer',    'high', 'abuse.religious-hatred', 'Antisemitic phrase with no other use.'),
('christ killers',   'high', 'abuse.religious-hatred', 'Plural of the above.'),
('kill all muslims', 'high', 'abuse.religious-hatred', 'Incitement against a religious group.'),
('kill all christians','high','abuse.religious-hatred', 'Incitement against a religious group.'),
('death to muslims', 'high', 'abuse.religious-hatred', 'Incitement against a religious group.'),
('death to christians','high','abuse.religious-hatred', 'Incitement against a religious group.'),

('i will kill you',        'high', 'abuse.violence-threat', 'An explicit threat; the bare word kill stays out because it is ordinary idiom.'),
('i will kill your family','high', 'abuse.violence-threat', 'As above, aimed wider.'),
('we will kill you',       'high', 'abuse.violence-threat', 'The same threat in the plural that a group message uses.'),
('you will die today',     'high', 'abuse.violence-threat', 'An explicit threat with a deadline.'),
('i will deal with you',   'high', 'abuse.violence-threat', 'The Nigerian English threat the proposal names by category; dealing with a problem is a different sentence.'),
('i know where you live',  'high', 'abuse.violence-threat', 'A threat that is specifically dangerous on a platform that shares addresses.'),
('i will burn your house', 'high', 'abuse.violence-threat', 'An explicit threat against property and life.'),
('money ritual',           'high', 'abuse.violence-threat', 'Ritual killing reference; on a property platform it accompanies real harm.'),
('money rituals',          'high', 'abuse.violence-threat', 'Plural of the above.'),
('ritual killing',         'high', 'abuse.violence-threat', 'The same harm named directly.'),
('ritual killings',        'high', 'abuse.violence-threat', 'Plural of the above.'),
('yahoo plus',             'high', 'abuse.violence-threat', 'Nigerian term for fraud carried out with ritual killing; both halves of it are in scope.'),
('human parts for sale',   'high', 'abuse.violence-threat', 'Trafficking in body parts; zero legitimate reading.'),

('child porn',        'high', 'abuse.child-safety', 'Child sexual abuse material; nothing legitimate reads this way.'),
('child pornography', 'high', 'abuse.child-safety', 'The same thing written in full.'),
('child prostitution','high', 'abuse.child-safety', 'Child sexual exploitation.'),
('underage sex',      'high', 'abuse.child-safety', 'Child sexual abuse stated plainly.'),
('underage girls',    'high', 'abuse.child-safety', 'Solicitation of children.'),
('underage boys',     'high', 'abuse.child-safety', 'Solicitation of children.'),
('sex with a minor',  'high', 'abuse.child-safety', 'Child sexual abuse stated plainly.'),
('sex with minors',   'high', 'abuse.child-safety', 'Plural of the above.'),
('paedophile',        'high', 'abuse.child-safety', 'Held even when used as an accusation, because this category accepts the false positive and not the miss.'),
('paedophiles',       'high', 'abuse.child-safety', 'Plural of the above.'),
('pedophile',         'high', 'abuse.child-safety', 'American spelling; spellings do not share a row.'),
('pedophiles',        'high', 'abuse.child-safety', 'Plural of the above.'),
('jailbait',          'high', 'abuse.child-safety', 'Sexualises a child by definition.'),
('loli',              'high', 'abuse.child-safety', 'Shorthand for sexualised depictions of children.')
on conflict (term) do nothing;
