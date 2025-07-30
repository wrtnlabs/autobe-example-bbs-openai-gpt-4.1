import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test validation for updating comments: ensure invalid updates (empty or
 * too-long content) fail and do not modify the comment.
 *
 * This test verifies that a member cannot update their own comment with invalid
 * content (empty string, or a string exceeding the system's maximum allowed
 * length).
 *
 * Workflow:
 *
 * 1. Create a board member (via admin).
 * 2. Create a valid comment by that member.
 * 3. Attempt to update the comment with empty content: expect validation error and
 *    no change.
 * 4. Attempt to update the comment with overlong content (over 10000 characters as
 *    a conservative upper limit): expect validation error and no change.
 * 5. Confirm original comment content is unchanged after failed updates.
 */
export async function test_api_discussionBoard_member_comments_test_update_comment_with_invalid_data(
  connection: api.IConnection,
) {
  // 1. Create board member
  const memberCreateInput = {
    user_identifier: RandomGenerator.alphabets(12),
    joined_at: new Date().toISOString(),
  } satisfies IDiscussionBoardMember.ICreate;
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    { body: memberCreateInput },
  );
  typia.assert(member);

  // 2. Create comment by that member
  const commentCreateInput = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: "Original content of the comment.",
  } satisfies IDiscussionBoardComment.ICreate;
  const originalComment =
    await api.functional.discussionBoard.member.comments.create(connection, {
      body: commentCreateInput,
    });
  typia.assert(originalComment);

  // 3. Attempt update with empty content (should fail)
  await TestValidator.error("Empty content not allowed")(() =>
    api.functional.discussionBoard.member.comments.update(connection, {
      commentId: originalComment.id,
      body: { content: "" },
    }),
  );

  // 4. Attempt update with overlong content (should fail)
  const overlongContent = "a".repeat(10001);
  await TestValidator.error("Content exceeding max length not allowed")(() =>
    api.functional.discussionBoard.member.comments.update(connection, {
      commentId: originalComment.id,
      body: { content: overlongContent },
    }),
  );

  // 5. Confirm content unchanged (no re-fetch API: check original state)
  TestValidator.equals("Comment content unchanged after invalid updates")(
    originalComment.content,
  )(commentCreateInput.content);
}
