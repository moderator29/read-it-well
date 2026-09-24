"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { adminRefusal, requireAdmin } from "./guard";
import { STR_LINK_KINDS, STR_SOURCES, strResultText } from "./str";

/**
 * SCUML item 6: the STR lane's actions. Each one calls a definer function
 * that checks the caller is staff and enforces the rules itself (the second
 * person of item 19, the append-only register); these only shape the answer.
 * They run under the admin's own session, never the service role, so the
 * database knows who decided and who approved.
 */

const copy = getDictionary("en").complianceStr;

type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

type StrAnswer = ActionResult<{ text: string; data: unknown }>;

async function call(fn: string, args: Record<string, unknown>): Promise<StrAnswer> {
  const access = await requireAdmin();
  if (access.state !== "admin") return fail<{ text: string; data: unknown }>(adminRefusal(access));
  const { data, error } = await (access.supabase as unknown as RpcCaller).rpc(fn, args);
  if (error) return fail<{ text: string; data: unknown }>(copy.results.failed);
  const result = strResultText(data, copy);
  revalidatePath("/admin/compliance");
  const status = typeof data === "string" ? data : (data as { status?: string } | null)?.status;
  if (status === "opened") return ok({ text: "", data });
  return result.ok ? ok({ text: result.text, data }) : fail<{ text: string; data: unknown }>(result.text);
}

const id = z.string().uuid();

const openSchema = z.object({
  sourceKind: z.enum(STR_SOURCES),
  sourceId: z.string().trim().min(1).max(200),
  subjectId: z.union([z.string().uuid(), z.literal("")]).optional(),
  grounds: z.string().trim().min(20).max(8000),
});

export async function openStrCase(input: unknown): Promise<StrAnswer> {
  const parsed = validate(openSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_open_case", {
    p_source_kind: parsed.data.sourceKind,
    p_source_id: parsed.data.sourceId,
    p_subject: parsed.data.subjectId ? parsed.data.subjectId : null,
    p_grounds: parsed.data.grounds,
  });
}

const decideSchema = z.object({
  caseId: id,
  decision: z.enum(["file", "no_file"]),
  reasons: z.string().trim().min(20).max(8000),
});

export async function decideStr(input: unknown): Promise<StrAnswer> {
  const parsed = validate(decideSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_decide", { p_case: parsed.data.caseId, p_decision: parsed.data.decision, p_reasons: parsed.data.reasons });
}

const approveSchema = z.object({ decisionId: id, approve: z.boolean(), note: z.string().trim().max(4000).optional() });

export async function approveStr(input: unknown): Promise<StrAnswer> {
  const parsed = validate(approveSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_approve", {
    p_decision: parsed.data.decisionId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note ?? null,
  });
}

const filingSchema = z.object({
  caseId: id,
  reference: z.string().trim().min(3).max(200),
  filedAt: z.string().datetime({ offset: true }),
});

export async function recordStrFiling(input: unknown): Promise<StrAnswer> {
  const parsed = validate(filingSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_record_filing", {
    p_case: parsed.data.caseId,
    p_goaml_reference: parsed.data.reference,
    p_filed_at: parsed.data.filedAt,
  });
}

const linkSchema = z.object({ caseId: id, kind: z.enum(STR_LINK_KINDS), ref: z.string().trim().min(1).max(200) });

export async function linkStr(input: unknown): Promise<StrAnswer> {
  const parsed = validate(linkSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_link", { p_case: parsed.data.caseId, p_kind: parsed.data.kind, p_ref: parsed.data.ref });
}

const holdSchema = z.object({ caseId: id });

export async function holdStrSubject(input: unknown): Promise<StrAnswer> {
  const parsed = validate(holdSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_place_hold", { p_case: parsed.data.caseId });
}

const releaseSchema = z.object({ caseId: id, note: z.string().trim().min(5).max(2000) });

export async function releaseStrHold(input: unknown): Promise<StrAnswer> {
  const parsed = validate(releaseSchema, input);
  if (!parsed.ok) return fail<{ text: string; data: unknown }>(parsed.error);
  return call("str_release_hold", { p_case: parsed.data.caseId, p_note: parsed.data.note });
}
