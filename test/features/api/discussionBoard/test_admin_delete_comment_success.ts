import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Validate the permanent deletion of a comment by admin.
 *
 * This test confirms that an admin can permanently delete any comment on the
 * discussion board. The workflow:
 *
 * 1. Admin creates a member (required for authoring a comment).
 * 2. Admin creates a comment as that member.
 * 3. Admin deletes the comment using its commentId via the admin endpoint.
 * 4. Re-attempts deletion, expecting a not-found error to prove permanence.
 *
 * This tests that deletion is irreversible and the resource cannot be reused or
 * accessed again, validating system integrity for compliance needs.
 */
export async function test_api_discussionBoard_test_admin_delete_comment_success(
  connection: api.IConnection,
) {
  // 1. Admin creates a discussion board member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(16),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Admin creates a comment attributed to that member
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(2),
      },
    },
  );
  typia.assert(comment);

  // 3. Admin deletes the comment by commentId
  await api.functional.discussionBoard.admin.comments.erase(connection, {
    commentId: comment.id,
  });

  // 4. Admin tries to delete the same comment again, expects not-found error
  await TestValidator.error("comment already deleted should not be found")(() =>
    api.functional.discussionBoard.admin.comments.erase(connection, {
      commentId: comment.id,
    }),
  );
}
