import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { ListingWizard } from "@/app/agent/list/ListingWizard";
import { AMENITY_CHOICES, STATE_CODES } from "@/lib/agent/listings-schema";
import type { WizardDraft } from "@/lib/agent/listings-queries";
import { SCENE_PHOTOGRAPHS } from "@/lib/listings/scene-photographs.generated";
import { AGENT_PROFILE } from "../ops-fixtures";

/**
 * A TENANCY IN PROGRESS, AND IT IS THE ONLY WAY TWO OF THE TWELVE SCREENS CAN
 * BE PHOTOGRAPHED AT ALL.
 *
 * The wizard opens blank on `apartment`, which is a SHORT STAY: one nightly
 * rate and no move-in costs. So GOVERNING-08 screens one and two, the price
 * and "what will a tenant actually pay", render nothing on an empty draft and
 * no sweep could ever have seen them. This draft is a rental.
 *
 * THE COSTS ARE CHOSEN TO SHOW THE HONESTY RULE RATHER THAN TO LOOK TIDY.
 * Rent, caution and service charge are DECLARED. The legal fee and the
 * agreement fee are left EMPTY, so they draw as "Not declared" with no figure
 * and add nothing to the total. The agency fee is a DECLARED ZERO, so it
 * draws as "No agency fee" in the success ink. Those are the three cases the
 * model exists to hold apart, and a fixture that declared everything would
 * photograph a screen that proves none of them.
 *
 * Every figure is example content, which the roles README says of every
 * number in the renders. Nothing here is written anywhere: `canPersist` is
 * false below.
 */
const RENTAL_DRAFT: WizardDraft = {
  id: "preview-rental",
  status: "DRAFT",
  title: "Bright 2 bedroom flat in Lekki Phase 1",
  description:
    "A bright two bedroom flat on a quiet street in Lekki Phase 1, with a fitted kitchen, a balcony off the sitting room and parking inside the compound. The estate is gated with security at the gate day and night.",
  propertyType: "rental",
  stateCode: "LA",
  city: "Lagos",
  area: "Lekki Phase 1",
  address: "12 Admiralty Way",
  landmark: "Opposite the Lekki roundabout",
  bedrooms: 3,
  bathrooms: 3,
  toilets: "4",
  parkingSpaces: "2",
  floor: "2",
  totalFloors: "5",
  sizeSqm: "150",
  intent: "rent",
  rentNaira: "2500000",
  rentPeriod: "year",
  rentNegotiable: true,
  cautionDepositNaira: "2500000",
  serviceChargeNaira: "150000",
  serviceChargePeriod: "month",
  /* A DECLARED ZERO. Not a blank: the two are different facts. */
  agencyFeeNaira: "0",
  /* BLANK, on purpose. These two draw as "Not declared". */
  legalFeeNaira: "",
  agreementFeeNaira: "",
  totalMoveInNaira: "",
  minimumTenancyMonths: "12",
  availableFrom: "",
  furnished: "fully_furnished",
  rateNaira: "",
  ratePeriod: "",
  salePriceNaira: "",
  saleAgencyFeeNaira: "",
  saleLegalFeeNaira: "",
  governorsConsentFeeNaira: "",
  stampDutyNaira: "",
  surveyRegistrationFeeNaira: "",
  totalPurchaseNaira: "",
  priceNegotiable: false,
  tenure: "",
  saleStatus: "",
  yearBuilt: "2021",
  condition: "newly_built",
  powerGrid: "BAND_A",
  powerBackup: "GENERATOR",
  powerBackupHours: "6",
  waterSupply: "TREATED_MAINS",
  prepaidMeter: true,
  access: {
    estateName: "Alagomeji Court",
    gateDirections: "Second gate off Admiralty Way. Tell security you are visiting flat 4B.",
    securityPhone: "",
    accessCode: "",
  },
  amenityCodes: ["wifi", "ac", "kitchen", "parking", "security", "generator", "water", "balcony"],
  /*
   * GOVERNING-07 screen four draws a FULL grid: five photographs with the
   * cover marked and the add cell last. An empty grid photographs the empty
   * state, which is worth a picture of its own and is not the picture that
   * render is. These are the product's own scene photographs, already in
   * `public/brand/scenes` and already on the optimiser's allowlist, so the
   * grid is drawn with real images at real aspect ratios rather than grey
   * boxes that would flatter the layout.
   */
  photos: Object.entries(SCENE_PHOTOGRAPHS)
    .slice(0, 5)
    .map(([name, url], i) => ({ id: `preview-${name}`, path: url, url, position: i })),
  videos: [],
  reviewNotes: null,
};

/**
 * `/agent/list`, the listing wizard, at any one of its eight steps.
 *
 * `canPersist` is false, which is the wizard's own signed-out path rather than
 * a preview-only branch: it draws every control and writes nothing. The wizard
 * is the longest form in the console and had no picture at all, which is how a
 * shape on it could survive a sweep.
 *
 * `?step=n` opens it on a step, one based, because the sweep has to put each
 * of GOVERNING-06, -07 and -08's twelve screens beside its own render and a
 * harness that only reaches step one can only ever close one of them.
 *
 * `?draft=rental` opens it on a tenancy in progress. See `RENTAL_DRAFT`.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgentList({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; draft?: string }>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const { step, draft } = await searchParams;
  const startAt = Math.max(0, (Number(step) || 1) - 1);
  /* `?draft=rental` opens on the tenancy above. Without it the wizard opens
     blank, which is the state a first-time lister meets and is worth a
     picture of its own. */
  const initial = draft === "rental" ? RENTAL_DRAFT : null;
  return (
    <AgentShell t={t} locale={locale} active="/agent/list" profile={AGENT_PROFILE}>
      <ListingWizard
        copy={t.agentListings}
        reference={t.listingReference}
        moveInCopy={t.moveIn}
        compoundCopy={t.shape.compound}
        serviceCopy={t.shape.service}
        locale={locale}
        userId={null}
        states={STATE_CODES.map((code) => ({ code, name: code }))}
        amenities={AMENITY_CHOICES}
        initial={initial}
        canPersist={false}
        startAt={startAt}
      />
    </AgentShell>
  );
}
