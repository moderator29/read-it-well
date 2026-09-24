/**
 * `nf/server-actions-export-only-actions`
 *
 * THE RULE THE OUTAGE OF 19 SEPTEMBER ASKED FOR.
 *
 * Three production deploys went red, one of which changed only documentation,
 * because they all inherited one line: `export type { FeedMode };` in
 * `app/(app)/around/feed-actions.ts`. Turbopack builds one actions manifest
 * per "use server" module from its named exports and asks for an action id for
 * every one of them, so it asked for an id for a type. TypeScript erases a
 * type re-export, so `tsc --noEmit` was silent; it is not a runtime value, so
 * the whole test suite was silent; the CSS checker has nothing to say about
 * it. `next build` was the only gate that saw it, and `next build` is the slow
 * gate, the one a tired person skips, and the one that was skipped.
 * It cost twenty minutes of production on 19 September 2026.
 *
 * So the same defect is now an ERROR IN LINT, which runs in seconds, runs in
 * CI on every push, and runs in the editor while the line is being typed. The
 * build gate stays exactly where it is: this rule is the early warning, not a
 * replacement for it.
 *
 * WHAT IS LEGAL IN A "use server" MODULE, and the distinction matters because
 * one half of it is the trap:
 *
 *   export async function doThing() {}      an action. The only value export.
 *   export type Thing = { ... }             a type DECLARED here. Erased whole
 *   export interface Thing { ... }          by the compiler, so no export
 *                                           statement survives into the module
 *                                           the bundler reads. Legal.
 *
 * WHAT IS NOT:
 *
 *   export type { Thing };                  a re-export STATEMENT. Erased by
 *   export type { Thing } from "./x";       tsc, so tsc says nothing, and it is
 *   export { Thing } from "./x";            still a named export as far as the
 *   export * from "./x";                    manifest builder is concerned.
 *   export const LIMIT = 10;                a value that is not an action.
 *   export function sync() {}               not async, so not an action.
 *   export default ...                      an unnamed action the manifest
 *                                           cannot key.
 *
 * THE FIX IS ALWAYS THE SAME SHAPE and the message says it: the type or the
 * constant moves to a plain module beside the actions file and every consumer
 * imports it from there. `lib/admin/schema.ts` is the pattern already in the
 * tree, and its own header says why it exists.
 *
 * SCOPE. Only a module whose FIRST statement is the "use server" directive.
 * A `"use server"` inside a single function body marks that one function and
 * leaves the module an ordinary one, so it is left alone here.
 */

const DIRECTIVE = "use server";

/** True when this statement is the literal `"use server";`. */
function isServerDirective(node) {
  if (!node || node.type !== "ExpressionStatement") return false;
  const expression = node.expression;
  if (!expression || expression.type !== "Literal") return false;
  return expression.value === DIRECTIVE;
}

/** A module is a server-action module when its first statement is the directive. */
function hasModuleDirective(program) {
  for (const statement of program.body) {
    if (isServerDirective(statement)) return true;
    // Directives come first, before anything else. The first non-directive
    // statement ends the prologue.
    if (statement.type !== "ExpressionStatement") return false;
    if (statement.expression?.type !== "Literal") return false;
  }
  return false;
}

const MOVE_IT =
  'Move it to a plain module beside this one and import it from there, the way lib/admin/schema.ts does.';

/* Named, then exported, so this file adds no `import/no-anonymous-default-export`
   warning of its own to a tree that already carries a population of them. */
const plugin = {
  rules: {
    "server-actions-export-only-actions": {
      meta: {
        type: "problem",
        docs: {
          description:
            'A "use server" module may export async functions and nothing else: anything else asks the actions manifest for an id it cannot make, and only `next build` sees it.',
        },
        schema: [],
        messages: {
          reexport:
            'A "use server" module may export async functions and nothing else, and a re-export statement is not erased by the bundler even when TypeScript erases it. This is the line that took production down on 19 September (BUILD_06_LEDGER 7.0). ' +
            MOVE_IT,
          typeReexport:
            'A "use server" module may export async functions and nothing else. `export type { ... }` is a STATEMENT, not a declaration: TypeScript erases it so the typecheck stays green, and Turbopack still asks the actions manifest for an id for it. This is the exact line that took production down on 19 September (BUILD_06_LEDGER 7.0). ' +
            MOVE_IT,
          value:
            'A "use server" module may export async functions and nothing else, so this value export cannot be given an action id. ' +
            MOVE_IT,
          notAsync:
            'A "use server" module may export async functions and nothing else. This function is not async, so it is not an action. Make it async, or move it out of this module.',
          defaultExport:
            'A "use server" module may export async functions and nothing else, and a default export has no name for the actions manifest to key. Give the action a name.',
        },
      },
      create(context) {
        return {
          Program(program) {
            if (!hasModuleDirective(program)) return;

            for (const node of program.body) {
              if (node.type === "ExportAllDeclaration") {
                context.report({ node, messageId: "reexport" });
                continue;
              }

              if (node.type === "ExportDefaultDeclaration") {
                context.report({ node, messageId: "defaultExport" });
                continue;
              }

              if (node.type !== "ExportNamedDeclaration") continue;

              // `export { a }`, `export { a } from "./x"`, `export type { a }`.
              if (!node.declaration) {
                const messageId =
                  node.exportKind === "type" ||
                  (node.specifiers ?? []).some((one) => one.exportKind === "type")
                    ? "typeReexport"
                    : "reexport";
                context.report({ node, messageId });
                continue;
              }

              const declaration = node.declaration;

              // A type or interface DECLARED here is erased whole. Legal.
              if (
                declaration.type === "TSTypeAliasDeclaration" ||
                declaration.type === "TSInterfaceDeclaration" ||
                declaration.type === "TSDeclareFunction"
              ) {
                continue;
              }

              if (declaration.type === "FunctionDeclaration") {
                if (!declaration.async) {
                  context.report({ node: declaration, messageId: "notAsync" });
                }
                continue;
              }

              context.report({ node: declaration, messageId: "value" });
            }
          },
        };
      },
    },
  },
};

export default plugin;
