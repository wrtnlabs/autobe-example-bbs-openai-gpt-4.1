import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate that a regular member cannot perform a moderator-level comment hard
 * deletion.
 *
 * On the discussion board, only moderators or admins are permitted to
 * permanently (hard) delete comments. Regular members are restricted from using
 * this operation. If attempted, the system must deny the request with a
 * permission error.
 *
 * This test verifies that privilege escalation is not possible for regular
 * members attempting moderator actions.
 *
 * Steps:
 *
 * 1. Register a regular board member (simulating a simple user registration).
 * 2. As this member, author a comment on a post (using a random valid post UUID).
 * 3. Attempt to hard-delete the just-authored comment using the moderator-only
 *    endpoint with the regular member account.
 * 4. Confirm that the operation fails with a permission-denied (or equivalent)
 *    error (only presence of error is checked, not the error details).
 */
export async function test_api_discussionBoard_test_moderator_delete_comment_without_permission(
  connection: api.IConnection,
) {
  // 1. Register a new regular member via admin endpoint (simulate unique business identifier)
  const memberInput: IDiscussionBoardMember.ICreate = {
    user_identifier: RandomGenerator.alphaNumeric(12),
    joined_at: new Date().toISOString(),
  };
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: memberInput,
    },
  );
  typia.assert(member);

  // 2. Author a comment as this member on a random post
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentInput: IDiscussionBoardComment.ICreate = {
    discussion_board_member_id: member.id,
    discussion_board_post_id: postId,
    content: RandomGenerator.paragraph()(),
  };
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: commentInput,
    },
  );
  typia.assert(comment);

  // 3. Attempt to hard-delete the comment with the regular member account
  await TestValidator.error(
    "permission denied: non-moderator cannot hard-delete comment",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.erase(connection, {
      commentId: comment.id,
    });
  });
}
