import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that only admin users can update moderator records, and ensure
 * unauthorized users are denied access.
 *
 * Business context:
 *
 * - Moderator assignments are sensitive operations only permitted to system
 *   admins.
 * - Unauthorized updates must be forbidden to protect board integrity.
 *
 * Steps:
 *
 * 1. (Admin) Create a moderator record for update testing.
 * 2. (Non-admin) Attempt to modify moderator record and check for access denial
 *    (should throw error).
 * 3. (Admin) Successfully update the same moderator record to check privileged
 *    path remains open.
 */
export async function test_api_discussionBoard_admin_moderators_test_update_moderator_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. (Admin) Create a moderator to update
  const moderatorCreateInput: IDiscussionBoardModerator.ICreate = {
    user_identifier: RandomGenerator.alphabets(12),
    granted_at: new Date().toISOString(),
    revoked_at: null,
  };
  const moderator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: moderatorCreateInput,
    });
  typia.assert(moderator);

  // 2. (Non-admin) Attempt update, expecting forbidden/unauthorized error
  // Create a new connection object simulating absence of authentication (no headers)
  const nonAdminConnection = { host: connection.host };
  await TestValidator.error("non-admin forbidden to update moderator")(
    async () => {
      await api.functional.discussionBoard.admin.moderators.update(
        nonAdminConnection as api.IConnection,
        {
          moderatorId: moderator.id,
          body: {
            revoked_at: new Date().toISOString(),
          } satisfies IDiscussionBoardModerator.IUpdate,
        },
      );
    },
  );

  // 3. (Admin) Update moderator back with valid admin connection, expect success
  const updateInput: IDiscussionBoardModerator.IUpdate = {
    revoked_at: null, // Unset revocation (if needed)
    granted_at: new Date().toISOString(),
  };
  const updated = await api.functional.discussionBoard.admin.moderators.update(
    connection,
    {
      moderatorId: moderator.id,
      body: updateInput,
    },
  );
  typia.assert(updated);
  TestValidator.equals("correct moderator")(updated.id)(moderator.id);
  TestValidator.equals("user identifier")(updated.user_identifier)(
    moderator.user_identifier,
  );
}
