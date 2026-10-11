/**
 * THE PROVIDER BOUNDARY. Everything Vallo asks of a media provider, and
 * nothing about calls themselves: who may call whom, the lifecycle, history,
 * notifications and reviews all live above this line, in Vallo's database.
 *
 * A provider is media infrastructure only. Swapping LiveKit for another one
 * means writing one more file that implements `CallProvider`; no screen, no
 * action and no table changes. The only provider-specific value that crosses
 * this line is `JoinCredentials.serverUrl` + `token`, which the call screen
 * hands to that provider's client SDK.
 */

export type ProviderName = "livekit";

export type ParticipantGrant = {
  /** The server-minted room name (`vc_` + 32 hex). */
  room: string;
  /** The opaque participant identity (`vp_` + 32 hex). Never an account id. */
  identity: string;
  /** What the other side sees as a label. */
  displayName: string;
  /** False on a voice call: the token cannot publish a camera. */
  canPublishVideo: boolean;
  /** Seconds the token stays valid for starting a connection. */
  ttlSeconds: number;
};

export type IssuedCredentials = {
  serverUrl: string;
  token: string;
  expiresAt: Date;
};

export type ProviderEventName =
  | "room_started"
  | "room_finished"
  | "participant_joined"
  | "participant_left"
  | "participant_connection_aborted"
  | "track_published"
  | "track_unpublished"
  | "egress_started"
  | "egress_ended"
  | "other";

/** A provider webhook, verified and reduced to the facts Vallo acts on. */
export type ProviderEvent = {
  provider: ProviderName;
  /** The provider's own unique id for this delivery: the idempotency key. */
  eventId: string;
  event: ProviderEventName;
  room: string | null;
  identity: string | null;
  /** When the provider says it happened. Used to order facts, never to measure billing. */
  occurredAt: Date | null;
};

export type ProviderErrorKind = "unconfigured" | "unauthorised" | "not_found" | "unavailable" | "rejected";

export class CallProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly status: number | null;
  constructor(kind: ProviderErrorKind, message: string, status: number | null = null) {
    super(message);
    this.name = "CallProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export interface CallProvider {
  readonly name: ProviderName;
  /** The websocket URL clients connect to. Public, not a secret. */
  readonly serverUrl: string;
  /** Create the room ahead of the first join, capped at `maxParticipants`. Idempotent. */
  prepareRoom(room: string, options: { maxParticipants: number; emptyTimeoutSeconds: number }): Promise<void>;
  /** A short-lived credential for one identity in one room. Server side only. */
  issueParticipantCredentials(grant: ParticipantGrant): Promise<IssuedCredentials>;
  /** Close the room and disconnect everyone in it. Idempotent: a missing room is success. */
  endRoom(room: string): Promise<void>;
  /** The identities the provider says are connected right now. */
  listParticipants(room: string): Promise<string[]>;
  /** Verify a webhook delivery against the raw body and return its facts, or null if it is not genuine. */
  verifyWebhook(rawBody: string, authorization: string | null): Promise<ProviderEvent | null>;
}
