import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { firstNameAndInitial } from "../after-gate/public-place-model";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { resolveSession } from "../actions/session";
import { isRoomItem, type RoomItem } from "../inspections/report";
import { formatMoneyDate } from "../money/dates";
import { ledgerFromCharge } from "../rent/ledger";
import { lagosToday } from "../rent/schema";
import {
  canAskGuarantee,
  cautionState,
  guaranteeBpsOf,
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
  /** What Vallo staff allowed on a disputed line, formatted, once ruled. */
  ruledAllowed: string | null;
  ruledReason: string | null;
  photoId: string | null;
  photoUrl: string | null;
};

export type TenancyCautionReturn = {
  id: string;
  amount: string;
  date: string;
  method: "bank_transfer" | "cash" | "other";
  reference: string | null;
  recordedAs: "lister_sent" | "tenant_received";
  /** The viewer recorded it themselves (so they cannot contest it). */
  ownRecord: boolean;
  standing: "counted" | "in_doubt" | "not_received";
  contested: boolean;
  ruling: "received" | "not_received" | null;
  rulingReason: string | null;
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
  guaranteed: string | null;
  inDoubt: string | null;
  claimable: string;
  claimableMinor: number;
  claimOpen: boolean;
  /** The tenant may ask the Vallo Guarantee: the due date has passed and something is claimable. */
  canEscalate: boolean;
  deductions: TenancyDeduction[];
  returns: TenancyCautionReturn[];
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
  /** For surfaces a third party reads: the raw place parts, to go through the closed lists. */
  place: { area: string | null; city: string | null; stateCode: string | null };
  bedrooms: number | null;
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

export type ShareRefundStatus = "pending" | "sending" | "unknown" | "submitted" | "processed" | "failed";

export type TenancyFlatmates = {
  rows: {
    id: string;
    name: string | null;
    share: string;
    answer: "accepted" | "declined" | null;
    /** Paid by card, straight to the lister (V-86). */
    paid: boolean;
    /** The share went back to the card that paid it, and where Paystack has it. */
    refund: ShareRefundStatus | null;
    cautionPart: string | null;
  }[];
  leadShare: string;
  leadCautionPart: string | null;
  /** The lead's own card payment of the remainder. */
  leadPaid: boolean;
  leadRefund: ShareRefundStatus | null;
  /** The first share was paid, so shares can no longer be added or removed. */
  locked: boolean;
  /** Something is paid and the total is not complete: the lead may still cancel the split. */
  cancellable: boolean;
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
    await reportReadError("read.tenancy.getTenancyFile", error);
    if (error) return { state: "unavailable" };
    if (!rp) return { state: "missing" };

    const viewer: TenancyFile["viewer"] =
      rp.tenant_id === session.user.id ? "tenant" : rp.lister_id === session.user.id ? "lister" : "staff";
    const period = (rp.rent_period ?? "year") as RentPeriod;
    const endsOn = tenancyEnd(rp.move_in, period);
    const today = lagosToday(now);

    const [listingRead, txRead, snapshotRead, obligationRead, reportsRead, viewingRead, pinsRead, codeRead, voidRead] = await Promise.all([
      db.from("listings").select("title, area, city, state_code, bedrooms, agent_id").eq("id", rp.listing_id).maybeSingle(),
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
    await reportReadError("read.tenancy.getTenancyFile", listingRead.error, txRead.error, snapshotRead.error, obligationRead.error, reportsRead.error, viewingRead.error, pinsRead.error, codeRead.error, voidRead.error);

    const listing = listingRead.data;
    let listerName: string | null = null;
    if (listing?.agent_id) {
      const { data: agent } = await db.from("agents").select("display_name").eq("id", listing.agent_id).maybeSingle();
      // Printed on the pack and the letter a third party reads: first name and initial only.
      listerName = firstNameAndInitial(agent?.display_name);
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
      const [deductionsRead, returnsRead, claimsRead, termsRead] = await Promise.all([
        loose.from("caution_deductions").select("*").eq("obligation_id", obligationId).order("created_at"),
        loose.from("caution_returns").select("*").eq("obligation_id", obligationId).order("recorded_at"),
        // Readable by the claimant and both parties to the agreement (and admins) under
        // `guarantee_claims_read`, so tenant and lister see the same Guarantee position.
        loose.from("guarantee_claims").select("status, approved_minor").eq("caution_obligation_id", obligationId),
        // The payment's frozen terms: a Guarantee is offered only where they
        // carried a contribution (D51), as the agreement page gates its claim.
        // One agreement per inspection (`rent_charge_needs_approved_agreement`).
        loose.from("deal_agreements").select("terms").eq("inspection_id", rp.inspection_id).maybeSingle(),
      ]);
      await reportReadError("read.tenancy.getTenancyFile", deductionsRead.error, returnsRead.error, claimsRead.error);
      const deductionRows = rows(deductionsRead.data);
      const returnRows = rows(returnsRead.data);
      const deductionIds = deductionRows.map((row) => String(row.id));
      const returnIds = returnRows.map((row) => String(row.id));
      const [answersRead, rulingsRead, contestsRead, returnRulingsRead] = await Promise.all([
        deductionIds.length
          ? loose.from("caution_deduction_answers").select("deduction_id, answer").in("deduction_id", deductionIds)
          : Promise.resolve({ data: [] }),
        deductionIds.length
          ? loose.from("caution_dispute_rulings").select("deduction_id, allowed_minor, reason").in("deduction_id", deductionIds)
          : Promise.resolve({ data: [] }),
        returnIds.length
          ? loose.from("caution_return_contests").select("return_id").in("return_id", returnIds)
          : Promise.resolve({ data: [] }),
        returnIds.length
          ? loose.from("caution_return_rulings").select("return_id, outcome, reason").in("return_id", returnIds)
          : Promise.resolve({ data: [] }),
      ]);
      const answers = new Map(rows(answersRead.data).map((row) => [String(row.deduction_id), row.answer]));
      const allowed = new Map(rows(rulingsRead.data).map((row) => [String(row.deduction_id), kobo(row.allowed_minor)]));
      const contested = new Set(rows(contestsRead.data).map((row) => String(row.return_id)));
      const ruleReasons = new Map(
        [...rows(rulingsRead.data), ...rows(returnRulingsRead.data)].map((row) => [String(row.deduction_id ?? row.return_id), str(row.reason)]),
      );
      const returnRulings = new Map(rows(returnRulingsRead.data).map((row) => [String(row.return_id), row.outcome]));
      const answerOf = (deductionId: string) => {
        const answer = answers.get(deductionId);
        return answer === "accepted" || answer === "disputed" ? answer : null;
      };
      const deductions = deductionRows.flatMap((row): TenancyDeduction[] => {
        const idValue = str(row.id);
        const amount = kobo(row.amount_minor);
        if (!idValue || amount === null || !isRoomItem(row.item)) return [];
        const ruled = allowed.get(idValue);
        return [
          {
            id: idValue,
            item: row.item,
            amount: money(amount),
            note: str(row.note),
            answer: answerOf(idValue),
            ruledAllowed: typeof ruled === "number" ? money(ruled) : null,
            ruledReason: ruleReasons.get(idValue) ?? null,
            photoId: str(row.photo_id),
            photoUrl: null,
          },
        ];
      });
      const returns = returnRows.flatMap((row): (TenancyCautionReturn & { amountMinor: number })[] => {
        const idValue = str(row.id);
        const amount = kobo(row.amount_minor);
        const method = row.method;
        const recordedAs = row.recorded_as;
        if (!idValue || amount === null) return [];
        if (method !== "bank_transfer" && method !== "cash" && method !== "other") return [];
        if (recordedAs !== "lister_sent" && recordedAs !== "tenant_received") return [];
        const ruling = returnRulings.get(idValue);
        const ruled = ruling === "received" || ruling === "not_received" ? ruling : null;
        const isContested = contested.has(idValue);
        return [
          {
            id: idValue,
            amountMinor: amount,
            amount: money(amount),
            date: day(str(row.returned_on)),
            method,
            reference: str(row.reference),
            recordedAs,
            ownRecord: row.recorded_by === session.user.id,
            standing: !isContested || ruled === "received" ? "counted" : ruled === "not_received" ? "not_received" : "in_doubt",
            contested: isContested,
            ruling: ruled,
            rulingReason: ruleReasons.get(idValue) ?? null,
          },
        ];
      });
      const claimRows = claimsRead.error ? [] : rows(claimsRead.data);
      const reading = cautionState({
        amountMinor,
        deductions: deductionRows.flatMap((row) => {
          const amount = kobo(row.amount_minor);
          if (amount === null) return [];
          const ruled = allowed.get(String(row.id));
          return [{ amountMinor: amount, answer: answerOf(String(row.id)), allowedMinor: typeof ruled === "number" ? ruled : null }];
        }),
        returns: returns.map((row) => ({ amountMinor: row.amountMinor, standing: row.standing })),
        guaranteedMinor: claimRows
          .filter((row) => row.status === "approved" || row.status === "paid")
          .reduce((sum, row) => sum + (kobo(row.approved_minor) ?? 0), 0),
        claimOpen: claimRows.some((row) => row.status === "submitted"),
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
        guaranteed: reading.guaranteedMinor > 0 ? money(reading.guaranteedMinor) : null,
        inDoubt: reading.inDoubtMinor > 0 ? money(reading.inDoubtMinor) : null,
        claimable: money(reading.claimableMinor),
        claimableMinor: reading.claimableMinor,
        claimOpen: claimRows.some((row) => row.status === "submitted"),
        // The database decides for real (escalate_caution_to_guarantee); this only offers the
        // button, and only on a payment that carried a Guarantee contribution (D51).
        canEscalate: canAskGuarantee({
          viewer,
          today,
          dueOn,
          claimableMinor: reading.claimableMinor,
          guaranteeBps: guaranteeBpsOf(termsRead.error ? null : termsRead.data),
          claimFiled: claimRows.length > 0,
          claimOpen: claimRows.some((row) => row.status === "submitted"),
        }),
        deductions,
        returns,
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
    await reportReadError("read.tenancy.getTenancyFile", offerRead.error, answerRead.error, exitRead.error, lineageRead.error);
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
    await reportReadError("read.tenancy.getTenancyFile", contributorsRead.error);
    const contributorRows = contributorsRead.error ? [] : rows(contributorsRead.data);
    const coShares = contributorRows.flatMap((row) => {
      const share = kobo(row.share_minor);
      return share === null ? [] : [{ id: String(row.id), userId: String(row.user_id), shareMinor: share }];
    });
    const shareIds = coShares.map((row) => row.id);
    const [namesRead, answersRead, sharePaymentsRead, shareRefundsRead] = await Promise.all([
      coShares.length
        ? db.from("profiles").select("id, first_name").in("id", coShares.map((row) => row.userId))
        : Promise.resolve({ data: [], error: null }),
      coShares.length
        ? loose.from("rent_share_answers").select("contributor_id, answer").in("contributor_id", shareIds)
        : Promise.resolve({ data: [], error: null }),
      // Each share is its own card charge on the one booking (V-86); the lead reads them all.
      loose
        .from("transactions")
        .select("share_payer_id")
        .eq("booking_id", rp.booking_id)
        .eq("status", "SUCCESSFUL")
        .not("share_payer_id", "is", null),
      loose.from("rent_share_refunds").select("payer_id, processor_status").eq("rent_payment_id", id),
    ]);
    const paidBy = new Set(rows(sharePaymentsRead.data).map((row) => String(row.share_payer_id)));
    const refundOf = new Map(
      rows(shareRefundsRead.data).flatMap((row): [string, ShareRefundStatus][] => {
        const status = row.processor_status;
        return status === "pending" || status === "sending" || status === "unknown" || status === "submitted" ||
          status === "processed" || status === "failed"
          ? [[String(row.payer_id), status]]
          : [];
      }),
    );
    const shareAnswer = new Map(rows(answersRead.data).map((row) => [String(row.contributor_id), row.answer]));
    // A declined share does not count: the lead carries it again.
    const standing = coShares.filter((row) => shareAnswer.get(row.id) !== "declined");
    const firstNames = new Map(rows(namesRead.data).map((row) => [String(row.id), str(row.first_name)]));
    const cautionMinor = rp.caution_minor ?? 0;
    const attributed = attributeCaution(cautionMinor, rp.total_minor, standing);
    const anyPaid = paidBy.size > 0;
    // The tenancy records open when the charge is paid in full, so a snapshot says complete too.
    const paidSum = (txRead.data ?? []).reduce((sum, tx) => sum + (kobo(tx.amount_minor) ?? 0), 0);
    const complete = paidSum >= rp.total_minor || (!snapshotRead.error && snapshotRead.data !== null);
    const flatmates: TenancyFlatmates = {
      rows: coShares.map((row) => ({
        id: row.id,
        name: firstNames.get(row.userId) ?? null,
        share: money(row.shareMinor),
        answer: (() => {
          const value = shareAnswer.get(row.id);
          return value === "accepted" || value === "declined" ? value : null;
        })(),
        paid: paidBy.has(row.userId),
        refund: refundOf.get(row.userId) ?? null,
        cautionPart: cautionMinor > 0 && attributed.byId[row.id] !== undefined ? money(attributed.byId[row.id] ?? 0) : null,
      })),
      leadShare: money(leadShare(rp.total_minor, standing)),
      leadCautionPart: cautionMinor > 0 ? money(attributed.lead) : null,
      leadPaid: paidBy.has(rp.tenant_id),
      leadRefund: refundOf.get(rp.tenant_id) ?? null,
      locked: anyPaid,
      cancellable: anyPaid && !complete && viewer === "tenant",
      unavailable: Boolean(
        contributorsRead.error || namesRead.error || answersRead.error || sharePaymentsRead.error || shareRefundsRead.error,
      ),
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
        place: { area: listing?.area ?? null, city: listing?.city ?? null, stateCode: listing?.state_code ?? null },
        bedrooms: typeof listing?.bedrooms === "number" ? listing.bedrooms : null,
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
        // With flatmates' shares (V-86) one receipt is not the whole charge: paid means paid in full.
        paid: complete,
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

