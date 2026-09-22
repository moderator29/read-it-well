/**
 * Host onboarding, as a model rather than as ten screens.
 *
 * The twin of components/verification/kyc.ts, for the same reason: the flow
 * branches. A restaurant answers a service-and-seating step that a hotel
 * never sees, a CAC-registered business answers a registration step an
 * individual never sees, so "step 4 of 9" is not a constant. Everything
 * about which steps exist, in what order, and what is still missing lives
 * here, pure, and the screens render it.
 *
 * WHAT THIS FILE KNOWS THAT kyc.ts DID NOT: where it is stored. The
 * businesses row is the application (docs/research/HOST_ONBOARDING_RESEARCH.md
 * section 3.2), created as DRAFT at step two and written onto under owner
 * RLS by lib/host/actions.ts. `HostDraft` is the read-back of that row and
 * its children, shaped for `missingFrom`, and `missingFrom` is the one
 * function that decides whether the review step may submit. It returns the
 * list rather than a boolean so the review screen can PRINT what is absent.
 *
 * Client-safe: imports nothing server-only, so the wizard and the server
 * action read the same rules.
 */

import type { Database } from "../supabase/database.types";

export type BusinessKind = Database["public"]["Enums"]["business_kind"];

/* -------------------------------------------------------------- host types */

/** The three shapes a host can be. Decides everything after step one. */
export type HostType = "individual" | "business" | "restaurant";

export const HOST_TYPES: readonly HostType[] = ["individual", "business", "restaurant"] as const;

export type HostTypeDefinition = {
  id: HostType;
  title: string;
  /** Who this is for, in one sentence somebody can recognise themselves in. */
  meaning: string;
  /** The business kinds this branch may pick from at step one. */
  kinds: readonly BusinessKind[];
};

export const HOST_TYPE_DEFINITIONS: Record<HostType, HostTypeDefinition> = {
  individual: {
    id: "individual",
    title: "I let a place I own",
    meaning: "A shortlet, a guest house or a few serviced apartments, in your own name.",
    kinds: ["shortlet_operator", "guest_house", "serviced_apartments"],
  },
  business: {
    id: "business",
    title: "I run a registered hospitality business",
    meaning: "A hotel, resort or apartment operator registered with the CAC.",
    kinds: ["hotel", "serviced_apartments", "guest_house", "resort", "shortlet_operator"],
  },
  restaurant: {
    id: "restaurant",
    title: "I run a restaurant",
    meaning: "A venue that takes table reservations.",
    kinds: ["restaurant"],
  },
};

/** True when the branch has rooms and rates, false when it has tables and windows. */
export function hostsAccommodation(hostType: HostType): boolean {
  return hostType !== "restaurant";
}

/* -------------------------------------------------------------- documents */

/**
 * The bucket's own limits, stated once and rendered inline under every
 * uploader. Identical to storage.buckets 'host-documents' (M14).
 */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;
export const ACCEPTED_LABEL = "JPG, PNG, WEBP, HEIC or PDF";
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_FILE_LABEL = "8MB";

/** Mirrors the CHECK on business_documents.kind. */
export type HostDocumentKind = "identity" | "registration" | "association" | "licence" | "hygiene";

export const HOST_DOCUMENT_KINDS: readonly HostDocumentKind[] = [
  "identity",
  "registration",
  "association",
  "licence",
  "hygiene",
] as const;

export type DocumentSpec = {
  kind: HostDocumentKind;
  title: string;
  /** What actually qualifies. Named documents, not a category noun. */
  qualifies: string;
  /** The one thing people get wrong about this document. */
  caution: string;
};

export const DOCUMENT_SPECS: Record<HostDocumentKind, DocumentSpec> = {
  identity: {
    kind: "identity",
    title: "Government issued ID of the representative",
    qualifies:
      "An international passport, a driver's licence, a NIN slip or card, or a permanent voter's card.",
    caution: "All four corners in frame, and the photograph and the numbers readable.",
  },
  registration: {
    kind: "registration",
    title: "CAC certificate",
    qualifies: "The certificate of incorporation or business name registration, as the CAC issued it.",
    caution: "The RC or BN number on it must match the one you typed.",
  },
  association: {
    kind: "association",
    title: "Proof you act for the business",
    qualifies:
      "A letter of authorisation on the business's letterhead, or your employment ID. Not needed if you are named on the CAC record.",
    caution: "It must name you and the business, and be signed.",
  },
  licence: {
    kind: "licence",
    title: "State hospitality licence",
    qualifies: "The current licence or registration from your state's tourism or hospitality body.",
    caution: "Optional. It renders on your page as a dated fact, not as a badge.",
  },
  hygiene: {
    kind: "hygiene",
    title: "Health permit",
    qualifies: "The current Local Government health permit for the venue.",
    caution: "Optional alongside the attestation. It renders as a dated fact, not as a badge.",
  },
};

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

/**
 * Loose on purpose, and identical to the CHECK on businesses.cac_number: RC,
 * BN or IT prefix, optional space or hyphen, four to ten digits, any case.
 * Verification is a rung a human records, not a regex.
 */
export const CAC_NUMBER_RE = /^(RC|BN|IT)?\s?-?\d{4,10}$/i;

/* ------------------------------------------------------------------ steps */

export type HostStepId =
  | "host-type"
  | "business"
  | "registration"
  | "representative"
  | "property"
  | "rooms"
  | "service"
  | "payout"
  | "consent"
  | "review";

export type HostStep = {
  id: HostStepId;
  /** The heading, which is also the one task this step asks for. */
  title: string;
  /** The sentence under it. One task per step means one sentence. */
  hint: string;
};

const STEPS: Record<HostStepId, HostStep> = {
  "host-type": {
    id: "host-type",
    title: "What kind of host are you?",
    hint: "This decides which steps you see, and nothing else.",
  },
  business: {
    id: "business",
    title: "Your business, named and placed",
    hint: "Three short groups: what it is called, how to reach it, and where it sits.",
  },
  registration: {
    id: "registration",
    title: "Registration papers",
    hint: "The name as the CAC holds it, the RC or BN number, and the certificate.",
  },
  representative: {
    id: "representative",
    title: "You, the representative",
    hint: "One government issued ID, your name and your phone.",
  },
  property: {
    id: "property",
    title: "The property",
    hint: "Name, check-in and check-out times, house rules, photos, and the pin on the map.",
  },
  rooms: {
    id: "rooms",
    title: "Rooms and rates",
    hint: "At least one room type with a nightly rate and a cancellation policy.",
  },
  service: {
    id: "service",
    title: "Service and seating",
    hint: "Cuisines, a price band, and at least one service window with covers.",
  },
  payout: {
    id: "payout",
    title: "Getting paid",
    hint: "A bank account, confirmed with the bank before it is saved.",
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
 * The steps THIS host will actually see.
 *
 * `hostType` is null until they have answered the first question. While it is
 * null the branch steps are not in the list, so the progress line never
 * promises a shorter flow than they are going to get and never pads the count
 * with a step somebody is not going to be asked.
 */
export function stepsFor(hostType: HostType | null): HostStep[] {
  const ids: HostStepId[] = ["host-type", "business"];
  if (hostType === "business") ids.push("registration");
  if (hostType !== null) ids.push("representative");
  if (hostType === "individual" || hostType === "business") ids.push("property", "rooms");
  if (hostType === "restaurant") ids.push("service");
  ids.push("payout", "consent", "review");
  return ids.map((id) => STEPS[id]);
}

/** "Step 4 of 9". One place, so no screen can print its own arithmetic. */
export function progressLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}

/* --------------------------------------------------------------- business */

export type BusinessField = {
  name: string;
  label: string;
  /** Placed under the input, not inside it. A placeholder is not a label. */
  hint?: string;
  optional?: boolean;
  type?: "text" | "tel" | "email" | "textarea";
};

export type BusinessSection = {
  heading: string;
  note: string;
  fields: BusinessField[];
};

/** Three headed groups, never a stack of boxes. The kyc.ts argument applies. */
export const BUSINESS_SECTIONS: readonly BusinessSection[] = [
  {
    heading: "Identity",
    note: "What the business is called and how you describe it to a guest.",
    fields: [
      { name: "name", label: "Business name" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        optional: true,
        hint: "A few sentences a guest would read on your page.",
      },
    ],
  },
  {
    heading: "Contact",
    note: "How a guest, and how we, reach the business.",
    fields: [
      { name: "phone", label: "Business phone", type: "tel" },
      { name: "email", label: "Business email", type: "email", optional: true },
    ],
  },
  {
    heading: "Address",
    note: "Where the business actually operates from.",
    fields: [
      { name: "address", label: "Street address" },
      { name: "area", label: "Area or neighbourhood", optional: true },
      { name: "city", label: "City or town" },
      { name: "stateCode", label: "State" },
    ],
  },
] as const;

/* ----------------------------------------------------------------- consent */

export type ConsentId = "accuracy" | "terms" | "processing";

export type Consent = {
  id: ConsentId;
  label: string;
  detail: string;
};

/**
 * THREE CHECKBOXES, NOT ONE. A statement of fact about the documents,
 * acceptance of a contract, and NDPA-specific permission to process identity
 * data through third-party checks. Under the Nigeria Data Protection Act the
 * last has to be freely given and specific; bundling it makes it neither.
 * Stored as three timestamps in businesses.consents, keyed by id.
 */
export const CONSENTS: readonly Consent[] = [
  {
    id: "accuracy",
    label: "The documents I have uploaded are genuine and the details are accurate",
    detail:
      "Submitting a document that belongs to somebody else, or that has been altered, ends the account and is reported.",
  },
  {
    id: "terms",
    label: "I accept the host terms of service and the privacy policy",
    detail: "Both open in a new tab and neither has changed for this form.",
  },
  {
    id: "processing",
    label: "Vallo may process my details for identity and fraud checks",
    detail:
      "Your name, document numbers and business registration are checked against identity, business and sanctions records through a processor. Your documents are not sold, and not used for anything else.",
  },
] as const;

/* ------------------------------------------------------------------- draft */

/**
 * The application as read back from the database, shaped for `missingFrom`.
 * Counts rather than rows for the children, because the review step needs to
 * know that at least one exists, not what it says.
 */
export type HostDraft = {
  businessId: string | null;
  status: Database["public"]["Enums"]["listing_status"] | null;
  hostType: HostType | null;
  kind: BusinessKind | null;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  city: string;
  stateCode: string;
  registeredName: string;
  cacNumber: string;
  tin: string;
  representativeName: string;
  representativePhone: string;
  /** Which document kinds have at least one file on record. */
  documents: Partial<Record<HostDocumentKind, true>>;
  accommodation: {
    id: string;
    name: string;
    hasPin: boolean;
    /**
     * The photographs on record, cover first, rather than a count of them.
     *
     * A COUNT WAS ALL THIS CARRIED WHILE THERE WAS NOWHERE TO UPLOAD ONE. The
     * wizard could only say how many existed and then tell the host that
     * property photographs arrived "with the next host release", while
     * `missingFrom` below refused to submit without one. Now that the property
     * step manages them, it needs the rows themselves to draw them.
     */
    photos: { id: string; url: string }[];
  } | null;
  roomTypeCount: number;
  ratePlanCount: number;
  restaurant: {
    priceBand: number | null;
    cuisineCount: number;
  } | null;
  serviceWindowCount: number;
  hygieneAttestedAt: string | null;
  licenceAttestedAt: string | null;
  hasBankAccount: boolean;
  /** ISO instants keyed by consent id; an absent key is a consent not given. */
  consents: Partial<Record<ConsentId, string>>;
};

/** A draft with nothing in it, for a host who has not started. */
export function emptyHostDraft(): HostDraft {
  return {
    businessId: null,
    status: null,
    hostType: null,
    kind: null,
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    city: "",
    stateCode: "",
    registeredName: "",
    cacNumber: "",
    tin: "",
    representativeName: "",
    representativePhone: "",
    documents: {},
    accommodation: null,
    roomTypeCount: 0,
    ratePlanCount: 0,
    restaurant: null,
    serviceWindowCount: 0,
    hygieneAttestedAt: null,
    licenceAttestedAt: null,
    hasBankAccount: false,
    consents: {},
  };
}

/**
 * Whether the review step may submit at all, and if not, what is missing.
 *
 * The blocking list of docs/research/HOST_ONBOARDING_RESEARCH.md section 3.3,
 * verbatim: identity document present, the business complete, the CAC number
 * entered for the business branch, one bookable unit, photos and the pin, a
 * resolved bank account, and the three consents. Everything else (the CAC
 * actually verified, the payout name match, licences) is a post-live rung or
 * a dated fact and never blocks the shelf.
 */
export function missingFrom(draft: HostDraft): string[] {
  const missing: string[] = [];
  const blank = (value: string) => value.trim().length === 0;

  if (!draft.hostType) {
    missing.push("What kind of host you are");
    return missing;
  }
  if (!draft.kind) missing.push("The kind of business");

  for (const section of BUSINESS_SECTIONS) {
    for (const field of section.fields) {
      if (field.optional) continue;
      const value = draft[field.name as keyof HostDraft];
      if (typeof value === "string" && blank(value)) missing.push(field.label);
    }
  }

  if (draft.hostType === "business") {
    if (blank(draft.registeredName)) missing.push("Registered business name");
    if (blank(draft.cacNumber)) missing.push("CAC registration number");
    if (!draft.documents.registration) missing.push(DOCUMENT_SPECS.registration.title);
  }

  if (blank(draft.representativeName)) missing.push("Your full name");
  if (blank(draft.representativePhone)) missing.push("Your phone number");
  if (!draft.documents.identity) missing.push(DOCUMENT_SPECS.identity.title);

  if (hostsAccommodation(draft.hostType)) {
    if (!draft.accommodation) {
      missing.push("The property");
    } else {
      if (draft.accommodation.photos.length === 0) missing.push("At least one photo of the property");
      if (!draft.accommodation.hasPin) missing.push("The pin on the map");
    }
    if (draft.roomTypeCount === 0) missing.push("At least one room type");
    if (draft.ratePlanCount === 0) missing.push("A rate with a cancellation policy");
  } else {
    if (!draft.restaurant || draft.restaurant.priceBand === null) missing.push("A price band");
    if (draft.serviceWindowCount === 0) missing.push("At least one service window");
    if (!draft.hygieneAttestedAt) missing.push("The health permit attestation");
  }

  if (!draft.hasBankAccount) missing.push("A bank account for payouts");

  for (const consent of CONSENTS) {
    if (!draft.consents[consent.id]) missing.push(consent.label);
  }

  return missing;
}

/* -------------------------------------------------------------- documents */

/**
 * Whether an uploaded path belongs to this person's own folder in the
 * host-documents bucket. Storage RLS enforces the same rule on the upload,
 * so a path that fails here was never written by this user and has no
 * business being recorded against their application.
 */
export function documentPathBelongsTo(userId: string, storagePath: string): boolean {
  return storagePath.length > 0 && storagePath.length <= 400 && storagePath.startsWith(`${userId}/`);
}
