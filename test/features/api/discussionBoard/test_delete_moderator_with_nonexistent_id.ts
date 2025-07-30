import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test failure when deleting a moderator assignment with a non-existent
 * moderatorId.
 *
 * This test simulates an administrator attempting to delete a moderator
 * assignment using a random (non-existent) UUID as moderatorId. The expectation
 * is that the system returns a 404 Not Found error or equivalent, signaling
 * that the specified moderator assignment does not exist. This ensures proper
 * error handling for deletion of non-existent resources, preventing silent
 * failures or unintended data modification.
 *
 * Steps:
 *
 * 1. Generate a random UUID for moderatorId (which is not present in the system).
 * 2. Attempt to delete the moderator assignment using the erase API.
 * 3. Confirm that the operation fails with an error (404 Not Found or relevant
 *    business error).
 */
export async function test_api_discussionBoard_test_delete_moderator_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random non-existent moderatorId (UUID format)
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete and expect an error (not found)
  await TestValidator.error(
    "Should throw not found error for non-existent moderatorId",
  )(async () => {
    await api.functional.discussionBoard.admin.moderators.erase(connection, {
      moderatorId: nonExistentModeratorId,
    });
  });
}
