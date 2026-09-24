import type { DraftInput } from "./listings-schema";
import type { WizardDraft } from "./listings-queries";

/**
 * V-29: "LIST ANOTHER LIKE THIS", AS A PURE MAPPING.
 *
 * A Lagos agent with three flats in one compound typed the same wizard three
 * times; a developer with twelve identical units in a Lekki block typed it
 * twelve. This turns one of the lister's own listings into the input for a new
 * DRAFT with every fact, fee and utility answer copied, and nothing that must
 * belong to the new unit alone:
 *
 *   NOT COPIED   the id and status (the copy is a new DRAFT and goes through
 *                review like any other), the listing code (issued at publish),
 *                review notes, photographs and walkthroughs (each unit is
 *                photographed as itself; a photo of flat 2 on flat 3's listing
 *                is the stolen-photo problem V-45 exists to catch), and any
 *                mandate (each unit needs its own or a shared one, V-37).
 *   COPIED       every fact, fee, utility answer and the gate details, which
 *                are the same gate for every unit in a compound.
 *
 * The wizard's own `saveDraft` then validates the copy exactly as if it had
 * been typed, so a copy can never carry anything a typed draft could not.
 */

export const MAX_COPIES = 20;

/** A copy count as asked for, clamped to one to twenty. */
export function copiesAsked(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_COPIES, Math.max(1, Math.trunc(n)));
}

const blank = (value: string): string | undefined => (value === "" ? undefined : value);

export function draftInputFrom(draft: WizardDraft): DraftInput {
  return {
    title: draft.title,
    description: blank(draft.description),
    propertyType: draft.propertyType ?? undefined,
    stateCode: blank(draft.stateCode),
    city: blank(draft.city),
    area: blank(draft.area),
    address: blank(draft.address),
    landmark: blank(draft.landmark),
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    toilets: blank(draft.toilets),
    parkingSpaces: blank(draft.parkingSpaces),
    floor: blank(draft.floor),
    totalFloors: blank(draft.totalFloors),
    sizeSqm: blank(draft.sizeSqm),
    intent: draft.intent,
    rentNaira: blank(draft.rentNaira),
    rentPeriod: draft.rentPeriod === "" ? undefined : draft.rentPeriod,
    rentNegotiable: draft.rentNegotiable,
    cautionDepositNaira: blank(draft.cautionDepositNaira),
    serviceChargeNaira: blank(draft.serviceChargeNaira),
    serviceChargePeriod: draft.serviceChargePeriod === "" ? undefined : draft.serviceChargePeriod,
    agencyFeeNaira: blank(draft.agencyFeeNaira),
    legalFeeNaira: blank(draft.legalFeeNaira),
    agreementFeeNaira: blank(draft.agreementFeeNaira),
    totalMoveInNaira: blank(draft.totalMoveInNaira),
    minimumTenancyMonths: blank(draft.minimumTenancyMonths),
    availableFrom: blank(draft.availableFrom),
    furnished: draft.furnished === "" ? undefined : draft.furnished,
    rateNaira: blank(draft.rateNaira),
    ratePeriod: draft.ratePeriod === "" ? undefined : draft.ratePeriod,
    salePriceNaira: blank(draft.salePriceNaira),
    saleAgencyFeeNaira: blank(draft.saleAgencyFeeNaira),
    saleLegalFeeNaira: blank(draft.saleLegalFeeNaira),
    governorsConsentFeeNaira: blank(draft.governorsConsentFeeNaira),
    stampDutyNaira: blank(draft.stampDutyNaira),
    surveyRegistrationFeeNaira: blank(draft.surveyRegistrationFeeNaira),
    totalPurchaseNaira: blank(draft.totalPurchaseNaira),
    priceNegotiable: draft.priceNegotiable,
    tenure: draft.tenure === "" ? undefined : draft.tenure,
    saleStatus: draft.saleStatus === "" ? undefined : draft.saleStatus,
    yearBuilt: blank(draft.yearBuilt),
    condition: draft.condition === "" ? undefined : draft.condition,
    powerGrid: draft.powerGrid === "" ? undefined : draft.powerGrid,
    powerBackup: draft.powerBackup === "" ? undefined : draft.powerBackup,
    powerBackupHours: blank(draft.powerBackupHours),
    waterSupply: draft.waterSupply === "" ? undefined : draft.waterSupply,
    prepaidMeter: draft.prepaidMeter,
  };
}
