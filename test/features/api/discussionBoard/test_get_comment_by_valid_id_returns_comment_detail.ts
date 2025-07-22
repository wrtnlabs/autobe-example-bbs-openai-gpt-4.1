import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate retrieving a discussion board comment by valid ID returns full comment detail.
 *
 * Simulates a complete real-world flow:
 *   1. Create a parent thread in the discussion board
 *   2. Create a post attached to that thread
 *   3. Create a comment attached to the post
 *   4. Retrieve the comment by its returned UUID
 *   5. Assert all returned fields for consistency, correctness, and completeness
 *
 * This ensures the comment retrieval endpoint returns the full business entity and moderation fields,
 * matching what was created and expected by business logic.
 */
export async function test_api_discussionBoard_test_get_comment_by_valid_id_returns_comment_detail(
  connection: api.IConnection,
) {
  // 1. Create a parent discussion thread
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      discussion_board_category_id: typia.random<string & tags.Format<"uuid">>(),
      title: RandomGenerator.paragraph()(1),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 2. Create a post belonging to the above thread
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: typia.random<string & tags.Format<"uuid">>(),
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. Create a top-level comment (no parent) on the post
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: RandomGenerator.content()()(),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // 4. Retrieve the comment by its id
  const detail = await api.functional.discussionBoard.comments.getById(connection, {
    id: comment.id,
  });
  typia.assert(detail);

  // 5. Assertions
  TestValidator.equals("comment id matches")(detail.id)(comment.id);
  TestValidator.equals("post id matches")(detail.discussion_board_post_id)(comment.discussion_board_post_id);
  TestValidator.equals("author member id matches")(detail.discussion_board_member_id)(comment.discussion_board_member_id);
  TestValidator.equals("comment body matches")(detail.body)(comment.body);
  TestValidator.equals("edit status matches")(detail.is_edited)(false);
  TestValidator.predicate("created_at exists")(typeof detail.created_at === "string");
  TestValidator.predicate("updated_at exists")(typeof detail.updated_at === "string");
  TestValidator.equals("deleted_at is null or missing")(("deleted_at" in detail ? detail.deleted_at : null))(null);
}