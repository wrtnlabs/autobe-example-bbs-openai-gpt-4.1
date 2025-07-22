import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate retrieval of a soft-deleted discussion board comment returns not found or forbidden.
 *
 * This test ensures that when a comment is created and then soft-deleted, any subsequent attempt to
 * retrieve it via the GET /discussionBoard/comments/{id} endpoint will either be denied (forbidden)
 * or return a not found error.
 *
 * Steps:
 * 1. Create a thread to provide a context for post and comment creation
 * 2. Create a post in the thread
 * 3. Create a comment for that post
 * 4. Soft-delete the created comment
 * 5. Attempt to retrieve the deleted comment by ID and verify an error is returned (forbidden or not found)
 */
export async function test_api_discussionBoard_test_get_comment_by_deleted_id_returns_not_found_or_forbidden(
  connection: api.IConnection,
) {
  // 1. Create a thread as context for the post and comment
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 2. Create a post in the thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. Create a comment for that post
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      parent_id: null,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // 4. Soft-delete the created comment
  await api.functional.discussionBoard.comments.eraseById(connection, { id: comment.id });

  // 5. Attempt to retrieve the deleted comment; expect not found or forbidden error
  await TestValidator.error("retrieving deleted comment is not allowed")(
    async () => {
      await api.functional.discussionBoard.comments.getById(connection, { id: comment.id });
    },
  );
}