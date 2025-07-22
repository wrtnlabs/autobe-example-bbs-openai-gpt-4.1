import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test soft-deleting a comment as its author.
 *
 * This test verifies that a user can soft-delete their own comment. It sets up the required context by:
 * 1. Creating a discussion thread (on behalf of the author)
 * 2. Creating a post in that thread (also by the author)
 * 3. Creating a comment on that post (as the same author)
 * 4. Deleting the comment using the soft-delete API (eraseById)
 * 5. (If possible with a future read API) Would validate 'deleted_at' is set and comment is not visible to standard users.
 *
 * Business Rationale:
 * - Only the comment's author, moderators, or admins may soft-delete comments.
 * - Deleted comments must be hidden from regular views but remain in the database for audit/moderation.
 *
 * Steps:
 * 1. Create thread as author
 * 2. Create post in that thread as author
 * 3. Create comment as author
 * 4. Soft-delete the comment
 */
export async function test_api_discussionBoard_test_soft_delete_comment_by_author(
  connection: api.IConnection,
) {
  // 1. Create a discussion thread as the author
  const authorId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const categoryId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: authorId,
      discussion_board_category_id: categoryId,
      title: "Soft-delete comment E2E test thread",
      body: "Thread created for testing comment soft-delete."
    } satisfies IDiscussionBoardThread.ICreate
  });
  typia.assert(thread);

  // 2. Create a post in that thread as the author
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: authorId,
      body: "Initial post for soft-delete comment test."
    } satisfies IDiscussionBoardPost.ICreate
  });
  typia.assert(post);

  // 3. Create a comment on the post as the author
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: "This comment will be soft-deleted."
    } satisfies IDiscussionBoardComment.ICreate
  });
  typia.assert(comment);

  // 4. Soft-delete the comment as its author
  await api.functional.discussionBoard.comments.eraseById(connection, {
    id: comment.id
  });

  // Note: No public API exists to directly check 'deleted_at'.
  // If a moderation fetch/list API is added, validate that 'deleted_at' is set and the comment is not visible in user view.
}