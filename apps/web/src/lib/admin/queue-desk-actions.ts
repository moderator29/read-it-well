"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { createAdminClient } from "../supabase/admin";
import { getLocale } from "../locale";
import { writeAudit } from "./audit";
import { requireAdmin } from "./guard";
import { reviewAgentApplication, reviewListing, setTicketStatus } from "./actions";
import { readItemKey, readViewFilters, viewHref, type QueueKind } from "./queue-desk";

/**
 * THE QUEUE DESK'S VERBS. V-89.
 *
 * Take and release write through `queue_take` / `queue_release`, which check
 * the operator role in the database and write their own audit rows. The bulk
 * verbs call the SAME per-item actions the desks use (so a bulk approve is
 * exactly N single approves, with every guard those carry), and add one
 * `queue.bulk` audit row per item sharing one `batch_id`, so a batch can be
 * read back as one decision. A verb that does not apply to a kind (approving
 * a support ticket) is skipped and counted, never forced.
 */

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

function back(formData: FormData, extra: Record<string, string> = {}): string {
  const filters = readViewFilters({
    tab: formData.get("tab") ?? undefined,
    q: formData.get("q") ?? undefined,
    lane: formData.get("lane") ?? undefined,
  });
  const href = viewHref(filters);
  const params = new URLSearchParams(extra).toString();
  return params ? `${href}${href.includes("?") ? "&" : "?"}${params}` : href;
}

export async function takeRow(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if (access.state !== "admin") redirect("/admin");
  const item = readItemKey(formData.get("item"));
  let outcome = "failed";
  if (item) {
    const { data, error } = await (access.supabase as unknown as Rpc).rpc("queue_take", { p_kind: item.kind, p_item: item.id });
    const status = (data as { status?: string } | null)?.status;
    outcome = !error && status === "ok" ? "taken" : status === "taken" ? "held" : "failed";
  }
  revalidatePath("/admin/queue");
  redirect(back(formData, { claim: outcome }));
}

export async function releaseRow(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if (access.state !== "admin") redirect("/admin");
  const item = readItemKey(formData.get("item"));
  if (item) await (access.supabase as unknown as Rpc).rpc("queue_release", { p_kind: item.kind, p_item: item.id });
  revalidatePath("/admin/queue");
  redirect(back(formData, { claim: "released" }));
}

const VERBS = ["approve", "send_back", "assign", "take", "close_spam"] as const;
type Verb = (typeof VERBS)[number];

export async function bulkAct(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if (access.state !== "admin") redirect("/admin");

  const verbRaw = formData.get("verb");
  const verb = (VERBS as readonly string[]).includes(String(verbRaw)) ? (verbRaw as Verb) : null;
  const items = formData
    .getAll("item")
    .map(readItemKey)
    .filter((x): x is { kind: QueueKind; id: string } => x !== null)
    .slice(0, 50);
  if (!verb || items.length === 0) redirect(back(formData, { bulk: "none" }));

  const reasons = getDictionary(await getLocale()).platform.queueDesk.sendBackReasons;
  const reasonKey = String(formData.get("reason") ?? "");
  const reason = (reasons as Record<string, string>)[reasonKey] ?? null;
  const assignee = String(formData.get("to") ?? "");
  const batchId = randomUUID();
  const rpc = access.supabase as unknown as Rpc;
  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    let outcome: "done" | "skipped" | "failed" = "skipped";
    try {
      if (verb === "take" || verb === "assign") {
        if (verb === "assign" && !/^[0-9a-f-]{36}$/i.test(assignee)) {
          outcome = "failed";
        } else {
          const { data, error } =
            verb === "take"
              ? await rpc.rpc("queue_take", { p_kind: item.kind, p_item: item.id, p_batch: batchId })
              : await rpc.rpc("queue_assign", { p_kind: item.kind, p_item: item.id, p_to: assignee, p_batch: batchId });
          outcome = !error && (data as { status?: string } | null)?.status === "ok" ? "done" : "failed";
        }
      } else if (verb === "approve" || verb === "send_back") {
        if (verb === "send_back" && !reason) {
          outcome = "failed";
        } else if (item.kind === "listing") {
          const r = await reviewListing({ listingId: item.id, decision: verb === "approve" ? "approve" : "request_changes", notes: reason ?? undefined });
          outcome = r.ok ? "done" : "failed";
        } else if (item.kind === "application") {
          const r = await reviewAgentApplication({
            applicationId: item.id,
            decision: verb === "approve" ? "approve" : "request_changes",
            notes: reason ?? undefined,
          });
          outcome = r.ok ? "done" : "failed";
        }
      } else if (verb === "close_spam" && item.kind === "ticket") {
        const r = await setTicketStatus({ ticketId: item.id, status: "closed" });
        outcome = r.ok ? "done" : "failed";
      }
    } catch {
      outcome = "failed";
    }
    if (outcome === "done") done += 1;
    else if (outcome === "skipped") skipped += 1;
    else failed += 1;

    /* take and assign write their own row, with the batch id, in the database. */
    if (verb !== "take" && verb !== "assign" && outcome !== "skipped") {
      await writeAudit(createAdminClient(), {
        actorId: access.user.id,
        action: "queue.bulk",
        entityType: item.kind,
        entityId: item.id,
        detail: { batch_id: batchId, verb, outcome, reason_key: verb === "send_back" ? reasonKey : null },
      });
    }
  }

  revalidatePath("/admin/queue");
  redirect(back(formData, { bulk: `${done}-${skipped}-${failed}` }));
}

export async function saveView(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if (access.state !== "admin") redirect("/admin");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const filters = readViewFilters({ tab: formData.get("tab"), q: formData.get("q"), lane: formData.get("lane") });
  if (name.length > 0) {
    await (access.supabase as unknown as { from: (t: string) => { insert: (row: unknown) => PromiseLike<unknown> } })
      .from("admin_saved_views")
      .insert({ owner: access.user.id, name, filters, shared: formData.get("shared") === "on" });
  }
  revalidatePath("/admin/queue");
  redirect(back(formData, { view: name.length > 0 ? "saved" : "unnamed" }));
}

export async function deleteView(formData: FormData): Promise<void> {
  const access = await requireAdmin();
  if (access.state !== "admin") redirect("/admin");
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    await (access.supabase as unknown as {
      from: (t: string) => { delete: () => { eq: (c: string, v: string) => { eq: (c: string, v: string) => PromiseLike<unknown> } } };
    })
      .from("admin_saved_views")
      .delete()
      .eq("id", id)
      .eq("owner", access.user.id);
  }
  revalidatePath("/admin/queue");
  redirect(back(formData));
}
