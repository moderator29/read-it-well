/** The document slots the wizard offers, and which of them are compulsory. */
export const DOCUMENT_KINDS = ["idFront", "idBack", "registration"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/**
 * The wizard's slot names are not the database's document kinds. The CHECK
 * `agent_documents_kind_known` accepts only the reviewer's vocabulary, so
 * every row written under a slot name was refused and no document from this
 * form ever reached a reviewer. Both sides of an ID card are one identity
 * document to a reviewer; the company registration is the business document.
 */
export const STORED_DOCUMENT_KIND: Record<DocumentKind, "identity" | "business"> = {
  idFront: "identity",
  idBack: "identity",
  registration: "business",
};
