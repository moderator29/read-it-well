/**
 * A deleted post is deleted.
 *
 * The founder, 23 September: "Deleted means gone from every surface that lists
 * posts, including my profile grid and the feed. The only place a tombstone is
 * ever acceptable is inside a conversation that would otherwise break, where
 * somebody replied to it. Nowhere else, and never on a profile."
 *
 * Deletion is `posts.status = 'REMOVED'` (and `stories.status`,
 * `story_comments.status`). The row survives because `parent_id` cascades and a
 * hard delete would take other people's replies with it. `posts_select` hands
 * an author their OWN removed rows back (`author_id = auth.uid()` is one of its
 * branches), so the database does not keep a deleted post off its author's own
 * profile and feed. Every listing read therefore asks for `status <> REMOVED`
 * itself, at the query, through `DELETED_STATUS` below, never by hiding a card
 * after the rows arrived.
 *
 * Inside a conversation the rule is `pruneDeleted`: a removed row stays only
 * while something that is still there hangs off it, and goes the moment it
 * would be a tombstone with nothing underneath.
 */

/** The status a deleted row carries. Listing reads exclude it with `.neq`. */
export const DELETED_STATUS = "REMOVED" as const;

export function isDeleted(status: string | null | undefined): boolean {
  return status === DELETED_STATUS;
}

type Node = { id: string; parentId: string | null; deleted: boolean };

/**
 * The rows of one conversation with every deleted row that nobody answered
 * taken out.
 *
 * A deleted row survives only while at least one row that is NOT deleted sits
 * somewhere underneath it, because that is the one case where removing it
 * would break the thread. A chain of deleted rows with nothing live at the end
 * goes entirely. Order is preserved. A parent that is not in `rows` (a
 * thread's root, read separately) is simply not considered here.
 */
export function pruneDeleted<T>(
  rows: T[],
  shape: (row: T) => Node,
): T[] {
  const nodes = rows.map(shape);
  const children = new Map<string, Node[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = children.get(node.parentId);
    if (list) list.push(node);
    else children.set(node.parentId, [node]);
  }

  /* Whether a live row sits at or below this one. Memoised, and guarded
     against a cycle a hand-edited row could create. */
  const memo = new Map<string, boolean>();
  const holdsLive = (node: Node, seen: Set<string>): boolean => {
    const known = memo.get(node.id);
    if (known !== undefined) return known;
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    const answer =
      !node.deleted || (children.get(node.id) ?? []).some((child) => holdsLive(child, seen));
    memo.set(node.id, answer);
    return answer;
  };

  return rows.filter((_, index) => {
    const node = nodes[index];
    return node ? holdsLive(node, new Set()) : false;
  });
}

/**
 * Whether a conversation opened on a deleted root is gone altogether.
 *
 * A deleted root with nothing still there under it is not a conversation, it
 * is a tombstone on its own, and a tombstone on its own is exactly what the
 * founder ruled out. The page reads as not found.
 */
export function conversationIsGone(rootDeleted: boolean, survivingReplies: number): boolean {
  return rootDeleted && survivingReplies === 0;
}
