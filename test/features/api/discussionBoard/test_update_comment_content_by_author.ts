import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test updating the content of a comment as its author in the discussion board system.
 *
 * This test validates that a user (the comment's original author) can update their comment's content. It ensures that after updating:
 * - The comment's body is updated as requested.
 * - The is_edited flag is properly set to true.
 * - The updated_at timestamp reflects a later datetime.
 *
 * Step-by-step process:
 * 1. Simulate authentication context by generating a member UUID (used as author for all created entities).
 * 2. Create a thread as this member.
 * 3. Create a post in the thread as this member.
 * 4. Create a comment under the post as this member.
 * 5. Update the comment's content using the same author context.
 * 6. Verify that the returned comment has the updated content, edited flag set, and the updated_at timestamp advanced.
 */
export async function test_api_discussionBoard_test_update_comment_content_by_author(
  connection: api.IConnection,
) {
  // 1. Simulate authentication context (member UUID)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a thread as the member
  const thread = await api.functional.discussionBoard.threads.post(connection, {
    body: {
      discussion_board_member_id: memberId,
      discussion_board_category_id: categoryId,
      title: `Thread - ${RandomGenerator.paragraph()(8)}`,
      body: RandomGenerator.paragraph()(16),
    } satisfies IDiscussionBoardThread.ICreate,
  });
  typia.assert(thread);

  // 3. Create a post in the thread as the member
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: thread.id,
      discussion_board_member_id: memberId,
      body: RandomGenerator.paragraph()(18),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 4. Create a comment under the post as the member
  const comment = await api.functional.discussionBoard.comments.post(connection, {
    body: {
      discussion_board_post_id: post.id,
      body: RandomGenerator.paragraph()(6),
    } satisfies IDiscussionBoardComment.ICreate,
  });
  typia.assert(comment);

  // 5. Update the comment content as the author
  const updatedBody = RandomGenerator.paragraph()(7);
  const updated = await api.functional.discussionBoard.comments.putById(connection, {
    id: comment.id,
    body: {
      body: updatedBody,
      is_edited: true,
    } satisfies IDiscussionBoardComment.IUpdate,
  });
  typia.assert(updated);

  // 6. Verify updates
  TestValidator.equals("updated body")(updated.body)(updatedBody);
  TestValidator.equals("is_edited flag")(updated.is_edited)(true);
  TestValidator.predicate("updated_at advanced")(new Date(updated.updated_at) > new Date(comment.updated_at));
}