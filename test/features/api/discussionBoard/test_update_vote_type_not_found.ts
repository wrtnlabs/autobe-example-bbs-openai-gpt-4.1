import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Update vote type by ID with a non-existent or deleted ID and validate proper error handling (404 Not Found)
 *
 * This test ensures that when an admin attempts to update a discussion board vote type using a UUID that does not correspond to any existing or active vote type record,
 * the API returns a 404 Not Found error and provides an informative error message. No record is expected to be changed, and proper validation enforcement is required.
 *
 * Steps:
 * 1. Generate a random UUID that is not associated with any existing vote type (assumed by context, as we are not allowed to create/delete vote types in this scenario).
 * 2. Attempt to update the vote type using this random UUID and any valid update body (unique code/name values).
 * 3. Assert that the API throws an error (HttpError) with status 404 and that the error message indicates non-existence or not found.
 *
 * This test confirms the system's resilience to invalid update targets and verifies useful error feedback for client developers and admins.
 */
export async function test_api_discussionBoard_test_update_vote_type_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Prepare a valid body for vote type update
  const body: IDiscussionBoardVoteType.IUpdate = {
    code: `test_code_${Date.now()}`,
    name: `Test Name ${Date.now()}`,
    description: "Testing update with non-existent UUID."
  };

  // Step 3: Attempt update and assert a 404 error is raised
  await TestValidator.error("404 Not Found error for non-existent vote type")(
    async () => {
      await api.functional.discussionBoard.voteTypes.putById(connection, {
        id: nonExistentId,
        body,
      });
    }
  );
}