/**
 * Identity verification, as a model rather than as six screens.
 *
 * The flow branches, which is the only genuinely hard thing about it: somebody
 * who runs a property business answers one more step than somebody who does
 * not, so "step 4 of 6" is not a constant and cannot be hardcoded into the
 * header of each screen. Everything about which steps exist, which one is
 * showing, and what the progress line says therefore lives here, pure, and the
 * components render it.
 *
 * WHERE IT IS STORED is not this file's business either: `DocumentUploader`
 * puts each file in the private `agent-documents` bucket under the person's
 * own folder, and `submitVerification` (app/(app)/verification/actions.ts)
 * files the `agent_documents` rows and the `kyc_consents` receipts. The
 * checks here run on both sides, so the phone and the server never disagree
 * about what is missing.
 *
 * ---------------------------------------------------------------------------
 * WHY THE BUSINESS STEP IS GROUPED AND THE REFERENCE PLATFORM'S IS NOT.
 *
 * The platform we were shown asks for eight business fields as eight identical
 * outlined boxes in one vertical stack, with no headings between them. It is
 * the weakest screen in their product and it fails for a specific reason: a
 * flat stack gives a reader no way to estimate how much is left, no way to tell
 * which fields belong together, and no way to resume after being interrupted
 * except by reading every label again from the top.
 *
 * `BUSINESS_SECTIONS` below is the fix, and it is three headings rather than a
 * redesign: what the business IS, how to REACH it, and where it SITS. Three
 * groups of two to four fields each read as three small tasks. Eight boxes read
 * as a form.
 */

/* -------------------------------------------------------------- documents */

/**
 * The accepted file types and the size ceiling, stated once.
 *
 * These strings are rendered INLINE UNDER EVERY UPLOADER rather than kept as a
 * validation rule nobody sees. An upload control that only mentions its limits
 * inside the error it shows after a failed 8MB upload on Nigerian mobile data
 * has spent somebody's money to tell them something it knew beforehand.
 */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;
export const ACCEPTED_LABEL = "JPG, PNG, HEIC or PDF";
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_LABEL = "8MB";

export type DocumentKind = "identity" | "address";

export type DocumentSpec = {
  kind: DocumentKind;
  title: string;
  /** What actually qualifies. Named documents, not a category noun. */
  qualifies: string;
  /** The one thing people get wrong about this document. */
  caution: string;
};

export const DOCUMENT_SPECS: Record<DocumentKind, DocumentSpec> = {
  identity: {
    kind: "identity",
    title: "Government issued ID",
    qualifies:
      "An international passport, a driver's licence, a NIN slip or card, or a permanent voter's card.",
    caution: "All four corners in frame, and the photograph and the numbers readable.",
  },
  address: {
    kind: "address",
    title: "Proof of address",
    qualifies:
      "A utility bill, a bank statement, or a tenancy agreement showing your name and the address.",
    caution: "It must be dated within the last three months. Anything older is refused.",
  },
};

/**
 * WHICH document it is. The review desk records the subtype on the rung, and
 * a reviewer holding a photograph cannot always tell a NIN slip from a voter's
 * card at a glance. The values are the database's `document_subtype` labels.
 */
export const DOCUMENT_SUBTYPES: Record<DocumentKind, readonly { value: string; label: string }[]> = {
  identity: [
    { value: "passport", label: "International passport" },
    { value: "drivers_licence", label: "Driver's licence" },
    { value: "nin_card", label: "NIN slip or card" },
    { value: "voters_card", label: "Permanent voter's card" },
  ],
  address: [
    { value: "utility_bill", label: "Utility bill" },
    { value: "bank_statement", label: "Bank statement" },
    { value: "tenancy_agreement", label: "Tenancy agreement" },
  ],
};

export function isSubtypeOf(kind: DocumentKind, subtype: string | null | undefined): boolean {
  return DOCUMENT_SUBTYPES[kind].some((option) => option.value === subtype);
}

/** How old a proof of address may be, the same three months the caution states. */
export const ADDRESS_MAX_AGE_DAYS = 92;

/**
 * Why an address document's date will be refused, or null. `today` is an
 * ISO date so the check is the same on the phone and on the server.
 */
export function addressDateProblem(issuedOn: string | null | undefined, today: string): string | null {
  if (!issuedOn || !/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) return "Enter the date printed on the document.";
  const issued = Date.parse(`${issuedOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(issued)) return "Enter the date printed on the document.";
  if (issued > now) return "That date is in the future. Enter the date printed on the document.";
  if (now - issued > ADDRESS_MAX_AGE_DAYS * 86_400_000) {
    return "That document is more than three months old, so it would be refused. Use a more recent one.";
  }
  return null;
}

/** Today in Lagos, as the ISO date both sides compare against. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

/** Why a chosen file cannot be used, in words, before anything is uploaded. */
export function rejectFile(file: { type: string; size: number }): string | null {
  if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return `That file is not ${ACCEPTED_LABEL}. Choose one of those instead.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `That file is over ${MAX_FILE_LABEL}. Photograph the document again at a lower resolution, or use a PDF.`;
  }
  return null;
}

/* ------------------------------------------------------------------ steps */

export type StepId =
  | "identity-document"
  | "address-document"
  | "business-question"
  | "business-details"
  | "consent"
  | "review";

export type Step = {
  id: StepId;
  /** The heading, which is also the one task this step asks for. */
  title: string;
  /** The sentence under it. One task per step means one sentence. */
  hint: string;
};

const STEPS: Record<StepId, Step> = {
  "identity-document": {
    id: "identity-document",
    title: "Your ID",
    hint: "One government issued document that shows your face and your name.",
  },
  "address-document": {
    id: "address-document",
    title: "Where you live",
    hint: "One recent document that shows your name at your address.",
  },
  "business-question": {
    id: "business-question",
    title: "Do you run a property business?",
    hint: "This decides whether we ask you for business details, and nothing else.",
  },
  "business-details": {
    id: "business-details",
    title: "Your business",
    hint: "Three short groups: what it is, how to reach it, and where it sits.",
  },
  consent: {
    id: "consent",
    title: "Permissions",
    hint: "Three separate agreements. Each one is its own decision.",
  },
  review: {
    id: "review",
    title: "Check and send",
    hint: "Nothing is submitted until you press the button on this screen.",
  },
};

/**
 * The steps THIS person will actually see.
 *
 * `business` is the answer to the branching question, and it is `null` until
 * they have answered it. While it is null the business details step is not in
 * the list, so the progress line reads "of 5" and grows to "of 6" the moment
 * they say yes. That is honest either way: it never promises a shorter flow
 * than they are going to get, and it never pads the count with a step somebody
 * is not going to be asked.
 */
export function stepsFor(business: boolean | null): Step[] {
  const ids: StepId[] = ["identity-document", "address-document", "business-question"];
  if (business === true) ids.push("business-details");
  ids.push("consent", "review");
  return ids.map((id) => STEPS[id]);
}

/** "Step 4 of 6". One place, so no screen can print its own arithmetic. */
export function progressLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

/* ---------------------------------------------------------------- business */

export type BusinessField = {
  name: string;
  label: string;
  /** Placed under the input, not inside it. A placeholder is not a label. */
  hint?: string;
  optional?: boolean;
  type?: "text" | "tel" | "email" | "url";
};

export type BusinessSection = {
  /** The heading that turns a stack of boxes into a task. */
  heading: string;
  /** Why these fields are together, in one line. */
  note: string;
  fields: BusinessField[];
};

export const BUSINESS_SECTIONS: readonly BusinessSection[] = [
  {
    heading: "Business identity",
    note: "What the business is called and how it is registered.",
    fields: [
      { name: "businessName", label: "Registered business name" },
      {
        name: "rcNumber",
        label: "CAC registration number",
        hint: "The RC or BN number on your certificate.",
      },
      {
        name: "tin",
        label: "Tax identification number",
        optional: true,
        hint: "If you have one. It is not required to be approved.",
      },
    ],
  },
  {
    heading: "Contact",
    note: "How a client, and how we, reach the business.",
    fields: [
      { name: "businessPhone", label: "Business phone", type: "tel" },
      { name: "businessEmail", label: "Business email", type: "email" },
      { name: "website", label: "Website or social page", type: "url", optional: true },
    ],
  },
  {
    heading: "Address",
    note: "Where the business actually operates from.",
    fields: [
      { name: "street", label: "Street address" },
      { name: "city", label: "City or town" },
      { name: "state", label: "State" },
    ],
  },
] as const;

/* ----------------------------------------------------------------- consent */

export type ConsentId = "accuracy" | "terms" | "processing";

export type Consent = {
  id: ConsentId;
  label: string;
  /** What they are actually agreeing to, in full, under the label. */
  detail: string;
};

/**
 * THREE CHECKBOXES, NOT ONE.
 *
 * A single "I agree to everything" tick is convenient and it is not consent.
 * These are three genuinely different things - a statement of fact about the
 * documents, acceptance of a contract, and permission to process biometric-
 * adjacent personal data through third-party identity and fraud checks - and
 * under the Nigeria Data Protection Act the last of those has to be freely
 * given and specific. Bundling it with the terms makes it neither.
 */
export const CONSENTS: readonly Consent[] = [
  {
    id: "accuracy",
    label: "The documents I have uploaded are mine and are accurate",
    detail:
      "Submitting a document that belongs to somebody else, or that has been altered, ends the account and is reported.",
  },
  {
    id: "terms",
    label: "I accept the terms of service and the privacy policy",
    detail: "Both open in a new tab and neither has changed for this form.",
  },
  {
    id: "processing",
    label: "Vallo may process my details for identity and fraud checks",
    detail:
      "A person at Vallo checks your name, date of birth and document numbers against the documents you upload. Your documents are not sold, and not used for anything else.",
  },
] as const;

/* -------------------------------------------------------------- submission */

/**
 * One document as the flow holds it: already uploaded to the private
 * document store under the person's own folder, so `path` is real, plus the
 * two answers the reviewer needs about it.
 */
export type KycDocument = {
  name: string;
  size: number;
  type: string;
  path: string;
  subtype: string | null;
  /** The date printed on a proof of address. Null for an ID. */
  issuedOn: string | null;
};

/** What the UI produces, and what `submitVerification` files. */
export type KycSubmission = {
  documents: Partial<Record<DocumentKind, KycDocument>>;
  business: boolean;
  businessDetails: Record<string, string>;
  consents: ConsentId[];
};

export type KycSubmitResult = { ok: true } | { ok: false; message: string };

/**
 * Whether the review step may submit at all, and if not, what is missing.
 *
 * Returns the list rather than a boolean so the review screen can PRINT it.
 * "Complete all required fields" is the least useful sentence in software.
 */
export function missingFrom(submission: KycSubmission, today: string = lagosToday()): string[] {
  const missing: string[] = [];
  const identity = submission.documents.identity;
  const address = submission.documents.address;
  if (!identity) missing.push(DOCUMENT_SPECS.identity.title);
  else if (!isSubtypeOf("identity", identity.subtype)) missing.push(WHICH_ID);
  if (!address) missing.push(DOCUMENT_SPECS.address.title);
  else {
    if (!isSubtypeOf("address", address.subtype)) missing.push(WHICH_ADDRESS);
    if (addressDateProblem(address.issuedOn, today)) missing.push(ADDRESS_DATE);
  }

  if (submission.business) {
    for (const section of BUSINESS_SECTIONS) {
      for (const field of section.fields) {
        if (field.optional) continue;
        if (!(submission.businessDetails[field.name] ?? "").trim()) missing.push(field.label);
      }
    }
  }

  for (const consent of CONSENTS) {
    if (!submission.consents.includes(consent.id)) missing.push(consent.label);
  }

  return missing;
}

const WHICH_ID = "Which ID you uploaded";
const WHICH_ADDRESS = "Which proof of address you uploaded";
const ADDRESS_DATE = "The date on your proof of address, within the last three months";
