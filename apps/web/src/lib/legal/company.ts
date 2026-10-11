/**
 * Who the controller actually is, in one place, because it appears in two
 * legal documents and must never differ between them.
 *
 * Until 14 September 2026 the privacy notice and the terms both named
 * **RentMe**. RentMe is a dead working name and was never a legal person: it
 * had no registered office, no RC number and nobody who could be served. A
 * privacy notice that misidentifies the controller is a defective notice under
 * the Nigeria Data Protection Act 2023, and the controller's identity is the
 * first thing an NDPC auditor reads. The operator of this platform is
 * **VALLO SPACES LTD**, a private company limited by shares registered under
 * CAMA 2020, and the product it operates is called **Vallo**.
 *
 * THE THREE NAMES ARE NOT INTERCHANGEABLE.
 *
 *   VALLO SPACES LTD  the legal person. Contracts, this notice, the terms,
 *                     invoices, the bank. Never in product UI
 *   Vallo             the product. Every user-facing string, the app stores,
 *                     the domain. Never as the contracting party
 *   RentMe, NaijaFinds  dead. Nowhere, in anything new
 *
 * WHY SOME OF THESE ARE NULL. Three of the particulars the Act wants do not
 * exist yet: the RC number is with the Corporate Affairs Commission, the NDPC
 * registration has not been filed, and the live Vallo domain is not set on
 * this deployment. The honest thing is to omit a fact we do not have rather
 * than print a placeholder that reads as real, so each is null here and every
 * reader below drops its clause when the value is missing. Fill them in and
 * both documents correct themselves with no other edit anywhere, which is the
 * whole reason this is one module and not a dozen string literals.
 */

/** The registered name. Only ever this, exactly, in a legal document. */
export const COMPANY_LEGAL_NAME = "VALLO SPACES LTD";

/** The product name. Only ever this in a sentence a user reads. */
export const COMPANY_TRADING_NAME = "Vallo";

/**
 * The registered office as filed with the Commission on 14 September 2026.
 * A data subject has the right to know where the controller can be reached,
 * and this is the address that is on the file at the CAC.
 */
export const COMPANY_REGISTERED_OFFICE =
  "Plot 5, Zone 6, Dutse Alhaji, Bwari Area Council, Federal Capital Territory, Abuja";

/**
 * The RC number.
 *
 * **ISSUED. The company has been incorporated since 18 September 2026 and the
 * number is RC 9870413**, given by the founder on 22 September. The
 * application had gone in on 14 September under CAC application ID 12485150
 * and this value stood at null for the four days in between, which was the
 * correct value for those four days.
 *
 * The instruction that stood here, not to type a number that has not been read
 * off the certificate, was right and is kept in spirit: this one came from the
 * founder, who holds the certificate, rather than from a guess or from a
 * search result. It is a FACT, not a decision, which is why it lands without
 * waiting for anything else.
 *
 * One edit, and it reaches both legal documents and the email footer through
 * `COMPANY_FORMAL_NAME` below. `shell.test.ts` asserts the legal line, so a
 * future edit that drops it goes red.
 */
export const COMPANY_RC_NUMBER: string | null = "9870413";

/**
 * The NDPC registration number, once registered.
 *
 * **Null is the correct value today.** Vallo is a data controller of major
 * importance, which follows from the volume and sensitivity of what agent
 * verification collects, so registration is required before Launch rather than
 * optional. It has not been filed. Until it is, the notice says nothing about
 * it, which is better than implying a registration that does not exist.
 */
export const COMPANY_NDPC_REGISTRATION: string | null = null;

/**
 * The Data Protection Officer, when one is appointed. Null until then.
 *
 * An earlier session wrote the founder in as Data Protection Officer without
 * his say. He is the co-founder and CEO, not the DPO (founder, 9 October
 * 2026), so nobody is named. Privacy requests still have a real channel (the
 * contact form, Privacy as the subject), and the notice says who handles them
 * without naming a person. Set this to the appointed officer's name once the
 * company appoints one (an in-house DPO or a licensed DPCO).
 */
export const DATA_PROTECTION_OFFICER: string | null = null;

/**
 * The host a reader sees written in the notice, when the deployment knows it.
 *
 * Derived rather than hardcoded on purpose. A literal in a legal file is how
 * `rentme.ng` survived a rename and ended up in a document that named the
 * wrong controller. Reading it from the deployment means the notice can never
 * name a domain the platform is not actually served from, and null means no
 * domain is claimed at all.
 */
export const COMPANY_DOMAIN: string | null = (() => {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (configured.length === 0) return null;
  try {
    const { hostname } = new URL(configured);
    // A local dev host is not a fact about the company. Say nothing instead.
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname) ? null : hostname;
  } catch {
    return null;
  }
})();

/**
 * "VALLO SPACES LTD (RC 1234567)" once there is an RC number, and just the
 * name until then. Every place that identifies the controller formally uses
 * this, so the RC number lands in both documents from the single edit above.
 */
export const COMPANY_FORMAL_NAME: string = COMPANY_RC_NUMBER
  ? `${COMPANY_LEGAL_NAME} (RC ${COMPANY_RC_NUMBER})`
  : COMPANY_LEGAL_NAME;
