import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { phoneSignInEnabled } from "./phone-sign-in-flag";
import { readSmsHookPayload, smsCodeMessage, smsHookSecret, smsHookVerified } from "./sms-hook";
import { termiiChannels, termiiConfig, termiiNumber, termiiTransport } from "../phone-otp/termii";

const SECRET = Buffer.from("a-thirty-two-byte-long-test-key!!").toString("base64");

function sign(body: string, id = "msg_1", ts = 1_000) {
  const sig = createHmac("sha256", Buffer.from(SECRET, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  return { id, timestamp: String(ts), signature: `v1,${sig}` };
}

describe("A2 phone sign-in is off by default", () => {
  it("needs PHONE_SIGNIN_ENABLED=true exactly", () => {
    expect(phoneSignInEnabled({})).toBe(false);
    expect(phoneSignInEnabled({ PHONE_SIGNIN_ENABLED: "1" })).toBe(false);
    expect(phoneSignInEnabled({ PHONE_SIGNIN_ENABLED: "true" })).toBe(true);
  });

  it("has no Termii transport without both the key and the sender id", () => {
    expect(termiiConfig({})).toBeNull();
    expect(termiiConfig({ TERMII_API_KEY: "k" })).toBeNull();
    expect(termiiConfig({ TERMII_API_KEY: "k", TERMII_SENDER_ID: "Vallo" })?.whatsapp).toBe(false);
  });
});

describe("A2 the Send SMS hook", () => {
  const keys = smsHookSecret({ SEND_SMS_HOOK_SECRET: `v1,whsec_${SECRET}` });
  const body = JSON.stringify({ user: { phone: "2348031234567" }, sms: { otp: "123456" } });

  it("accepts only a fresh Standard Webhooks signature", () => {
    expect(smsHookVerified(keys, sign(body), body, 1_010)).toBe(true);
    expect(smsHookVerified(keys, sign(body), `${body} `, 1_010)).toBe(false);
    expect(smsHookVerified(keys, sign(body), body, 2_000)).toBe(false);
    expect(smsHookVerified([], sign(body), body, 1_010)).toBe(false);
  });

  it("reads the phone and the code, and writes a message with the code first and no link", () => {
    expect(readSmsHookPayload(body)).toEqual({ phone: "+2348031234567", otp: "123456" });
    expect(readSmsHookPayload('{"user":{"phone":"+234"},"sms":{"otp":"12"}}')).toBeNull();
    const message = smsCodeMessage("123456");
    expect(message.startsWith("123456")).toBe(true);
    expect(message).not.toMatch(/https?:/);
  });
});

describe("A2 Termii: WhatsApp first, then the DND route", () => {
  const config = { apiKey: "k", senderId: "Vallo", whatsapp: true, baseUrl: "https://termii.test" };

  it("tries the channels in order and stops at the first that takes it", async () => {
    expect(termiiChannels(config)).toEqual(["whatsapp", "dnd", "generic"]);
    expect(termiiChannels({ ...config, whatsapp: false })).toEqual(["dnd", "generic"]);
    const calls: string[] = [];
    const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
      const channel = JSON.parse(String(init.body)).channel as string;
      calls.push(channel);
      return channel === "whatsapp"
        ? new Response(JSON.stringify({ code: "error" }), { status: 400 })
        : new Response(JSON.stringify({ code: "ok", message_id: "1" }), { status: 200 });
    });
    const result = await termiiTransport(config, fetcher).send("+2348031234567", "123456 is your Vallo code.");
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual(["whatsapp", "dnd"]);
  });

  it("only sends to a Nigerian mobile number", () => {
    expect(termiiNumber("+2348031234567")).toBe("2348031234567");
    expect(termiiNumber("+14155550100")).toBeNull();
  });
});

describe("email is untouched by phone sign-in", () => {
  const read = (path: string) => readFileSync(join(__dirname, path), "utf8");

  it("the email sign-in and sign-up paths never reach the SMS provider", () => {
    for (const file of ["./actions.ts", "./email-code.ts", "../../app/api/auth/email-hook/route.ts", "../email/client.ts"]) {
      const source = read(file);
      expect(source, file).not.toMatch(/phone-otp|termii|sms-hook|otpTransport/i);
      expect(source, file).not.toMatch(/signInWithOtp\(\s*\{\s*phone/);
    }
  });

  it("the email code asks GoTrue for an email code for an existing account only", () => {
    const source = read("./email-code.ts");
    expect(source).toMatch(/signInWithOtp\(\{ email, options: \{ shouldCreateUser: false \} \}\)/);
  });

  it("the SMS hook sends only through the phone transport, never through email", () => {
    const source = read("../../app/api/auth/sms-hook/route.ts");
    expect(source).not.toMatch(/lib\/email|sendMessage|resend/i);
  });
});
