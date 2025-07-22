import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * Validate error response when requesting details for a non-existent vote type UUID as admin.
 *
 * This test ensures that the system responds correctly (404 Not Found) when an administrator tries to fetch the detail
 * of a vote type that does not exist. A random (presumed non-existent) UUID is used. The system should not return any entity,
 * but instead throw an error that is properly recognized and contains an informative message.
 *
 * Steps:
 * 1. Generate a random UUID that is highly unlikely to exist in the vote types table
 * 2. Attempt to fetch the vote type details using this non-existent UUID via the admin endpoint
 * 3. Assert that a 404 (not found) error is thrown instead of a normal response
 * 4. Optionally check that the error message is informative
 */
export async function test_api_discussionBoard_test_get_vote_type_detail_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID (assuming extremely low probability of collision with real vote type)
  const fakeId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to get vote type details with non-existent UUID, expect error
  await TestValidator.error("should throw 404 for non-existent vote type")(
    async () => {
      await api.functional.discussionBoard.voteTypes.getById(connection, { id: fakeId });
    },
  );
}