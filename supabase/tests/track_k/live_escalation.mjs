// Track K live escalation probe. Credentials come from the environment only.
const URL_ = "https://uccixoonmbhrnyczyigt.supabase.co";
const KEY = process.env.SB_ANON;
async function signIn(email, password) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign in failed for ${email.replace(/.*\+/, "+")}: ${r.status}`);
  return { token: j.access_token, id: j.user.id };
}
const H = (t) => ({ apikey: KEY, authorization: `Bearer ${t}`, "content-type": "application/json" });
const rpc = async (t, fn, body) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H(t), body: JSON.stringify(body) }); return `${r.status} ${await r.text()}`; };
const post = async (t, table, body) => { const r = await fetch(`${URL_}/rest/v1/${table}`, { method: "POST", headers: { ...H(t), prefer: "return=minimal" }, body: JSON.stringify(body) }); return `${r.status} ${(await r.text()).slice(0, 120)}`; };
const admin = await signIn(process.env.QA_ADMIN, process.env.QA_PASS);
const member = await signIn(process.env.QA_MEMBER, process.env.QA_PASS);
const out = [];
out.push(["admin (not super) grants member support", await rpc(admin.token, "admin_grant_staff", { p_user: member.id, p_scopes: ["support"], p_note: null })]);
out.push(["member grants self agreements", await rpc(member.token, "admin_grant_staff", { p_user: member.id, p_scopes: ["agreements"], p_note: null })]);
out.push(["admin revokes anybody", await rpc(admin.token, "admin_revoke_staff", { p_user: member.id, p_reason: "probe only" })]);
out.push(["member writes staff_grants directly", await post(member.token, "staff_grants", { user_id: member.id, scopes: ["support"], granted_by: member.id })]);
out.push(["admin writes staff_grants directly", await post(admin.token, "staff_grants", { user_id: member.id, scopes: ["support"], granted_by: admin.id })]);
out.push(["member writes user_roles admin", await post(member.token, "user_roles", { user_id: member.id, role: "admin" })]);
out.push(["admin writes user_roles super_admin", await post(admin.token, "user_roles", { user_id: admin.id, role: "super_admin" })]);
out.push(["member acknowledges handbook", await rpc(member.token, "staff_acknowledge_handbook", { p_version: "2026-09-25" })]);
out.push(["member my_staff_access", await rpc(member.token, "my_staff_access", {})]);
out.push(["member calls legacy grant_staff_role", await rpc(member.token, "grant_staff_role", { acting_admin: admin.id, target_email: "x@example.com", new_role: "super_admin" })]);
out.push(["member calls wallet transfer (retired)", await rpc(member.token, "transfer_between_wallets", {})]);
for (const [k, v] of out) console.log(`${k}: ${v.slice(0, 160)}`);
