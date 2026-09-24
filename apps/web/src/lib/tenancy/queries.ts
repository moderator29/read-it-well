import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, type Locale } from "@vallo/i18n";
import { resolveSession } from "../actions/session";
import { isRoomItem, type RoomItem } from "../inspections/report";
import { formatMoneyDate } from "../money/dates";
import { ledgerFromCharge } from "../rent/ledger";
import { lagosToday } from "../rent/schema";
import {
  cautionState,
  keptUntil,
  moveOutOpensOn,
  reportStatus,
  tenancyEnd,
  type CautionState,
  type RentPeriod,
  type ReportStatus,
} from "./model";
import { attributeCaution, leadShare } from "./shares";
import { bpsAsPercentText } from "../money/percent";
import { daysUntil, exitAccountOpen, relistOpen, relistOpensOn, renewalCarriesFees, renewalTotal, rentChange } from "./renewal";

/**
 * THE TENANCY FILE, READ. V-47, with V-36's caution and V-54's reports.
 *
 * Everything on `/tenancy/[id]` comes from here, through the caller's OWN
 * RLS-bound client: a tenancy that is not theirs does not come back, and the
 * page answers "missing" exactly as it does for an id that does not exist,
 * so a stranger guessing ids learns nothing. The tables V-36, V-47 and V-54
 * add are not in the generated types until their migrations apply, so they
 * are reached through the untyped view of the same client and every row is
 * read defensively: a malformed row is dropped, never drawn as a zero.
 *
 * NOTHING HERE LOCATES THE FLAT BY ITSELF. The listing is read for its title,
 * area and city, and the promise snapshot never copies the address, landmark
 * or coordinates. The title and description are the lister's own words,
 * copied as written, so they say whatever the lister chose to say.
 *
 * EACH PARTY WRITES THEIR OWN REPORT of each stage, so a stage can hold two
 * reports: the viewer's own (writable while it is a draft) and the other
 * party's (countersignable once submitted).
 */

export type TenancyMoneyLine = { label: string; display: string };

export type TenancyReceipt = { id: string; amount: string; date: string; reference: string };

export type TenancyDeduction = {
  id: string;
  item: RoomItem;
  amount: string;
  note: string | null;
  answer: "accepted" | "disputed" | null;
  photoId: string | null;
  photoUrl: string | null;
};

export type TenancyCaution = {
  obligationId: string;
  amountMinor: number;
  amount: string;
  dueOn: string;
  dueOnLabel: string;
  state: CautionState;
  returned: string;
  deducted: string;
  outstanding: string;
  outstandingMinor: number;
  /** What a return can still be: the caution less returns and every line not disputed. */
  returnableMinor: number;
  deductions: TenancyDeduction[];
  returns: { amount: string; date: string }[];
};

export type TenancyReportView = {
  stage: "move_in" | "move_out";
  id: string | null;
  authorIsViewer: boolean;
  submitted: boolean;
  status: ReportStatus;
  items: Partial<Record<RoomItem, boolean>>;
  notes: string | null;
  photos: { id: string; item: RoomItem | null; url: string | null }[];
};

export type TenancyFile = {
  id: string;
  viewer: "tenant" | "lister" | "staff";
  title: string;
  area: string;
  listerName: string | null;
  /** V-85: the tenant's first name and last initial, for their own letter. */
  tenantName: string | null;
  moveIn: string;
  moveInLabel: string;
  endsOn: string;
  endsOnLabel: string;
  keptUntilLabel: string;
  rentPeriod: RentPeriod;
  paid: boolean;
  /** The tenancy has ended (Lagos day), so deductions may be proposed. */
  ended: boolean;
  /** The charge was cancelled, refunded or reversed: nothing is owed on it. */
  void: boolean;
  lines: TenancyMoneyLine[];
  total: string;
  receipts: TenancyReceipt[];
  caution: TenancyCaution | null;
  /** True when the charge carried a caution but its register row is not there yet. */
  cautionPending: boolean;
  tenantId: string;
  snapshot: { takenAtLabel: string; facts: { label: string; value: string }[]; description: string | null } | null;
  viewing: { submittedLabel: string | null; ticked: number } | null;
  reports: TenancyReportView[];
  pins: { id: string; body: string; date: string }[];
  /** Recent messages in the tenant-lister thread that can still be pinned. */
  pinCandidates: { id: string; body: string; date: string }[];
  /** V-93 and V-38: the renewal clock, the relist and the exit account. */
  renewal: TenancyRenewal;
  /** V-86: flatmates' shares of the move-in, the lead's as the remainder. */
  flatmates: TenancyFlatmates;
  /** V-55: the tenant's live receipt code, when they have made one. */
  /** Only a hint: the code itself is shown once, when it is made, and never stored. */
  receiptCode: { id: string; hint: string } | null;
};

export type TenancyRenewal = {
  /** Whole days to the end; negative once it has ended. */
  daysLeft: number;
  offer: {
    total: string;
    rent: string;
    service: string | null;
    fees: string | null;
    offeredOn: string;
    /** Signed change against the rent paid, formatted, or null when it did not move. */
    rise: string | null;
    fall: string | null;
    /** The change as a percentage of the rent paid, for the sentence. */
    percent: string | null;
  } | null;
  /** The lister's figures to prefill a new offer, in kobo. */
  rentMinor: number | null;
  serviceMinor: number | null;
  answer: "renewing" | "leaving" | null;
  relistOpen: boolean;
  relistOpensOnLabel: string;
  successorId: string | null;
  exitOpen: boolean;
  exitAnswered: boolean;
  /** A read failed: the section says so instead of offering controls. */
  unavailable: boolean;
};

export type TenancyFlatmates = {
  rows: {
    id: string;
    name: string | null;
    share: string;
    answer: "accepted" | "declined" | null;
    paid: boolean;
    returned: boolean;
    cautionPart: string | null;
  }[];
  leadShare: string;
  leadCautionPart: string | null;
  unavailable: boolean;
};

export type TenancyRead =
  | { state: "signed-out" }
  | { state: "missing" }
  | { state: "unavailable" }
  | { state: "ready"; file: TenancyFile };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = Record<string, unknown>;

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? (data.filter((row) => typeof row === "object" && row !== null) as Row[]) : [];
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function kobo(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** The promise, in the words a tenant reads. Only facts the lister stated. */
const SNAPSHOT_FACTS: { key: string; label: string; format?: (value: unknown) => string | null }[] = [
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms" },
  { key: "toilets", label: "Toilets" },
  { key: "furnished", label: "Furnishing", format: (v) => (typeof v === "string" ? v.replace(/_/g, " ") : null) },
  { key: "condition", label: "Condition", format: (v) => (typeof v === "string" ? v.replace(/_/g, " ") : null) },
  { key: "power_grid", label: "Grid power", format: (v) => (typeof v === "string" ? v.replace(/_/g, " ").toLowerCase() : null) },
  { key: "power_backup", label: "Backup power", format: (v) => (typeof v === "string" ? v.replace(/_/g, " ").toLowerCase() : null) },
  { key: "power_backup_hours", label: "Backup hours a day" },
  { key: "water_supply", label: "Water", format: (v) => (typeof v === "string" ? v.replace(/_/g, " ").toLowerCase() : null) },
  { key: "prepaid_meter", label: "Prepaid meter", format: (v) => (v === true ? "Yes" : v === false ? "No" : null) },
  { key: "parking_spaces", label: "Parking spaces" },
];

function snapshotFacts(listing: Row): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  for (const fact of SNAPSHOT_FACTS) {
    const raw = listing[fact.key];
    if (raw === null || raw === undefined) continue;
    const value = fact.format ? fact.format(raw) : typeof raw === "number" ? String(raw) : null;
    if (value) facts.push({ label: fact.label, value });
  }
  return facts;
}

export async function getTenancyFile(id: string, locale: Locale, now: Date = new Date()): Promise<TenancyRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  if (!UUID_RE.test(id)) return { state: "missing" };
  const db = session.supabase;
  const loose = db as unknown as SupabaseClient;
  const money = (minor: number) => formatMoney(minor, locale);
  const day = (value: string | null | undefined, withTime = false) =>
    value ? (formatMoneyDate(value, locale, { withTime, now }) ?? value) : "";

  try {
    const { data: rp, error } = await db.from("rent_payments").select("*").eq("id", id).maybeSingle();
    if (error) return { state: "unavailable" };
    if (!rp) return { state: "missing" };

    const viewer: TenancyFile["viewer"] =
      rp.tenant_id === session.user.id ? "tenant" : rp.lister_id === session.user.id ? "lister" : "staff";
    const period = (rp.rent_period ?? "year") as RentPeriod;
    const endsOn = tenancyEnd(rp.move_in, period);
    const today = lagosToday(now);

    const [listingRead, txRead, snapshotRead, obligationRead, reportsRead, viewingRead, pinsRead, codeRead, voidRead] = await Promise.all([
      db.from("listings").select("title, area, city, agent_id").eq("id", rp.listing_id).maybeSingle(),
      db
        .from("transactions")
        .select("id, amount_minor, created_at, provider_ref")
        .eq("booking_id", rp.booking_id)
        .eq("status", "SUCCESSFUL")
        .order("created_at", { ascending: true }),
      loose.from("tenancy_snapshots").select("*").eq("rent_payment_id", id).maybeSingle(),
      loose.from("caution_obligations").select("*").eq("rent_payment_id", id).maybeSingle(),
      loose.from("tenancy_reports").select("*").eq("rent_payment_id", id),
      db.from("inspection_reports").select("submitted_at").eq("inspection_id", rp.inspection_id).maybeSingle(),
      loose.from("tenancy_pins").select("message_id, created_at").eq("rent_payment_id", id),
      // Owner-only under RLS, so only the tenant ever gets a row back.
      loose
        .from("receipt_codes")
        .select("id, code_hint")
        .eq("subject_kind", "rent_payment")
        .eq("subject_id", id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1),
      loose.rpc("tenancy_is_void", { p_rent_payment: id }),
    ]);

    const listing = listingRead.data;
    let listerName: string | null = null;
    if (listing?.agent_id) {
      const { data: agent } = await db.from("agents").select("display_name").eq("id", listing.agent_id).maybeSingle();
      listerName = agent?.display_name?.trim() || null;
    }

    const ledger = ledgerFromCharge(rp);
    const receipts: TenancyReceipt[] = (txRead.data ?? []).map((tx) => ({
      id: tx.id,
      amount: money(tx.amount_minor),
      date: day(tx.created_at, true),
      reference: tx.provider_ref ?? "",
    }));

    /* ---------------------------------------------------------- caution */
    let caution: TenancyCaution | null = null;
    const obligation = obligationRead.error ? null : (obligationRead.data as Row | null);
    const obligationId = obligation ? str(obligation.id) : null;
    const amountMinor = obligation ? kobo(obligation.amount_minor) : null;
    const dueOn = obligation ? str(obligation.due_on) : null;
    if (obligationId && amountMinor !== null && dueOn) {
      const [deductionsRead, returnsRead] = await Promise.all([
        loose.from("caution_deductions").select("*").eq("obligation_id", obligationId).order("created_at"),
        loose.from("caution_returns").select("*").eq("obligation_id", obligationId).order("returned_at"),
      ]);
      const deductionRows = rows(deductionsRead.data);
      const answersRead = deductionRows.length
        ? await loose
            .from("caution_deduction_answers")
            .select("deduction_id, answer")
            .in("deduction_id", deductionRows.map((row) => String(row.id)))
        : { data: [] };
      const answers = new Map(rows(answersRead.data).map((row) => [String(row.deduction_id), row.answer]));
      const deductions = deductionRows.flatMap((row): TenancyDeduction[] => {
        const idValue = str(row.id);
        const amount = kobo(row.amount_minor);
        if (!idValue || amount === null || !isRoomItem(row.item)) return [];
        const answer = answers.get(idValue);
        return [
          {
            id: idValue,
            item: row.item,
            amount: money(amount),
            note: str(row.note),
            answer: answer === "accepted" || answer === "disputed" ? answer : null,
            photoId: str(row.photo_id),
            photoUrl: null,
          },
        ];
      });
      const returns = rows(returnsRead.data).flatMap((row) => {
        const amount = kobo(row.amount_minor);
        return amount === null ? [] : [{ amountMinor: amount, date: str(row.returned_at) }];
      });
      const reading = cautionState({
        amountMinor,
        deductions: deductionRows.flatMap((row) => {
          const amount = kobo(row.amount_minor);
          if (amount === null) return [];
          const answer = answers.get(String(row.id));
          return [{ amountMinor: amount, answer: answer === "accepted" || answer === "disputed" ? answer : null }];
        }),
        returns,
      });
      caution = {
        obligationId,
        amountMinor,
        amount: money(amountMinor),
        dueOn,
        dueOnLabel: day(dueOn),
        state: reading.state,
        returned: money(reading.returnedMinor),
        deducted: money(reading.deductedMinor),
        outstanding: money(reading.outstandingMinor),
        outstandingMinor: reading.outstandingMinor,
        returnableMinor: Math.max(
          0,
          amountMinor -
            reading.returnedMinor -
            deductionRows.reduce((sum, row) => {
              const value = kobo(row.amount_minor) ?? 0;
              return answers.get(String(row.id)) === "disputed" ? sum : sum + value;
            }, 0),
        ),
        deductions,
        returns: returns.map((row) => ({ amount: money(row.amountMinor), date: day(row.date) })),
      };
    }

    /* ---------------------------------------------------------- reports */
    const reportRows = reportsRead.error ? [] : rows(reportsRead.data);
    const reportIds = reportRows.map((row) => String(row.id));
    const [itemsRead, photosRead] = reportIds.length
      ? await Promise.all([
          loose.from("tenancy_report_items").select("report_id, item, checked").in("report_id", reportIds),
          loose.from("tenancy_report_photos").select("id, report_id, item, storage_path").in("report_id", reportIds),
        ])
      : [{ data: [] }, { data: [] }];
    const photoRows = rows(photosRead.data);
    const signed = new Map<string, string>();
    const paths = photoRows.map((row) => str(row.storage_path)).filter((p): p is string => p !== null).slice(0, 48);
    if (paths.length > 0) {
      const { data } = await db.storage.from("tenancy-evidence").createSignedUrls(paths, 3600);
      for (const entry of data ?? []) if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
    const toView = (stage: "move_in" | "move_out", row: Row | null): TenancyReportView => {
      const reportId = row ? str(row.id) : null;
      const items: Partial<Record<RoomItem, boolean>> = {};
      for (const item of rows(itemsRead.data)) {
        if (item.report_id === reportId && isRoomItem(item.item)) items[item.item] = item.checked === true;
      }
      return {
        stage,
        id: reportId,
        authorIsViewer: row ? row.author_id === session.user.id : viewer !== "staff",
        submitted: row ? str(row.submitted_at) !== null : false,
        status: reportStatus({
          opensOn: stage === "move_in" ? rp.move_in : moveOutOpensOn(rp.move_in, period),
          today,
          report: row ? { submittedAt: str(row.submitted_at), countersignedAt: str(row.countersigned_at) } : null,
          now,
        }),
        items,
        notes: row ? str(row.notes) : null,
        photos: photoRows
          .filter((photo) => photo.report_id === reportId)
          .map((photo) => ({
            id: String(photo.id),
            item: isRoomItem(photo.item) ? photo.item : null,
            url: signed.get(String(photo.storage_path)) ?? null,
          })),
      };
    };
    // Per stage: the viewer's own report first (an empty one to start, for a
    // party), then every report the other side wrote.
    const reports: TenancyReportView[] = (["move_in", "move_out"] as const).flatMap((stage) => {
      const own = reportRows.find((row) => row.stage === stage && row.author_id === session.user.id) ?? null;
      const others = reportRows.filter((row) => row.stage === stage && row.author_id !== session.user.id);
      const views = others.map((row) => toView(stage, row));
      return viewer === "staff" ? views : [toView(stage, own), ...views];
    });
    // Each deduction shows the move-out photograph it was proposed against.
    if (caution) {
      const byId = new Map(
        reports.filter((report) => report.stage === "move_out").flatMap((report) => report.photos.map((photo): [string, string | null] => [photo.id, photo.url])),
      );
      caution.deductions = caution.deductions.map((deduction) => ({
        ...deduction,
        photoUrl: deduction.photoId ? (byId.get(deduction.photoId) ?? null) : null,
      }));
    }

    /* ---------------------------------------------------------- viewing */
    let viewing: TenancyFile["viewing"] = null;
    if (viewingRead.data) {
      const { count } = await db
        .from("inspection_report_items")
        .select("item", { count: "exact", head: true })
        .eq("inspection_id", rp.inspection_id)
        .eq("checked", true);
      viewing = {
        submittedLabel: viewingRead.data.submitted_at ? day(viewingRead.data.submitted_at) : null,
        ticked: count ?? 0,
      };
    }

    /* ---------------------------------------------------------- pins */
    const pinRows = pinsRead.error ? [] : rows(pinsRead.data);
    let pins: TenancyFile["pins"] = [];
    if (pinRows.length > 0) {
      const { data: messages } = await db
        .from("messages")
        .select("id, body, created_at")
        .in("id", pinRows.map((row) => String(row.message_id)));
      pins = (messages ?? []).map((message) => ({ id: message.id, body: message.body, date: day(message.created_at, true) }));
    }

    /* ---------------------------------------------------------- renewal */
    const [offerRead, answerRead, exitRead, lineageRead] = await Promise.all([
      loose.from("tenancy_renewal_offers").select("*").eq("rent_payment_id", id).order("offered_at", { ascending: false }).limit(1),
      loose.from("tenancy_renewal_answers").select("answer").eq("rent_payment_id", id).maybeSingle(),
      loose.from("tenancy_exit_accounts").select("rent_payment_id").eq("rent_payment_id", id).maybeSingle(),
      // Readable by the successor's owner only, so only the lister sees it.
      loose.from("listing_lineage").select("successor_listing_id").eq("predecessor_rent_payment_id", id).maybeSingle(),
    ]);
    const offerRow = offerRead.error ? null : (rows(offerRead.data)[0] ?? null);
    const offerRent = offerRow ? kobo(offerRow.rent_minor) : null;
    const offer =
      offerRow && offerRent !== null && offerRent > 0
        ? {
            rentMinor: offerRent,
            serviceMinor: kobo(offerRow.service_minor),
            agencyMinor: kobo(offerRow.agency_minor) ?? 0,
            legalMinor: kobo(offerRow.legal_minor) ?? 0,
            agreementMinor: kobo(offerRow.agreement_minor) ?? 0,
          }
        : null;
    const change = offer ? rentChange(rp.rent_minor ?? null, offer) : null;
    const answerValue = answerRead.error ? null : (answerRead.data as Row | null)?.answer;
    const answer = answerValue === "renewing" || answerValue === "leaving" ? answerValue : null;
    const cautionSettled = caution ? caution.state === "returned" : !(rp.caution_minor && rp.caution_minor > 0);
    const renewal: TenancyRenewal = {
      daysLeft: daysUntil(endsOn, today),
      offer: offer
        ? {
            total: money(renewalTotal(offer)),
            rent: money(offer.rentMinor),
            service: offer.serviceMinor ? money(offer.serviceMinor) : null,
            fees: renewalCarriesFees(offer) ? money(offer.agencyMinor + offer.legalMinor + offer.agreementMinor) : null,
            offeredOn: day(str(offerRow?.offered_at)),
            rise: change !== null && change > 0 ? money(change) : null,
            fall: change !== null && change < 0 ? money(-change) : null,
            percent:
              change !== null && change !== 0 && rp.rent_minor && rp.rent_minor > 0
                ? bpsAsPercentText(Math.round((Math.abs(change) * 10_000) / rp.rent_minor))
                : null,
          }
        : null,
      rentMinor: offer?.rentMinor ?? rp.rent_minor ?? null,
      serviceMinor: offer?.serviceMinor ?? rp.service_minor ?? null,
      answer,
      relistOpen: relistOpen(endsOn, today, answer === "renewing"),
      relistOpensOnLabel: day(relistOpensOn(endsOn)),
      successorId: lineageRead.error ? null : (str((lineageRead.data as Row | null)?.successor_listing_id) ?? null),
      exitOpen: exitAccountOpen(endsOn, today, cautionSettled),
      exitAnswered: !exitRead.error && exitRead.data !== null,
      unavailable: Boolean(offerRead.error || answerRead.error || exitRead.error),
    };

    /* ---------------------------------------------------------- tenant name */
    let tenantName: string | null = null;
    if (viewer === "tenant") {
      const { data: me } = await db.from("profiles").select("first_name, surname").eq("id", rp.tenant_id).maybeSingle();
      const first = me?.first_name?.trim();
      const initial = me?.surname?.trim()?.charAt(0);
      tenantName = first ? `${first}${initial ? ` ${initial}.` : ""}` : null;
    }

    /* ---------------------------------------------------------- flatmates */
    const contributorsRead = await loose.from("rent_payment_contributors").select("id, user_id, share_minor").eq("rent_payment_id", id).order("added_at");
    const contributorRows = contributorsRead.error ? [] : rows(contributorsRead.data);
    const coShares = contributorRows.flatMap((row) => {
      const share = kobo(row.share_minor);
      return share === null ? [] : [{ id: String(row.id), userId: String(row.user_id), shareMinor: share }];
    });
    const shareIds = coShares.map((row) => row.id);
    const [sharePaidRead, namesRead, answersRead, returnsRead] = coShares.length
      ? await Promise.all([
          loose.from("rent_share_payments").select("contributor_id").in("contributor_id", shareIds),
          db.from("profiles").select("id, first_name").in("id", coShares.map((row) => row.userId)),
          loose.from("rent_share_answers").select("contributor_id, answer").in("contributor_id", shareIds),
          loose.from("rent_share_returns").select("contributor_id").in("contributor_id", shareIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
    const sharePaid = new Set(rows(sharePaidRead.data).map((row) => String(row.contributor_id)));
    const shareReturned = new Set(rows(returnsRead.data).map((row) => String(row.contributor_id)));
    const shareAnswer = new Map(rows(answersRead.data).map((row) => [String(row.contributor_id), row.answer]));
    // A declined share does not count: the lead carries it again.
    const standing = coShares.filter((row) => shareAnswer.get(row.id) !== "declined");
    const firstNames = new Map(rows(namesRead.data).map((row) => [String(row.id), str(row.first_name)]));
    const cautionMinor = rp.caution_minor ?? 0;
    const attributed = attributeCaution(cautionMinor, rp.total_minor, standing);
    const flatmates: TenancyFlatmates = {
      rows: coShares.map((row) => ({
        id: row.id,
        name: firstNames.get(row.userId) ?? null,
        share: money(row.shareMinor),
        answer: (() => {
          const value = shareAnswer.get(row.id);
          return value === "accepted" || value === "declined" ? value : null;
        })(),
        paid: sharePaid.has(row.id),
        returned: shareReturned.has(row.id),
        cautionPart: cautionMinor > 0 && attributed.byId[row.id] !== undefined ? money(attributed.byId[row.id] ?? 0) : null,
      })),
      leadShare: money(leadShare(rp.total_minor, standing)),
      leadCautionPart: cautionMinor > 0 ? money(attributed.lead) : null,
      unavailable: Boolean(contributorsRead.error || sharePaidRead.error || answersRead.error || returnsRead.error),
    };

    /* ---------------------------------------------------------- pin candidates */
    // The pin policy allows only THE conversation between this tenant and this
    // lister about this listing, so only its messages are offered.
    let pinCandidates: TenancyFile["pinCandidates"] = [];
    if (viewer !== "staff") {
      const { data: threads } = await db
        .from("conversations")
        .select("id")
        .eq("listing_id", rp.listing_id)
        .eq("guest_id", rp.tenant_id)
        .eq("agent_id", rp.lister_id);
      const threadIds = (threads ?? []).map((thread) => thread.id);
      if (threadIds.length > 0) {
        const pinned = new Set(pins.map((pin) => pin.id));
        const { data: recent } = await db
          .from("messages")
          .select("id, body, created_at")
          .in("conversation_id", threadIds)
          .order("created_at", { ascending: false })
          .limit(30);
        pinCandidates = (recent ?? [])
          .filter((message) => !pinned.has(message.id) && typeof message.body === "string" && message.body.trim().length > 0)
          .map((message) => ({ id: message.id, body: message.body, date: day(message.created_at, true) }));
      }
    }

    /* ---------------------------------------------------------- promise */
    const snap = snapshotRead.error ? null : (snapshotRead.data as Row | null);
    const snapListing = snap && typeof snap.listing === "object" && snap.listing !== null ? (snap.listing as Row) : null;

    return {
      state: "ready",
      file: {
        id,
        viewer,
        title: listing?.title?.trim() || "Your tenancy",
        area: [listing?.area, listing?.city].filter((part): part is string => Boolean(part)).join(", "),
        listerName,
        tenantName,
        moveIn: rp.move_in,
        moveInLabel: day(rp.move_in),
        endsOn,
        endsOnLabel: day(endsOn),
        keptUntilLabel: day(keptUntil(rp.move_in, period)),
        rentPeriod: period,
        // The lister cannot read the tenant's transactions under RLS, so the
        // snapshot, written in the same transaction as the settlement, also
        // says the charge was paid.
        paid: receipts.length > 0 || snap !== null,
        ended: today >= endsOn,
        void: voidRead.error ? false : voidRead.data === true,
        lines: (ledger?.lines ?? []).map((line) => ({ label: line.label, display: money(line.minor) })),
        total: money(rp.total_minor),
        receipts,
        caution,
        cautionPending: caution === null && (rp.caution_minor ?? 0) > 0,
        tenantId: rp.tenant_id,
        snapshot:
          snap && snapListing
            ? {
                takenAtLabel: day(str(snap.taken_at)),
                facts: snapshotFacts(snapListing),
                description: str(snapListing.description),
              }
            : null,
        viewing,
        reports,
        pins,
        pinCandidates,
        renewal,
        flatmates,
        receiptCode: (() => {
          const row = codeRead.error ? null : rows(codeRead.data)[0];
          const codeId = row ? str(row.id) : null;
          const hint = row ? str(row.code_hint) : null;
          return codeId && hint ? { id: codeId, hint } : null;
        })(),
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

