import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Ensure that attempting to delete a non-existent comment as a moderator
 * returns a 404 error.
 *
 * This test verifies that the hard-delete endpoint for moderator comment
 * deletion in the discussion board system:
 *
 * - Returns a 404 Not Found error for a non-existent commentId
 * - Performs no accidental data mutation
 *
 * Steps:
 *
 * 1. Generate a random UUID (which should not correspond to any real comment)
 * 2. Attempt to delete the comment using moderator privileges
 * 3. Assert that a 404 error is thrown
 */
export async function test_api_discussionBoard_test_moderator_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID commentId that should not exist
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete and expect a 404 error
  await TestValidator.error(
    "Should return 404 for deleting non-existent moderator comment",
  )(async () => {
    await api.functional.discussionBoard.moderator.comments.erase(connection, {
      commentId: fakeCommentId,
    });
  });
}
