import { areaIntelTool } from "./area-intel";
import { compareListingsTool } from "./compare-listings";
import { findScreenTool } from "./find-screen";
import { searchListingsTool } from "./search-listings";
import type { AssistantTool, ToolContext, ToolDefinition, ToolFrame, ToolOutcome } from "./types";

/**
 * THE ASSISTANT'S TOOLS, IN ONE LIST (AI-01).
 *
 * The order is the order the Claude API is shown them, which is the order the
 * route always sent the first three in.
 */
export const TOOL_REGISTRY: readonly AssistantTool[] = [
  searchListingsTool,
  compareListingsTool,
  areaIntelTool,
  findScreenTool,
];

/** The tools offered in `frame`. A tool outside its frames is not offered. */
export function toolsFor(frame: ToolFrame, registry: readonly AssistantTool[] = TOOL_REGISTRY): AssistantTool[] {
  return registry.filter((tool) => tool.workspaces.includes(frame));
}

/** The `tools` field of a Claude API request, for `frame`. */
export function toolDefinitions(
  frame: ToolFrame,
  registry: readonly AssistantTool[] = TOOL_REGISTRY,
): ToolDefinition[] {
  return toolsFor(frame, registry).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

export type ToolRun = { ok: true; outcome: ToolOutcome } | { ok: false; error: string };

/**
 * Run the tool the model named. Never throws: an unknown name, a tool not
 * offered in this frame, input the schema refuses, or a tool that fails all
 * come back as an error for the model to read, and the conversation carries
 * on.
 *
 * Anything unrecognised is refused honestly rather than falling through to a
 * search, because a model inventing a tool name and receiving plausible data
 * is worse than one told it asked for something that does not exist.
 */
export async function runTool(
  name: string,
  input: unknown,
  ctx: ToolContext,
  registry: readonly AssistantTool[] = TOOL_REGISTRY,
): Promise<ToolRun> {
  const tool = registry.find((t) => t.name === name);
  if (!tool) return { ok: false, error: `There is no tool called ${name}.` };
  if (!tool.workspaces.includes(ctx.frame)) {
    return { ok: false, error: `The tool ${name} is not available here.` };
  }
  const parsed = tool.input.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "input"}: ${issue.message}`)
      .join("; ");
    return {
      ok: false,
      error: `${name} was called with input that does not match its schema (${problems}). Fix the input and call it again.`,
    };
  }
  try {
    return { ok: true, outcome: await tool.run(ctx, parsed.data) };
  } catch {
    return { ok: false, error: `${name} could not finish just now. Answer without it and say so.` };
  }
}
