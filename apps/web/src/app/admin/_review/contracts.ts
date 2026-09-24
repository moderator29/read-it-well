/**
 * The shapes the review desks' panels are built against: the return types of
 * the console's own reads in `lib/admin/reads/**`, re-exported here so the
 * presentational parts depend on a shape and never on a query. Nothing in
 * this folder reads the database.
 */
import type { Database } from "@/lib/supabase/database.types";

export type {
  ListingReviewTimes,
  ReviewTimes,
  ListerRole,
  ListerVerification,
  ListingReviewExtras,
} from "@/lib/admin/reads/listings";
export type { ModerationSummary, ReportCategory } from "@/lib/admin/reads/moderation";
export type { VerificationSummary, RungKind } from "@/lib/admin/reads/verification";

export type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** One exact count per listing status (real listings; examples are counted apart). */
export type ListingStatusCounts = Record<ListingStatus, number>;
