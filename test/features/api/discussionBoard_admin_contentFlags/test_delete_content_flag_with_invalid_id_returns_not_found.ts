import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that attempting to delete a content flag with an invalid or
 * non-existent contentFlagId as an admin returns a not found error.
 *
 * Business context:
 *
 * - Ensures error handling is robust when admins attempt to delete a content flag
 *   that does not exist.
 * - Such actions should fail gracefully (with HTTP 404 or similar), and no
 *   deletion should be performed.
 *
 * Limitation:
 *
 * - The system does not provide endpoints to verify audit logs or flag state
 *   post-deletion. Only the error expectation is asserted.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID to act as an invalid/non-existent contentFlagId.
 * 2. Attempt to delete a content flag using this ID via the admin endpoint.
 * 3. Verify that an error is thrown (likely not found/404).
 */
export async function test_api_discussionBoard_admin_contentFlags_test_delete_content_flag_with_invalid_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a (presumed non-existent) content flag ID
  const nonExistentFlagId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt the delete operation and validate that an error occurs
  await TestValidator.error(
    "should fail with not found for invalid contentFlagId",
  )(async () => {
    await api.functional.discussionBoard.admin.contentFlags.erase(connection, {
      contentFlagId: nonExistentFlagId,
    });
  });
}
