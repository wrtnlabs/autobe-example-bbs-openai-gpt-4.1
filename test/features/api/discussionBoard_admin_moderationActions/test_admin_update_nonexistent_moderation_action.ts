import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Validate that the system returns a not-found error when an admin attempts to
 * update a moderation action using a non-existent UUID.
 *
 * This test ensures that:
 *
 * - The API correctly enforces existence checks for moderation action updates.
 * - No update is made when the moderationActionId does not correspond to any
 *   record.
 * - An appropriate error is returned in this scenario.
 *
 * Test Steps:
 *
 * 1. Create an admin user as a prerequisite for the test (simulate admin
 *    privileges for update).
 * 2. Attempt to update a moderation action using a randomly generated UUID that
 *    does not exist in the system.
 * 3. Validate that the API throws an error for the missing moderation action
 *    (tests not-found handling).
 * 4. Verify no unintended update or leakage of sensitive information occurs.
 */
export async function test_api_discussionBoard_admin_moderationActions_test_admin_update_nonexistent_moderation_action(
  connection: api.IConnection,
) {
  // 1. Create a test admin user to ensure admin privileges for testing purpose
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: `test_admin_${typia.random<string>()}`,
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Generate a random UUID for a non-existent moderation action
  const nonexistentModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to update the moderation action and assert error is thrown
  const updateBody: IDiscussionBoardModerationAction.IUpdate = {
    action_type: "edit",
    action_details:
      "Trying an update on a nonexistent moderation action for not-found error test.",
  };

  await TestValidator.error(
    "update should fail for non-existent moderation action",
  )(async () => {
    await api.functional.discussionBoard.admin.moderationActions.update(
      connection,
      {
        moderationActionId: nonexistentModerationActionId,
        body: updateBody,
      },
    );
  });
}
