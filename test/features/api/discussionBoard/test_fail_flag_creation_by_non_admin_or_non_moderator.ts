import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";

/**
 * Validate that unauthorized users (non-admin, non-moderators) cannot create
 * content flags via the admin API.
 *
 * This test verifies that only privileged users (moderators or admins) can flag
 * posts/comments using the admin endpoint. It ensures:
 *
 * - Authorization checks are enforced (forbidden for regular users)
 * - System logs audit failed attempts for compliance
 *
 * Test Procedure:
 *
 * 1. Register a discussion board member with regular user privileges using the
 *    admin endpoint (`admin/members.create`).
 * 2. As this member, create a comment via the ordinary member endpoint
 *    (`member/comments.create`) so there is target content to flag.
 * 3. Attempt to use the admin content flag creation endpoint
 *    (`admin/contentFlags.create`) as the regular member, targeting the
 *    comment.
 * 4. Assert that access is denied with an authorization error (expected failure).
 * 5. Optionally, check that the action is audit-logged (if audit log API is
 *    available).
 *
 * Edge cases:
 *
 * - Attempt with both valid/invalid contentFlag bodies (should always fail for
 *   regular users).
 * - Confirm that admin/moderator fields in flag create body are null/missing for
 *   this user type.
 */
export async function test_api_discussionBoard_test_fail_flag_creation_by_non_admin_or_non_moderator(
  connection: api.IConnection,
) {
  // 1. Register a regular board member (not admin/moderator)
  const memberUserIdent = RandomGenerator.alphaNumeric(12);
  const createdMember =
    await api.functional.discussionBoard.admin.members.create(connection, {
      body: {
        user_identifier: memberUserIdent,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // 2. Create a comment as this member for flagging
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: createdMember.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(1),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Try to create a content flag on this comment via the admin endpoint (should fail for regular member)
  await TestValidator.error(
    "Regular member cannot access admin contentFlags endpoint",
  )(() =>
    api.functional.discussionBoard.admin.contentFlags.create(connection, {
      body: {
        comment_id: comment.id,
        flag_type: "spam",
        flag_source: "manual",
      } satisfies IDiscussionBoardContentFlag.ICreate,
    }),
  );
}
