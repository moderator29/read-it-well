import type { PostView } from "@/components/social/feed/PostCard";
import { getDictionary } from "@vallo/i18n";
import { sheetWordsOf } from "@/components/social/sheet-words";
import { Feed } from "@/components/social/feed/Feed";
import { ProfilePosts } from "@/components/social/profile/ProfilePosts";
import { ThreadView } from "@/app/(app)/post/[id]/ThreadView";
import type { ThreadReply } from "@/lib/social/posts-queries";
import { conversationIsGone, pruneDeleted } from "@/lib/social/deleted-posts";
import { PERSON, COUNTERPART } from "../../_fixtures/people";

/**
 * `/preview/session-b/posts`: item 4, "a deleted post is deleted", on the
 * real components. FIXTURE PROPS, NOT DATA: the posts are invented; the live
 * reads are proved by `lib/social/reads-deleted.test.ts`.
 *
 * Every panel is handed deleted posts ON PURPOSE, with and without replies,
 * the way `posts_select` hands an author their own removed rows:
 *   1. the feed (`Feed`), handed a live post and two deleted ones
 *   2. the owner's profile Posts tab (`ProfilePosts`), handed the same
 *   3. a thread (`ThreadView`) whose replies went through `pruneDeleted`, the
 *      function `getThread` uses: a deleted reply nobody answered, and one
 *      somebody did
 *   4. a thread opened on a deleted root that somebody answered
 * Expected: panels 1 and 2 draw the live post only and no tombstone; panel 3
 * draws exactly one tombstone (the answered reply); panel 4 draws the root as
 * the tombstone. A deleted root nobody answered is `conversationIsGone`, so
 * `getThread` answers not found and there is no panel for it.
 */

const me = {
  id: PERSON.id,
  handle: PERSON.handle,
  displayLabel: PERSON.name,
  avatarPath: null,
  isAgent: false,
  moderatorOf: null,
};
const them = {
  id: COUNTERPART.id,
  handle: COUNTERPART.handle,
  displayLabel: COUNTERPART.name,
  avatarPath: null,
  isAgent: false,
  moderatorOf: null,
};

function post(over: Partial<PostView> & Pick<PostView, "id">): PostView {
  return {
    kind: "GIST",
    authorKind: "USER",
    author: me,
    body: "The road by the junction was dry this morning and the light held all day.",
    createdLabel: "2h",
    edited: false,
    areaName: null,
    areaSlug: null,
    listing: null,
    sourceNote: null,
    cited: [],
    replyingTo: null,
    repostedBy: null,
    replyCount: 0,
    likeCount: 0,
    repostCount: 0,
    viewCount: 0,
    liked: false,
    reposted: false,
    saved: false,
    heldReason: null,
    removed: false,
    isMine: true,
    editable: false,
    rawBody: null,
    media: [],
    ...over,
  };
}

const gone = (id: string, replyCount = 0) =>
  post({ id, body: null, removed: true, replyCount });

const LIVE = post({ id: "00000000-0000-4000-8000-00000000d001" });
const DELETED_UNANSWERED = gone("00000000-0000-4000-8000-00000000d002");
const DELETED_ANSWERED = gone("00000000-0000-4000-8000-00000000d003", 1);

/* What `posts_select` would hand the author, deleted rows included. */
const HANDED = [LIVE, DELETED_UNANSWERED, DELETED_ANSWERED];

const reply = (
  view: PostView,
  parentId: string,
  depth: number,
): ThreadReply => ({ ...view, parentId, depth, mutedAuthor: false });

const threadRows: ThreadReply[] = [
  reply(post({ id: "00000000-0000-4000-8000-00000000d011", body: "Same here, the water came back by noon." , author: them, isMine: false }), LIVE.id, 1),
  reply(gone("00000000-0000-4000-8000-00000000d012"), LIVE.id, 1),
  reply(gone("00000000-0000-4000-8000-00000000d013", 1), LIVE.id, 1),
  reply(
    post({ id: "00000000-0000-4000-8000-00000000d014", body: "Which junction? The one by the market?", author: them, isMine: false }),
    "00000000-0000-4000-8000-00000000d013",
    2,
  ),
];
const prune = (rows: ThreadReply[]) =>
  pruneDeleted(rows, (row) => ({ id: row.id, parentId: row.parentId, deleted: row.removed }));

const answeredRootReplies = prune([
  reply(
    post({ id: "00000000-0000-4000-8000-00000000d021", body: "I saw this before it came down. Still true.", author: them, isMine: false }),
    DELETED_ANSWERED.id,
    1,
  ),
]);

function Panel({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section data-panel={n} className="flex flex-col gap-sm">
      <h2 className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-muted)]">
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}

export default function PostsPreview() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-xl px-md py-lg">
      <Panel n={1} title="Feed, handed one live and two deleted posts">
        <Feed initial={HANDED} locale="en" sheet={sheetWordsOf(getDictionary("en"))} signedIn emptyMessage="" />
      </Panel>
      <Panel n={2} title="Own profile, Posts tab, handed the same">
        <ProfilePosts tab="posts" handle={PERSON.handle} posts={HANDED} isOwner signedIn sheet={sheetWordsOf(getDictionary("en"))} hasBio />
      </Panel>
      <Panel n={3} title="Thread: one deleted reply nobody answered, one somebody did">
        <ThreadView thread={{ root: LIVE, replies: prune(threadRows) }} signedIn sheet={sheetWordsOf(getDictionary("en"))} />
      </Panel>
      {conversationIsGone(true, answeredRootReplies.length) ? null : (
        <Panel n={4} title="Thread opened on a deleted post somebody answered">
          <ThreadView thread={{ root: DELETED_ANSWERED, replies: answeredRootReplies }} signedIn sheet={sheetWordsOf(getDictionary("en"))} />
        </Panel>
      )}
    </main>
  );
}
