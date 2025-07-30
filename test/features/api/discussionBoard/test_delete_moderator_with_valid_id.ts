import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate deletion of a moderator assignment by an administrator.
 *
 * Business context: To ensure platform roles and security are properly managed,
 * administrators should be able to revoke moderator privileges by deleting a
 * moderator assignment using its unique moderatorId. This test verifies that
 * the full workflow works end-to-end using real data and simulates both the
 * successful and error outcomes around deletion.
 *
 * Steps:
 *
 * 1. Create a board member (admin capability).
 * 2. Assign the created member as moderator (admin capability).
 * 3. As admin, delete the moderator assignment using the returned moderatorId.
 * 4. Attempt to delete again to confirm not found error after removal.
 */
export async function test_api_discussionBoard_test_delete_moderator_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a board member to promote
  const user_identifier = RandomGenerator.alphaNumeric(15);
  const joined_at = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier,
        joined_at,
      },
    },
  );
  typia.assert(member);
  TestValidator.equals("user_identifier")(member.user_identifier)(
    user_identifier,
  );

  // 2. Assign the created member as moderator
  const granted_at = new Date().toISOString();
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier,
        granted_at,
      },
    });
  typia.assert(moderator);
  TestValidator.equals("moderator's user_identifier")(
    moderator.user_identifier,
  )(user_identifier);
  const moderatorId = moderator.id;

  // 3. Delete the moderator as admin
  await api.functional.discussionBoard.admin.moderators.erase(connection, {
    moderatorId,
  });

  // 4. Attempting to delete again should result in error (not found)
  await TestValidator.error("deleting nonexistent moderator throws")(() =>
    api.functional.discussionBoard.admin.moderators.erase(connection, {
      moderatorId,
    }),
  );
}
