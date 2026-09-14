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
 * The RC number, once the certificate is issued.
 *
 * **Null is the correct value today.** The application went in on 14 September
 * 2026 under CAC application ID 12485150 and approval takes one to three
 * working days. Do not type a number in here that has not been read off the
 * certificate.
 */
export const COMPANY_RC_NUMBER: string | null = null;

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
 * The Data Protection Officer, named and reachable.
 *
 * The Act wants a contact point a person can actually address, not a role
 * title. The founder holds it personally until somebody is appointed, and that
 * is a disclosed arrangement rather than a gap: a named human who reads the
 * channel beats a `dpo@` alias with no mailbox behind it, which is the mistake
 * this codebase already made once with `support@rentme.ng`.
 */
export const DATA_PROTECTION_OFFICER = "Omojuni Oluwaseyifunmi Ebenezer";

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
