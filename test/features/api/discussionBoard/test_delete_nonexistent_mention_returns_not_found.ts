import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that deleting a non-existent mention ID returns a not found error (404).
 *
 * Ensures the system properly handles deletion attempts for mentions that do not exist, returning the expected HTTP error.
 * This test uses a privileged actor (admin/moderator) for the operation, as only privileged roles are permitted to delete mentions.
 *
 * Step-by-step:
 * 1. Register a privileged actor (admin/moderator) who will perform the operation.
 * 2. Attempt to delete a random (non-existent) mention ID as the privileged actor.
 * 3. Assert that a not found (404) error occurs for the deletion attempt.
 */
export async function test_api_discussionBoard_test_delete_nonexistent_mention_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a privileged actor (simulate admin/moderator registration)
  const actor = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(actor);

  // 2. Attempt to delete a mention ID that does not exist
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should return not found (404)")(
    async () =>
      await api.functional.discussionBoard.mentions.eraseById(connection, {
        id: nonexistentId,
      })
  );
}