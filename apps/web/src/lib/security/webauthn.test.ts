import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bufferToB64url, checkClientData, readEnrolKey, rpIdHash, verifyAssertion } from "./webauthn";

/* The test is the authenticator: a P-256 key, and the bytes a phone would send. */
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const SPKI = publicKey.export({ format: "der", type: "spki" }) as Buffer;
const RP = "www.vallospaces.com";
const ORIGIN = "https://www.vallospaces.com";
const CHALLENGE = bufferToB64url(Buffer.from("a-fresh-server-challenge-32-bytes"));

function authData(flags: number, count: number, rp = RP): Buffer {
  const counter = Buffer.alloc(4);
  counter.writeUInt32BE(count);
  return Buffer.concat([rpIdHash(rp), Buffer.from([flags]), counter]);
}

function assertion(over: { type?: string; challenge?: string; origin?: string; flags?: number; count?: number; rp?: string } = {}) {
  const clientDataJSON = Buffer.from(
    JSON.stringify({ type: over.type ?? "webauthn.get", challenge: over.challenge ?? CHALLENGE, origin: over.origin ?? ORIGIN }),
  );
  const authenticatorData = authData(over.flags ?? 0x05, over.count ?? 7, over.rp);
  const signature = sign("sha256", Buffer.concat([authenticatorData, createHash("sha256").update(clientDataJSON).digest()]), {
    key: privateKey,
    dsaEncoding: "der",
  });
  return { clientDataJSON, authenticatorData, signature };
}

const base = { publicKeySpki: SPKI, alg: -7 as const, storedSignCount: 3, challenge: CHALLENGE, origins: [ORIGIN], rpId: RP };

describe("verifyAssertion (V-81)", () => {
  it("accepts a verified, signed, fresh assertion", () => {
    expect(verifyAssertion({ ...base, ...assertion() })).toEqual({ ok: true, signCount: 7 });
  });
  it("refuses a tap without user verification (no biometric, no device PIN)", () => {
    expect(verifyAssertion({ ...base, ...assertion({ flags: 0x01 }) })).toMatchObject({ ok: false, reason: "not_verified" });
  });
  it("refuses another challenge, another origin, another RP and another ceremony", () => {
    expect(verifyAssertion({ ...base, ...assertion({ challenge: "old" }) })).toMatchObject({ reason: "wrong_challenge" });
    expect(verifyAssertion({ ...base, ...assertion({ origin: "https://evil.example" }) })).toMatchObject({ reason: "wrong_origin" });
    expect(verifyAssertion({ ...base, ...assertion({ rp: "evil.example" }) })).toMatchObject({ reason: "wrong_rp" });
    expect(verifyAssertion({ ...base, ...assertion({ type: "webauthn.create" }) })).toMatchObject({ reason: "wrong_type" });
  });
  it("refuses a signature from another key", () => {
    const other = generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ format: "der", type: "spki" }) as Buffer;
    expect(verifyAssertion({ ...base, publicKeySpki: other, ...assertion() })).toMatchObject({ reason: "bad_signature" });
  });
  it("refuses a counter that did not move (a cloned key), and allows a passkey that reports zero", () => {
    expect(verifyAssertion({ ...base, ...assertion({ count: 3 }) })).toMatchObject({ reason: "replayed" });
    expect(verifyAssertion({ ...base, storedSignCount: 0, ...assertion({ count: 0 }) })).toEqual({ ok: true, signCount: 0 });
  });
});

describe("enrolment checks", () => {
  it("reads a P-256 key and refuses a mismatched algorithm", () => {
    expect(readEnrolKey(bufferToB64url(SPKI), -7)?.alg).toBe(-7);
    expect(readEnrolKey(bufferToB64url(SPKI), -257)).toBeNull();
    expect(readEnrolKey("not-a-key", -7)).toBeNull();
  });
  it("checks the creation ceremony's client data", () => {
    const data = Buffer.from(JSON.stringify({ type: "webauthn.create", challenge: CHALLENGE, origin: ORIGIN }));
    expect(checkClientData(data, { type: "webauthn.create", challenge: CHALLENGE, origins: [ORIGIN] })).toEqual({ ok: true });
    expect(checkClientData(Buffer.from("{"), { type: "webauthn.create", challenge: CHALLENGE, origins: [ORIGIN] })).toMatchObject({
      reason: "unreadable",
    });
  });
});
