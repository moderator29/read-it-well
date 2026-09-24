#!/usr/bin/env node
/**
 * OPS-15: every <script> a page serves carries the nonce its own
 * Content-Security-Policy names, or the browser refuses it.
 *
 *   node scripts/check-script-nonces.mjs https://<preview-host> [/path ...]
 *
 * Fetches each path (default: /, /about, /sign-in, /welcome, /help), reads the
 * nonce out of the response's content-security-policy header, and fails
 * listing every script tag that does not carry exactly that nonce. Run it
 * against a preview deployment before promoting one.
 */
const [base, ...rest] = process.argv.slice(2);
if (!base) {
  console.error("usage: node scripts/check-script-nonces.mjs <origin> [/path ...]");
  process.exit(2);
}
const paths = rest.length > 0 ? rest : ["/", "/about", "/sign-in", "/welcome", "/help"];

let failed = 0;
for (const path of paths) {
  const res = await fetch(new URL(path, base), { redirect: "manual" });
  const policy = res.headers.get("content-security-policy") ?? "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  const html = await res.text();
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  const bare = tags.filter((tag) => !nonce || !tag.includes(`nonce="${nonce}"`));
  if (bare.length > 0) {
    failed += bare.length;
    console.error(`${path}: ${bare.length} of ${tags.length} scripts lack the policy nonce`);
    for (const tag of bare) console.error(`  ${tag.slice(0, 160)}`);
  } else {
    console.log(`${path}: ${tags.length} scripts, every one carries the policy nonce`);
  }
}
process.exit(failed > 0 ? 1 : 0);
