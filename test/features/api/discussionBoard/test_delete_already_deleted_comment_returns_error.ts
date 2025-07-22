import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test repeated deletion of a soft-deleted discussion board comment.
 *
 * This test verifies the system's behavior when attempting to delete a comment that has already been deleted (soft-deleted). It follows the workflow:
 *
 * 1. Create a discussion thread as context.
 * 2. Create a post under that thread.
 * 3. Create a comment under that post.
 * 4. Delete (soft-delete) the comment.
 * 5. Attempt to delete the same comment again.
 *
 * The expected outcome is that the API call in step 5 should fail with an appropriate error or no-op (not modified), since the comment is already marked deleted. The test checks for this error using TestValidator.error().
 */
export async function test_api_discussionBoard_test_delete_already_deleted_comment_returns_error(
  connection: api.IConnection,
) {
  // 1. Create a discussion thread (top-level context)
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 2. Create a post under the created thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: thread.discussion_board_member_id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. Create a comment under the created post
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: RandomGenerator.paragraph()(1),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // 4. Delete (soft-delete) the comment
  await api.functional.discussionBoard.comments.eraseById(connection, {
    id: comment.id,
  });

  // 5. Attempt to delete the already-deleted comment—should return error or no-op
  await TestValidator.error("repeated comment deletion should fail")(() =>
    api.functional.discussionBoard.comments.eraseById(connection, {
      id: comment.id,
    }),
  );
}