import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * THE PUSH TABLES, TYPED HERE RATHER THAN IN THE GENERATED FILE.
 *
 * `lib/supabase/database.types.ts` is generated from the live schema and does
 * not yet know `push_tokens`, `push_queue` or `push_deliveries`, because it
 * has not been regenerated since they landed. Regenerating it is a rewrite of
 * a five thousand line file that six workers all import, and two other
 * sessions added tables of their own within minutes of these, so a regenerate
 * from here would either drop their work or collide with it.
 *
 * So the push tables are described here, narrowly, and the cast to them
 * happens in exactly one function at the foot of this file. That is the whole
 * extent of the untyped surface in this feature, it is named, and it goes
 * away the moment somebody regenerates the shared file. The request to do
 * that is recorded in `docs/BUILD_07_LEDGER.md`.
 *
 * THE DESCRIPTIONS BELOW ARE NOT A SECOND SOURCE OF TRUTH. They are read
 * from the migrations that created the tables, and if the two ever disagree
 * the migration is right. Anything this file gets wrong shows up as a runtime
 * error from PostgREST rather than as silent corruption, because every
 * column named here exists or the query is rejected.
 */

export type PushPlatform = "web" | "ios" | "android";

export type PushRevokedReason =
  | "by_person"
  | "provider_gone"
  | "provider_invalid"
  | "repeated_failure"
  | "signed_out";

export type PushQueueState = "pending" | "held" | "sending" | "done" | "failed" | "dead";

export type PushQueueOutcome =
  | "delivered"
  | "suppressed_preference"
  | "suppressed_no_device"
  | "suppressed_expired"
  | "collapsed"
  | "gave_up";

export type PushDeliveryState = "sending" | "sent" | "failed" | "gone";

type PushTokenRow = {
  id: string;
  user_id: string;
  platform: PushPlatform;
  token: string;
  p256dh: string | null;
  auth: string | null;
  device_ref: string;
  device_label: string | null;
  app_version: string | null;
  created_at: string;
  last_seen_at: string;
  failure_streak: number;
  revoked_at: string | null;
  revoked_reason: PushRevokedReason | null;
};

type PushQueueRow = {
  id: string;
  notification_id: string;
  user_id: string;
  state: PushQueueState;
  outcome: PushQueueOutcome | null;
  not_before: string;
  expires_at: string;
  attempts: number;
  claimed_at: string | null;
  claim_token: string | null;
  collapsed_into: string | null;
  last_error: string | null;
  created_at: string;
  settled_at: string | null;
};

type PushDeliveryRow = {
  id: string;
  queue_id: string;
  token_id: string;
  device_ref: string;
  platform: PushPlatform;
  state: PushDeliveryState;
  attempts: number;
  provider_status: number | null;
  provider_message_id: string | null;
  provider_error: string | null;
  attempted_at: string;
  settled_at: string | null;
};

type Insertable<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Row>;

export type PushSchema = {
  public: {
    Tables: {
      push_tokens: {
        Row: PushTokenRow;
        Insert: Insertable<PushTokenRow, "user_id" | "platform" | "token">;
        Update: Partial<PushTokenRow>;
        Relationships: [];
      };
      push_queue: {
        Row: PushQueueRow;
        Insert: Insertable<PushQueueRow, "notification_id" | "user_id">;
        Update: Partial<PushQueueRow>;
        Relationships: [];
      };
      push_deliveries: {
        Row: PushDeliveryRow;
        Insert: Insertable<PushDeliveryRow, "queue_id" | "token_id" | "device_ref" | "platform">;
        Update: Partial<PushDeliveryRow>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          title: string;
          body: string | null;
          href: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: { id: string; settings: unknown };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      push_platform: PushPlatform;
      push_revoked_reason: PushRevokedReason;
      push_queue_state: PushQueueState;
      push_queue_outcome: PushQueueOutcome;
      push_delivery_state: PushDeliveryState;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type PushClient = SupabaseClient<PushSchema, "public">;

/**
 * THE ONE CAST IN THIS FEATURE.
 *
 * The runtime object is unchanged: the same service-role client, the same
 * connection, the same row level security bypass it always had. Only the
 * compile-time view of it differs, and only because the generated types are
 * behind the schema. Nothing here grants a privilege or changes a query.
 */
export function asPushClient(client: unknown): PushClient {
  return client as PushClient;
}
