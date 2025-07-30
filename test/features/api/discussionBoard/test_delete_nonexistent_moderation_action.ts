import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Test deleting a moderation action with a non-existent or already-deleted ID.
 *
 * This test ensures that the API correctly handles attempts to delete a
 * moderation action that does not exist or has already been deleted. The
 * expected behavior is that the API returns a not-found error and no deletion
 * operation occurs.
 *
 * Steps:
 *
 * 1. Create an admin user to ensure sufficient permissions for performing
 *    deletion.
 * 2. Attempt to delete a moderation action with a random (non-existent) UUID.
 *
 *    - Assert that the operation throws an error (not-found or relevant business
 *         error).
 * 3. Attempt to delete the same non-existent moderation action ID again to verify
 *    repeated failure.
 */
export async function test_api_discussionBoard_test_delete_nonexistent_moderation_action(
  connection: api.IConnection,
) {
  // 1. Create an admin user for authorization
  const admin = await api.functional.discussionBoard.admin.admins.create(
    connection,
    {
      body: {
        user_identifier: typia.random<string>(),
        granted_at: new Date().toISOString(),
        revoked_at: null,
      } satisfies IDiscussionBoardAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Attempt to delete a non-existent moderation action
  const nonexistentModerationActionId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting nonexistent moderation action should fail",
  )(async () => {
    await api.functional.discussionBoard.admin.moderationActions.erase(
      connection,
      {
        moderationActionId: nonexistentModerationActionId,
      },
    );
  });

  // 3. Try again to confirm repeated failure
  await TestValidator.error(
    "deleting the same nonexistent ID should consistently fail",
  )(async () => {
    await api.functional.discussionBoard.admin.moderationActions.erase(
      connection,
      {
        moderationActionId: nonexistentModerationActionId,
      },
    );
  });
}
