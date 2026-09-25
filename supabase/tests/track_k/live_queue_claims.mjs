const URL_ = "https://uccixoonmbhrnyczyigt.supabase.co", KEY = process.env.SB_ANON;
async function signIn(email) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: KEY, "content-type": "application/json" }, body: JSON.stringify({ email, password: process.env.QA_PASS }) });
  const j = await r.json(); return { t: j.access_token, id: j.user.id };
}
const H = (t) => ({ apikey: KEY, authorization: `Bearer ${t}`, "content-type": "application/json" });
const rpc = async (t, fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: H(t), body: JSON.stringify(body) }); return [r.status, await r.json().catch(() => null)]; };
const get = async (t, q) => { const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H(t) }); return [r.status, await r.json().catch(() => null)]; };
const FLAG = process.env.FLAG_ID;
const admin = await signIn(process.env.QA_ADMIN), member = await signIn(process.env.QA_MEMBER);
const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
const [, ops] = await rpc(admin.t, "queue_operators");
log("admin: queue_operators (assign menu)", ops);
const other = (ops || []).map((o) => o.user_id).find((id) => id !== admin.id);
log("admin: take the flag", await rpc(admin.t, "queue_take", { p_kind: "flag", p_item: FLAG }));
log("admin: claim row as read by the desk", await get(admin.t, `queue_claims?select=kind,claimed_by&item_id=eq.${FLAG}`));
log("admin: take it again (keeps it warm)", await rpc(admin.t, "queue_take", { p_kind: "flag", p_item: FLAG }));
log("member: take the same flag", await rpc(member.t, "queue_take", { p_kind: "flag", p_item: FLAG }));
log("member: read claims", await get(member.t, `queue_claims?select=kind&item_id=eq.${FLAG}`));
log("member: assign it to themselves", await rpc(member.t, "queue_assign", { p_kind: "flag", p_item: FLAG, p_to: member.id }));
log("admin: assign to the member (not an operator)", await rpc(admin.t, "queue_assign", { p_kind: "flag", p_item: FLAG, p_to: member.id }));
if (other) {
  log("admin: assign to the other operator", await rpc(admin.t, "queue_assign", { p_kind: "flag", p_item: FLAG, p_to: other }));
  log("admin: claim now held by", (await get(admin.t, `queue_claims?select=claimed_by&item_id=eq.${FLAG}`))[1]?.[0]?.claimed_by === other ? "the other operator" : "UNEXPECTED");
  log("admin: take it back while it is live (refused)", await rpc(admin.t, "queue_take", { p_kind: "flag", p_item: FLAG }));
  log("admin: release a claim that is not theirs", await rpc(admin.t, "queue_release", { p_kind: "flag", p_item: FLAG }));
  log("admin: assign it back to themselves", await rpc(admin.t, "queue_assign", { p_kind: "flag", p_item: FLAG, p_to: admin.id }));
}
log("admin: release it", await rpc(admin.t, "queue_release", { p_kind: "flag", p_item: FLAG }));
log("admin: claims left on the flag", await get(admin.t, `queue_claims?select=kind&item_id=eq.${FLAG}`));
log("admin: audit trail for the flag", (await get(admin.t, `audit_log?select=action&entity_id=eq.${FLAG}&action=like.queue.*&order=created_at`))[1]?.map((a) => a.action));
