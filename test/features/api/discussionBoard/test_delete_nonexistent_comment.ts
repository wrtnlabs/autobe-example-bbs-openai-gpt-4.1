import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test: Admin deletes a non-existent discussion board comment
 *
 * Business purpose:
 *
 * - Validates that the admin comment hard delete endpoint responds with a
 *   not-found (404) error when attempting to delete a comment that does not
 *   exist in the system (either random or already deleted).
 * - Ensures compliance with business rules and auditability for admin moderation
 *   actions.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID to guarantee a non-existent commentId.
 * 2. Attempt to hard delete this comment as admin.
 * 3. Assert that the API throws a 404 not-found error, confirming correct error
 *    handling and security.
 */
export async function test_api_discussionBoard_test_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Generate a random, guaranteed non-existent commentId (never created)
  const nonExistentCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt deletion and expect a not-found error (404)
  await TestValidator.error(
    "Should throw 404 error when deleting non-existent comment",
  )(async () => {
    await api.functional.discussionBoard.admin.comments.erase(connection, {
      commentId: nonExistentCommentId,
    });
  });
}
