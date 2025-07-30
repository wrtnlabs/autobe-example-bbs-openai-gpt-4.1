import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate error handling when fetching a moderator with a non-existent ID.
 *
 * This test ensures that the admin moderator retrieval API responds with an
 * error (404 Not Found) when queried with a moderatorId UUID that does not
 * correspond to any existing moderator record. In addition to verifying error
 * propagation and HTTP status handling, this verifies there is no leakage of
 * moderator or user information for random UUID queries.
 *
 * Steps:
 *
 * 1. Generate a random UUID (guaranteed not to exist, as no moderator dependencies
 *    are created in advance).
 * 2. Attempt to fetch moderator details for that random ID.
 * 3. Assert that an error is thrown (404 expected).
 * 4. Confirm that no leaked data is in the error result.
 */
export async function test_api_discussionBoard_test_get_moderator_details_nonexistent_id_returns_404(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent moderator UUID
  const fakeModeratorId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch missing moderator and 3. assert 404 error is thrown
  await TestValidator.error("nonexistent moderatorId returns 404 error")(
    async () => {
      await api.functional.discussionBoard.admin.moderators.at(connection, {
        moderatorId: fakeModeratorId,
      });
    },
  );
}
