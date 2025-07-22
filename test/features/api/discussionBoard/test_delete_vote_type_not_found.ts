import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate 404 not found error when deleting a non-existent vote type by UUID.
 *
 * This test attempts to delete a vote type using a random UUID (which is either not used, or already deleted).
 * The API is expected to return a 404 Not Found error, confirming correct error handling for missing resources.
 *
 * Steps:
 * 1. Generate a random UUID (not corresponding to any real vote type).
 * 2. Attempt to DELETE /discussionBoard/voteTypes/{id} using that UUID as the vote type ID.
 * 3. Confirm that the operation fails with a 404 Not Found error.
 */
export async function test_api_discussionBoard_test_delete_vote_type_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate a random UUID that should not map to any existing vote type
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt the delete and check that it returns a 404 error
  await TestValidator.error("delete non-existent vote type should fail with 404")(
    async () => {
      await api.functional.discussionBoard.voteTypes.eraseById(connection, {
        id: nonexistentId,
      });
    },
  );
}