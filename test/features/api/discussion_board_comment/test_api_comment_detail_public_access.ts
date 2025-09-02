import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IPageIDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThread";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPageIDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Validates that anyone (public, unauthenticated) can access the detail of
 * a specific comment if it exists, is not soft-deleted, and matches the
 * correct thread/post. Also ensures proper error for non-existent or
 * soft-deleted comments.
 *
 * Business rationale: Discussion comments are typically public unless
 * deleted or restricted. Function must cover both successful access and
 * expected errors for bad IDs or soft deletion.
 *
 * Steps:
 *
 * 1. List threads (public) and pick one
 * 2. List posts within the thread, pick one
 * 3. List comments for the post, pick an active (not soft-deleted) comment
 *    [FIX: Must include post_id in filter]
 * 4. Fetch comment detail by threadId, postId, commentId
 *
 *    - Validate all returned fields
 * 5. Attempt to fetch a non-existent comment (random UUID) - expect not found
 * 6. (If available) Try to fetch soft-deleted comment as public - expect not
 *    found
 */
export async function test_api_comment_detail_public_access(
  connection: api.IConnection,
) {
  // 1. List threads with paging
  const threads = await api.functional.discussionBoard.threads.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardThread.IRequest,
    },
  );
  typia.assert(threads);
  TestValidator.predicate(
    "at least one thread exists",
    threads.data.length > 0,
  );
  const thread = threads.data[0];

  // 2. List posts in thread
  const posts = await api.functional.discussionBoard.threads.posts.index(
    connection,
    {
      threadId: thread.id,
      body: { page: 1, limit: 10 } satisfies IDiscussionBoardPost.IRequest,
    },
  );
  typia.assert(posts);
  TestValidator.predicate("at least one post exists", posts.data.length > 0);
  const post = posts.data[0];

  // 3. List comments for the post (FIX: Include post_id)
  const comments =
    await api.functional.discussionBoard.threads.posts.comments.index(
      connection,
      {
        threadId: thread.id,
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
          post_id: post.id,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(comments);
  TestValidator.predicate(
    "at least one comment exists",
    comments.data.length > 0,
  );
  const activeComment = comments.data.find(
    (c) => c.deleted_at === null || c.deleted_at === undefined,
  );
  TestValidator.predicate(
    "at least one active comment exists",
    !!activeComment,
  );

  // 4. Fetch detail for active comment (public access)
  const detail = await api.functional.discussionBoard.threads.posts.comments.at(
    connection,
    {
      threadId: thread.id,
      postId: post.id,
      commentId: activeComment!.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "detail.id matches comment",
    detail.id,
    activeComment!.id,
  );
  TestValidator.equals("detail.post_id matches post", detail.post_id, post.id);
  TestValidator.equals(
    "detail.body matches summary",
    detail.body,
    activeComment!.body,
  );
  TestValidator.equals(
    "detail.nesting_level matches",
    detail.nesting_level,
    activeComment!.nesting_level,
  );
  TestValidator.equals(
    "detail.created_by_id matches",
    detail.created_by_id,
    activeComment!.created_by_id,
  );
  TestValidator.equals(
    "detail.created_at matches",
    detail.created_at,
    activeComment!.created_at,
  );
  TestValidator.equals(
    "detail.updated_at matches",
    detail.updated_at,
    activeComment!.created_at,
  );

  // 5. Attempt fetching non-existent comment id (should fail)
  await TestValidator.error(
    "not found for non-existent comment id",
    async () => {
      await api.functional.discussionBoard.threads.posts.comments.at(
        connection,
        {
          threadId: thread.id,
          postId: post.id,
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. (Optional) Try to fetch soft-deleted comment as public if any exists
  const deleted = comments.data.find(
    (c) => c.deleted_at !== null && c.deleted_at !== undefined,
  );
  if (deleted) {
    await TestValidator.error(
      "not found for soft-deleted comment",
      async () => {
        await api.functional.discussionBoard.threads.posts.comments.at(
          connection,
          {
            threadId: thread.id,
            postId: post.id,
            commentId: deleted.id,
          },
        );
      },
    );
  }
}
