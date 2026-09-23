import { describe, expect, it } from "vitest";
import {
  createDecipheriv,
  createECDH,
  createHmac,
  createPublicKey,
  randomBytes,
  verify as verifyWithKey,
} from "node:crypto";

import {
  encryptForSubscription,
  vapidAuthorization,
  vapidKeysAgree,
  vapidPublicKeyIsValid,
} from "./webpush";

/**
 * THE RECEIVER'S HALF OF RFC 8291, WRITTEN INDEPENDENTLY.
 *
 * This is the only proof available on a machine with no handset attached. A
 * push service answering 201 proves the transport and NOT the encryption:
 * the service cannot read the body either, so a ciphertext no browser can
 * open is accepted just as cheerfully as a correct one. The failure would
 * appear as a notification that never arrives, with a green log line beside
 * it, which is the exact shape of fault this build exists to refuse.
 *
 * So the test plays the browser. It derives the keys from the subscription's
 * private half, unpacks the aes128gcm header, and decrypts. If any byte of
 * the ECDH, the HKDF chain, the nonce or the record delimiter is wrong, the
 * GCM tag fails and this test fails with it.
 */

function base64Url(value: Buffer): string {
  return value.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const hmac = createHmac("sha256", prk);
  hmac.update(info);
  hmac.update(Buffer.from([1]));
  return hmac.digest().subarray(0, length);
}

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return createHmac("sha256", salt).update(ikm).digest();
}

function info(label: string): Buffer {
  return Buffer.concat([Buffer.from(`Content-Encoding: ${label}`, "ascii"), Buffer.from([0])]);
}

/** A browser subscription: a P-256 pair plus a 16 byte auth secret. */
function makeSubscription() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const authSecret = randomBytes(16);
  return {
    privateKey: ecdh.getPrivateKey(),
    publicKey: ecdh.getPublicKey(),
    p256dh: base64Url(ecdh.getPublicKey()),
    auth: base64Url(authSecret),
    authSecret,
  };
}

/** Everything a browser does on receiving an aes128gcm push body. */
function decryptAsBrowser(
  body: Buffer,
  subscription: ReturnType<typeof makeSubscription>,
): { plaintext: Buffer; recordSize: number } {
  const salt = body.subarray(0, 16);
  const recordSize = body.readUInt32BE(16);
  const idLength = body.readUInt8(20);
  const serverPublicKey = body.subarray(21, 21 + idLength);
  const ciphertext = body.subarray(21 + idLength);

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(subscription.privateKey);
  const sharedSecret = ecdh.computeSecret(serverPublicKey);

  const authPrk = hkdfExtract(subscription.authSecret, sharedSecret);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info", "ascii"),
    Buffer.from([0]),
    subscription.publicKey,
    serverPublicKey,
  ]);
  const ikm = hkdfExpand(authPrk, keyInfo, 32);
  const prk = hkdfExtract(salt, ikm);

  const key = hkdfExpand(prk, info("aes128gcm"), 16);
  const nonce = hkdfExpand(prk, info("nonce"), 12);

  const tag = ciphertext.subarray(ciphertext.length - 16);
  const sealed = ciphertext.subarray(0, ciphertext.length - 16);

  const decipher = createDecipheriv("aes-128-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const padded = Buffer.concat([decipher.update(sealed), decipher.final()]);

  return { plaintext: padded, recordSize };
}

describe("web push encryption, decrypted by an independent receiver", () => {
  it("round trips a payload a browser can actually read", () => {
    const subscription = makeSubscription();
    const message = JSON.stringify({ title: "Somebody asked about your flat", href: "/messages" });

    const encrypted = encryptForSubscription({
      payload: Buffer.from(message, "utf8"),
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });

    const { plaintext } = decryptAsBrowser(encrypted.body, subscription);

    /* The final byte is RFC 8188's last-record delimiter and must be 0x02.
       A 0x01 here makes a receiver wait for a record that never comes, which
       is a silent, total failure of delivery. */
    expect(plaintext[plaintext.length - 1]).toBe(0x02);
    expect(plaintext.subarray(0, plaintext.length - 1).toString("utf8")).toBe(message);
  });

  it("carries a well formed aes128gcm header", () => {
    const subscription = makeSubscription();
    const encrypted = encryptForSubscription({
      payload: Buffer.from("x"),
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });

    expect(encrypted.body.readUInt8(20)).toBe(65);
    expect(encrypted.body.subarray(21, 86).equals(encrypted.serverPublicKey)).toBe(true);
    expect(encrypted.salt.length).toBe(16);
    const { recordSize } = decryptAsBrowser(encrypted.body, subscription);
    expect(recordSize).toBeGreaterThan(encrypted.body.length);
  });

  it("uses a fresh ephemeral key and salt for every message", () => {
    const subscription = makeSubscription();
    const payload = Buffer.from("same message twice");
    const first = encryptForSubscription({ payload, p256dh: subscription.p256dh, auth: subscription.auth });
    const second = encryptForSubscription({ payload, p256dh: subscription.p256dh, auth: subscription.auth });

    expect(first.serverPublicKey.equals(second.serverPublicKey)).toBe(false);
    expect(first.salt.equals(second.salt)).toBe(false);
    /* Identical plaintext must not produce identical ciphertext, or a push
       service could tell that the same thing was said twice. */
    expect(first.body.equals(second.body)).toBe(false);
  });

  it("a ciphertext for one subscription cannot be opened by another", () => {
    const intended = makeSubscription();
    const other = makeSubscription();
    const encrypted = encryptForSubscription({
      payload: Buffer.from("private"),
      p256dh: intended.p256dh,
      auth: intended.auth,
    });
    expect(() => decryptAsBrowser(encrypted.body, other)).toThrow();
  });

  it("refuses a subscription key that is not an uncompressed P-256 point", () => {
    expect(() =>
      encryptForSubscription({
        payload: Buffer.from("x"),
        p256dh: base64Url(Buffer.alloc(65, 1)),
        auth: base64Url(randomBytes(16)),
      }),
    ).toThrow(/uncompressed P-256 point/);
  });

  it("refuses an auth secret that is not sixteen bytes", () => {
    const subscription = makeSubscription();
    expect(() =>
      encryptForSubscription({
        payload: Buffer.from("x"),
        p256dh: subscription.p256dh,
        auth: base64Url(randomBytes(8)),
      }),
    ).toThrow(/16 bytes/);
  });
});

describe("the VAPID header", () => {
  function makeVapidPair() {
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    return {
      publicKey: base64Url(ecdh.getPublicKey()),
      privateKey: base64Url(ecdh.getPrivateKey()),
      publicBytes: ecdh.getPublicKey(),
    };
  }

  it("signs a JWT that verifies against the public half", () => {
    const pair = makeVapidPair();
    const header = vapidAuthorization({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      subject: "mailto:hello@vallospaces.com",
      now: 1_700_000_000_000,
    });

    const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
    expect(match).not.toBeNull();
    const [, jwt, k] = match as unknown as [string, string, string];
    expect(k).toBe(pair.publicKey);

    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);
    const [encodedHeader, encodedClaims, encodedSignature] = parts as [string, string, string];
    const signingInput = `${encodedHeader}.${encodedClaims}`;

    const key = createPublicKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        x: base64Url(pair.publicBytes.subarray(1, 33)),
        y: base64Url(pair.publicBytes.subarray(33, 65)),
      },
    });

    /* `ieee-p1363` on both sides. A DER signature here is the single most
       common cause of a 401 from a push service, and it is invisible: the
       JWT looks perfect. */
    const ok = verifyWithKey(
      "sha256",
      Buffer.from(signingInput, "ascii"),
      { key, dsaEncoding: "ieee-p1363" },
      Buffer.from(encodedSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
    );
    expect(ok).toBe(true);
  });

  it("audiences the token at the endpoint's ORIGIN and not its full path", () => {
    const pair = makeVapidPair();
    const header = vapidAuthorization({
      endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAA-long-path",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      subject: "mailto:hello@vallospaces.com",
      now: 1_700_000_000_000,
    });
    const jwt = /t=([^,]+)/.exec(header)?.[1] ?? "";
    const encodedClaims = jwt.split(".")[1] ?? "";
    const claims = JSON.parse(
      Buffer.from(encodedClaims.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as { aud: string; exp: number; sub: string };

    expect(claims.aud).toBe("https://updates.push.services.mozilla.com");
    expect(claims.sub).toBe("mailto:hello@vallospaces.com");
    /* Inside the specification's 24 hour ceiling, and in the future. */
    expect(claims.exp).toBeGreaterThan(1_700_000_000);
    expect(claims.exp - 1_700_000_000).toBeLessThanOrEqual(24 * 60 * 60);
  });

  it("refuses halves that are not a pair, which is otherwise a silent 401", () => {
    const a = makeVapidPair();
    const b = makeVapidPair();
    expect(vapidKeysAgree(a.publicKey, a.privateKey)).toBe(true);
    expect(vapidKeysAgree(a.publicKey, b.privateKey)).toBe(false);
    expect(vapidKeysAgree("not-a-key", a.privateKey)).toBe(false);
  });

  /*
   * THE PAIR THIS USED TO CALL INVALID, AND IT IS A REAL ONE.
   *
   * `ecdh.getPrivateKey()` writes the scalar the way OpenSSL writes a big
   * integer: shortest form, leading zero bytes stripped. So about one key in
   * 256 comes out 31 bytes rather than 32, measured at 17 in 4,000 here
   * against a theoretical 0.39 per cent. Both readers of the private half used
   * to demand exactly 32 bytes, so ONE VAPID PAIR IN EVERY 256 WAS A PERFECTLY
   * VALID PAIR THAT THIS CODE REFUSED, and the message blamed the key rather
   * than the check. It is also why the test above flaked: it generates a fresh
   * pair on every run, so it met the case roughly once in 128 runs and read as
   * a mystery rather than as a defect.
   *
   * This constructs the case deliberately rather than waiting for it, and it
   * fails outright if it cannot find one, because a test that quietly skips
   * the thing it exists to test is worse than no test at all.
   */
  it("accepts a genuine pair whose private scalar has a leading zero", () => {
    let short:
      | { publicKey: string; privateKey: string; publicBytes: Buffer }
      | null = null;
    for (let tries = 0; tries < 20_000 && short === null; tries += 1) {
      const ecdh = createECDH("prime256v1");
      ecdh.generateKeys();
      if (ecdh.getPrivateKey().length < 32) {
        short = {
          publicKey: base64Url(ecdh.getPublicKey()),
          privateKey: base64Url(ecdh.getPrivateKey()),
          publicBytes: ecdh.getPublicKey(),
        };
      }
    }
    expect(short, "no short scalar in 20,000 keys, which should be all but impossible").not.toBeNull();
    const pair = short as { publicKey: string; privateKey: string; publicBytes: Buffer };
    expect(vapidKeysAgree(pair.publicKey, pair.privateKey)).toBe(true);

    /*
     * THE SECOND READER, WHICH IS THE ONE THAT ACTUALLY SENDS.
     *
     * `vapidKeysAgree` only decides whether we refuse at startup. The signing
     * path is what a push service sees, and it carried the same 32 byte
     * demand, so showing the short scalar signing a token that verifies is
     * the half that matters. Without this, the fix to the signing path was
     * covered only by the tests above, which meet a short scalar about once
     * in 256 runs.
     */
    const header = vapidAuthorization({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      subject: "mailto:hello@vallospaces.com",
      now: 1_700_000_000_000,
    });
    const signed = /^vapid t=([^,]+), k=(.+)$/.exec(header);
    expect(signed).not.toBeNull();
    const [, shortJwt] = signed as unknown as [string, string, string];
    const [shortHeader, shortClaims, shortSignature] = shortJwt.split(".") as [
      string,
      string,
      string,
    ];
    const shortVerifyKey = createPublicKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        x: base64Url(pair.publicBytes.subarray(1, 33)),
        y: base64Url(pair.publicBytes.subarray(33, 65)),
      },
    });
    expect(
      verifyWithKey(
        "sha256",
        Buffer.from(`${shortHeader}.${shortClaims}`, "ascii"),
        { key: shortVerifyKey, dsaEncoding: "ieee-p1363" },
        Buffer.from(shortSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
      ),
    ).toBe(true);

    /* And a scalar that is genuinely too long is still refused, because that
       is a different key rather than a shorter spelling of this one. */
    expect(vapidKeysAgree(pair.publicKey, base64Url(randomBytes(33)))).toBe(false);
  });

  it("recognises a well formed public key and rejects a malformed one", () => {
    const pair = makeVapidPair();
    expect(vapidPublicKeyIsValid(pair.publicKey)).toBe(true);
    expect(vapidPublicKeyIsValid(base64Url(randomBytes(32)))).toBe(false);
    expect(vapidPublicKeyIsValid("")).toBe(false);
  });
});
