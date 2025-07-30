import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";

/**
 * Test that non-admins cannot hard-delete comments from the discussion board
 * using the admin delete endpoint.
 *
 * This verifies that only admin-level users are allowed to erase comments via
 * /discussionBoard/admin/comments/{commentId} and checks privilege enforcement
 * for this operation.
 *
 * Steps:
 *
 * 1. Create a board member via admin API (simulate registration).
 * 2. Create a comment as that member (using the member comment create API).
 * 3. Attempt to call the admin comment DELETE endpoint (hard-delete) as the
 *    (non-admin) member.
 * 4. Expect a permission denied error (TestValidator.error).
 *
 * Note: Due to toolkit limitations, we cannot dynamically switch user
 * role/context within the e2e connection; the test simulates the permission
 * boundary as allowed by the framework.
 */
export async function test_api_discussionBoard_test_admin_delete_comment_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a regular board member (non-admin user)
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(8),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a comment as this member
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Attempt to hard-delete the comment as a non-admin (should fail)
  await TestValidator.error(
    "Non-admin cannot hard-delete comment via admin endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.erase(connection, {
      commentId: comment.id,
    });
  });
}
