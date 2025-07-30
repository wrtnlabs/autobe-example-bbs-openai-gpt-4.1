import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that updating a soft-deleted (is_deleted=true) comment is not permitted.
 *
 * This verifies that once the is_deleted flag is set on a comment, subsequent
 * update attempts—including by the original comment author—should fail. This
 * enforces business rules that prevent content modifications of deleted
 * comments for audit and integrity purposes.
 *
 * Test steps:
 *
 * 1. Register a discussion board member via the admin API.
 * 2. The member creates a comment (random valid properties).
 * 3. The member performs a soft-delete (sets is_deleted=true) on the comment.
 * 4. Attempt to update the soft-deleted comment's content as the comment owner.
 * 5. Validate that the update is rejected (error thrown) and no modification
 *    occurs.
 */
export async function test_api_discussionBoard_member_comments_test_update_soft_deleted_comment(
  connection: api.IConnection,
) {
  // 1. Register a discussion board member (admin-level action)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a comment as the new member (provide member ID, random post ID)
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(100),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Soft-delete the comment (set is_deleted to true)
  const deleted = await api.functional.discussionBoard.member.comments.update(
    connection,
    {
      commentId: comment.id,
      body: {
        is_deleted: true,
      } satisfies IDiscussionBoardComment.IUpdate,
    },
  );
  typia.assert(deleted);
  TestValidator.equals("comment should be soft-deleted")(deleted.is_deleted)(
    true,
  );

  // 4. Try to update the comment content after soft-deletion. Should fail.
  await TestValidator.error("update must fail on soft-deleted comment")(
    async () => {
      await api.functional.discussionBoard.member.comments.update(connection, {
        commentId: comment.id,
        body: {
          content: "Attempted update after deletion",
        } satisfies IDiscussionBoardComment.IUpdate,
      });
    },
  );
}
