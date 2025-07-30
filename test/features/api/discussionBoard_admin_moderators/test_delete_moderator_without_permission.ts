import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that non-admin users cannot delete moderator assignments.
 *
 * This test ensures that users without administrator privileges (e.g., standard
 * discussion board members or moderators themselves) are forbidden from
 * deleting a board moderator assignment.
 *
 * Why: Proper access control is critical to discussion board security and audit
 * integrity. Only administrators should be able to remove moderator privileges.
 * A non-admin attempting this operation must receive an authorization or
 * permission error, and the moderator assignment must remain intact.
 *
 * Process:
 *
 * 1. Create a standard member (non-admin) account for use as the unauthorized
 *    actor.
 * 2. Create a moderator assignment for a different user.
 * 3. Simulate an attempt by the non-admin to delete the moderator assignment (if
 *    test framework supports user session switching).
 * 4. Confirm that the operation fails with an authorization/permission error.
 */
export async function test_api_discussionBoard_admin_moderators_test_delete_moderator_without_permission(
  connection: api.IConnection,
) {
  // 1. Create a standard (non-admin) discussion board member
  const nonAdminUserIdentifier = RandomGenerator.alphabets(12) + "@example.com";
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: nonAdminUserIdentifier,
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(member);

  // 2. Create a moderator assignment for a different user
  const moderatorUserIdentifier =
    RandomGenerator.alphabets(12) + "@example.com";
  const moderatorAssign =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      },
    });
  typia.assert(moderatorAssign);

  // 3. Simulate switching to non-admin session (if infra supports; else see comments)
  // Note: If the testing system supports user-role based session tokens, switch to the non-admin now.
  // This block is illustrative; actual implementation may require test framework support for re-authentication.

  // 4. Attempt deletion as non-admin: must fail with error
  await TestValidator.error("Non-admin cannot delete moderator")(() =>
    api.functional.discussionBoard.admin.moderators.erase(connection, {
      moderatorId: moderatorAssign.id,
    }),
  );
}
