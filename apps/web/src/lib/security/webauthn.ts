import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

/**
 * WEBAUTHN, VERIFIED ON THE SERVER, WITH NO DEPENDENCY. V-81.
 *
 * Face ID and fingerprint as the lock on money only mean something if the
 * SERVER checks the proof. A boolean from JavaScript saying "the person
 * touched the sensor" is a sentence an attacker with a stolen session can
 * write. So the phone's platform authenticator signs a fresh server challenge
 * with a key that never leaves its secure hardware, and this file checks that
 * signature against the public key registered for the account.
 *
 * WHAT IS CHECKED ON A MONEY CONFIRMATION (an assertion):
 *   1. clientDataJSON: type `webauthn.get`, the exact challenge we issued, and
 *      an origin on our allowlist.
 *   2. authenticatorData: the RP id hash is SHA-256 of our RP id; the User
 *      Present AND User Verified flags are set (a biometric or the device
 *      PIN was used, not merely a tap).
 *   3. The signature over authenticatorData || SHA-256(clientDataJSON), with
 *      the stored key: ES256 (P-256) or RS256.
 *   4. The signature counter, when the authenticator keeps one, moved forward
 *      (a cloned key would repeat it). Platform passkeys that report 0 are
 *      allowed, as the specification allows.
 *
 * WHAT IS CHECKED ON ENROLMENT. Attestation is `none`: Vallo does not need to
 * know which phone maker built the sensor. The public key is taken from the
 * browser's `getPublicKey()` (SPKI), the client data is checked as above with
 * type `webauthn.create`, and the enrolment itself sits behind a password
 * re-entry (`money-step-up.ts`), which is what stops a thief with an unlocked
 * session from enrolling their own finger.
 *
 * All pure: bytes in, verdict out. The tests drive it with a key generated in
 * the test, acting as the authenticator.
 */

export type Alg = -7 | -257;

export function b64urlToBuffer(value: string): Buffer {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function bufferToB64url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type ClientData = { type?: unknown; challenge?: unknown; origin?: unknown };

export type ClientDataCheck =
  | { ok: true }
  | { ok: false; reason: "unreadable" | "wrong_type" | "wrong_challenge" | "wrong_origin" };

export function checkClientData(
  clientDataJSON: Buffer,
  expected: { type: "webauthn.create" | "webauthn.get"; challenge: string; origins: readonly string[] },
): ClientDataCheck {
  let data: ClientData;
  try {
    data = JSON.parse(clientDataJSON.toString("utf8")) as ClientData;
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (data.type !== expected.type) return { ok: false, reason: "wrong_type" };
  if (typeof data.challenge !== "string" || data.challenge !== expected.challenge) {
    return { ok: false, reason: "wrong_challenge" };
  }
  if (typeof data.origin !== "string" || !expected.origins.includes(data.origin)) {
    return { ok: false, reason: "wrong_origin" };
  }
  return { ok: true };
}

export type AuthData = { rpIdHash: Buffer; userPresent: boolean; userVerified: boolean; signCount: number };

export function parseAuthData(authData: Buffer): AuthData | null {
  if (authData.length < 37) return null;
  const flags = authData[32]!;
  return {
    rpIdHash: authData.subarray(0, 32),
    userPresent: (flags & 0x01) !== 0,
    userVerified: (flags & 0x04) !== 0,
    signCount: authData.readUInt32BE(33),
  };
}

export function rpIdHash(rpId: string): Buffer {
  return createHash("sha256").update(rpId).digest();
}

type ClientDataFailure = Extract<ClientDataCheck, { ok: false }>["reason"];

export type AssertionVerdict =
  | { ok: true; signCount: number }
  | {
      ok: false;
      reason: ClientDataFailure | "bad_auth_data" | "wrong_rp" | "not_verified" | "bad_key" | "bad_signature" | "replayed";
    };

export function verifyAssertion(input: {
  clientDataJSON: Buffer;
  authenticatorData: Buffer;
  signature: Buffer;
  publicKeySpki: Buffer;
  alg: Alg;
  storedSignCount: number;
  challenge: string;
  origins: readonly string[];
  rpId: string;
}): AssertionVerdict {
  const client = checkClientData(input.clientDataJSON, {
    type: "webauthn.get",
    challenge: input.challenge,
    origins: input.origins,
  });
  if (!client.ok) return { ok: false, reason: client.reason };

  const auth = parseAuthData(input.authenticatorData);
  if (!auth) return { ok: false, reason: "bad_auth_data" };
  if (!auth.rpIdHash.equals(rpIdHash(input.rpId))) return { ok: false, reason: "wrong_rp" };
  if (!auth.userPresent || !auth.userVerified) return { ok: false, reason: "not_verified" };

  let key;
  try {
    key = createPublicKey({ key: input.publicKeySpki, format: "der", type: "spki" });
  } catch {
    return { ok: false, reason: "bad_key" };
  }
  const signed = Buffer.concat([input.authenticatorData, createHash("sha256").update(input.clientDataJSON).digest()]);
  let valid = false;
  try {
    valid =
      input.alg === -7
        ? verifySignature("sha256", signed, { key, dsaEncoding: "der" }, input.signature)
        : verifySignature("sha256", signed, key, input.signature);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "bad_signature" };

  if (auth.signCount !== 0 || input.storedSignCount !== 0) {
    if (auth.signCount <= input.storedSignCount) return { ok: false, reason: "replayed" };
  }
  return { ok: true, signCount: auth.signCount };
}

/** A public key the browser handed over at enrolment, checked for shape. */
export function readEnrolKey(spkiB64url: string, alg: number): { spki: Buffer; alg: Alg } | null {
  if (alg !== -7 && alg !== -257) return null;
  try {
    const spki = b64urlToBuffer(spkiB64url);
    const key = createPublicKey({ key: spki, format: "der", type: "spki" });
    const type = key.asymmetricKeyType;
    if (alg === -7 && (type !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1")) return null;
    if (alg === -257 && type !== "rsa") return null;
    return { spki, alg };
  } catch {
    return null;
  }
}
