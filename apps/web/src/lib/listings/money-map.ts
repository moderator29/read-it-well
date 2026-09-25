import type { Dictionary } from "@vallo/i18n/core";
import type { ListingRole } from "@/lib/supply/roles";

/**
 * THE MONEY MAP: who each move-in line is actually paid to. V-46.
 *
 * The captions under the move-in lines said "Paid to the landlord" on every
 * listing, and `rent_payments.lister_id` is the listing's agent: the landlord
 * is not a user and has no row. That is a claim about the world the code
 * cannot prove, on the money line a tenant will point at in a dispute. So a
 * caption names the landlord ONLY where a record stands behind it:
 *
 *   - an OWNER-listed flat whose ownership a member of staff dated
 *     (`ownership_verified_at`): the lister is the landlord;
 *   - an AGENT or FIRM listing whose mandate a member of staff dated
 *     (`mandate_verified_at`): the money goes through the agent to the landlord.
 *
 * Everywhere else the rent and caution lines say they are paid to the lister
 * and that no landlord is on record. The fees are kept by the lister in every
 * case, because that is what the lister charges them for.
 *
 * What this does NOT say, deliberately: that the whole sum reaches the
 * lister's Vallo account. Until the rent-charge settlement (audit V-33) pays
 * the lister at the moment of charge, that sentence would be false.
 *
 * Pure, so the rule "no caption says landlord without a dated record" is a
 * test, not a hope.
 */

export type PayeeContext = {
  listerRole?: ListingRole;
  /** The lister's public display name, when there is one. */
  listerName?: string;
  mandateVerified: boolean;
  ownershipVerified: boolean;
};

export type MoneyMapCopy = Dictionary["afterTheGate"]["moneyMap"];

export function landlordOnRecord(ctx: PayeeContext): "owner" | "mandate" | null {
  if (ctx.listerRole === "owner" && ctx.ownershipVerified) return "owner";
  if ((ctx.listerRole === "agent" || ctx.listerRole === "firm") && ctx.mandateVerified) return "mandate";
  return null;
}

function nameOf(ctx: PayeeContext, copy: MoneyMapCopy): string {
  const name = ctx.listerName?.trim();
  if (name) return name;
  return ctx.listerRole === "agent" || ctx.listerRole === "firm" ? copy.theAgent : copy.theLister;
}

/** The caption under one move-in line, by its key. Undefined for an unknown key. */
export function payeeCaption(key: string, ctx: PayeeContext, copy: MoneyMapCopy): string | undefined {
  const record = landlordOnRecord(ctx);
  const name = nameOf(ctx, copy);
  switch (key) {
    case "rent":
    case "caution": {
      const who =
        record === "owner"
          ? copy.toLandlord
          : record === "mandate"
            ? copy.throughToLandlord.replace("{name}", name)
            : copy.toListerNoLandlord.replace("{name}", name);
      return key === "caution" ? `${who} ${copy.cautionOwed}` : who;
    }
    case "agency":
    case "legal":
    case "agreement":
      return copy.keptBy.replace("{name}", name);
    case "service":
      return copy.forEstate.replace("{name}", name);
    default:
      return undefined;
  }
}
