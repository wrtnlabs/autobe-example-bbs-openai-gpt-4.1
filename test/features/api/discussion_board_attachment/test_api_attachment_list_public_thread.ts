import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates retrieval of all non-deleted attachments for a post in a public
 * thread.
 *
 * Business context:
 *
 * - Only authenticated users can create threads, posts, and upload
 *   attachments.
 * - Attachments can be soft-deleted; list endpoint must not return these by
 *   default. (Note: no API is exposed for deletion in this test suite, so
 *   only positive checks are possible.)
 * - Users rely on the listing endpoint for file management, compliance, or
 *   download flows.
 *
 * Test workflow:
 *
 * 1. Register a user for authentication.
 * 2. Create a public thread as this user.
 * 3. Create a post in that thread.
 * 4. Upload multiple attachments (at least 2, with varying
 *    file_name/content_type/size).
 * 5. List attachments via PATCH
 *    /discussionBoard/threads/{threadId}/posts/{postId}/attachments using
 *    the following filters and paginations: a. No filters (get all
 *    non-deleted) b. Pagination (limit/page) c. Filter by file_name
 *    substring d. Filter by content_type e. Filter by uploaded_by_id f.
 *    Filter with non-matching file_name (should be empty) g. Sorting by
 *    created_at desc
 * 6. For each listing:
 *
 *    - Only non-deleted attachments (deleted_at === null)
 *    - Pagination block is correct
 *    - Each entry has valid fields (id, file_name, file_url, content_type,
 *         size_bytes, created_at, deleted_at=null, and correct uploader)
 *    - Returns empty result when appropriate
 *
 * Note: Since no delete/restore endpoints are provided, this test only
 * verifies positive/active (non-deleted) cases.
 */
export async function test_api_attachment_list_public_thread(
  connection: api.IConnection,
) {
  // 1. Register user
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(14) + "A!9";
  const displayName = RandomGenerator.name();

  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userAuth);
  const userId = userAuth.user.id;

  // 2. Create a thread
  const thread = await api.functional.discussionBoard.user.threads.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 6 }),
      } satisfies IDiscussionBoardThread.ICreate,
    },
  );
  typia.assert(thread);

  // 3. Create a post in the thread
  const post = await api.functional.discussionBoard.user.threads.posts.create(
    connection,
    {
      threadId: thread.id,
      body: {
        thread_id: thread.id,
        title: RandomGenerator.paragraph({ sentences: 7 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 7,
          sentenceMax: 13,
        }),
      } satisfies IDiscussionBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Upload multiple attachments (at least two attachments, with variation)
  const [attachA, attachB] = await Promise.all([
    api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          file_name: `docA_${RandomGenerator.alphabets(5)}.pdf`,
          file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(10)}.pdf`,
          content_type: "application/pdf",
          size_bytes: 10240,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    ),
    api.functional.discussionBoard.user.threads.posts.attachments.create(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          post_id: post.id,
          file_name: `imgB_${RandomGenerator.alphabets(6)}.png`,
          file_url: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(12)}.png`,
          content_type: "image/png",
          size_bytes: 20480,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    ),
  ]);
  typia.assert(attachA);
  typia.assert(attachB);

  // 5a. List (no filters): expect all non-deleted
  let summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {},
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "all non-deleted attachments found",
    summary.data.length,
    2,
  );
  for (const att of summary.data) {
    TestValidator.equals("attachment not soft deleted", att.deleted_at, null);
    TestValidator.predicate(
      "attachment summary has valid fields",
      typeof att.id === "string" &&
        typeof att.file_name === "string" &&
        typeof att.file_url === "string" &&
        typeof att.content_type === "string" &&
        typeof att.size_bytes === "number" &&
        typeof att.created_at === "string",
    );
  }

  // 5b. Pagination (limit=1, page=2)
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { limit: 1, page: 2 },
      },
    );
  typia.assert(summary);
  TestValidator.equals("pagination: limit=1", summary.pagination.limit, 1);
  TestValidator.equals("pagination: current=2", summary.pagination.current, 2);
  TestValidator.equals(
    "pagination: total records=2",
    summary.pagination.records,
    2,
  );
  TestValidator.equals("pagination: two pages", summary.pagination.pages, 2);
  TestValidator.equals(
    "pagination: data has one result",
    summary.data.length,
    1,
  );
  TestValidator.equals(
    "paginated attachment not soft deleted",
    summary.data[0].deleted_at,
    null,
  );

  // 5c. Filter by file_name substring ("docA") (should match attachA only)
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { file_name: "docA" },
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "file_name substring filter result count [docA]",
    summary.data.length,
    1,
  );
  TestValidator.predicate(
    "file_name substring filter match",
    summary.data[0].file_name.includes("docA"),
  );
  TestValidator.equals(
    "filtered attachment not soft deleted",
    summary.data[0].deleted_at,
    null,
  );

  // 5d. Filter by content_type ("application/pdf")
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { content_type: "application/pdf" },
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "content_type filter result [pdf]",
    summary.data.length,
    1,
  );
  TestValidator.equals(
    "content_type is pdf",
    summary.data[0].content_type,
    "application/pdf",
  );
  TestValidator.equals(
    "filtered attachment not soft deleted (pdf)",
    summary.data[0].deleted_at,
    null,
  );

  // 5e. Filter by uploaded_by_id - should return both attachments, skip assertion on uploader field (ISummary doesn't have it)
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { uploaded_by_id: userId },
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "uploaded_by_id filter finds both",
    summary.data.length,
    2,
  );
  for (const att of summary.data) {
    TestValidator.equals(
      "attachment not soft deleted (uploaded_by_id)",
      att.deleted_at,
      null,
    );
  }

  // 5f. Filter by non-existent file_name (should return empty result)
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { file_name: "notARealFileName123" },
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "non-existent file_name returns zero",
    summary.data.length,
    0,
  );

  // 5g. Sort by created_at desc (syntax via sort param)
  summary =
    await api.functional.discussionBoard.threads.posts.attachments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: { sort: "created_at desc" },
      },
    );
  typia.assert(summary);
  TestValidator.equals(
    "created_at desc sort result count",
    summary.data.length,
    2,
  );
  if (summary.data.length === 2) {
    TestValidator.predicate(
      "attachments sorted in desc order",
      new Date(summary.data[0].created_at).getTime() >=
        new Date(summary.data[1].created_at).getTime(),
    );
  }
}
