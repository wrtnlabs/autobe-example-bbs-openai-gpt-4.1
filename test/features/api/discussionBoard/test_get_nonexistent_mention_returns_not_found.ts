import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";

/**
 * Validate that fetching a discussion board mention by a non-existent or already deleted ID returns a not found error (404).
 *
 * Business context:
 * This test ensures the system prevents access to non-existent resources and returns a proper not found error
 * when a user tries to fetch detail for a mention event that does not exist (never existed or already deleted).
 * The scenario is security-relevant and ensures users cannot access arbitrary detail records.
 *
 * Steps:
 * 1. Register a new discussion board member (to ensure an authenticated/registered context).
 * 2. Attempt to fetch a mention by a random UUID that is highly unlikely to exist (i.e., not generated in the test setup or DB).
 * 3. Assert that the API call fails with a not found error (HTTP 404), indicating proper resource not found handling.
 */
export async function test_api_discussionBoard_test_get_nonexistent_mention_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new member (for authentication context)
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(member);

  // 2. Attempt to fetch a mention by a random UUID that surely does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect the API call to throw a not found error (404)
  await TestValidator.error("should return 404 for nonexistent mention")(
    async () => {
      await api.functional.discussionBoard.mentions.getById(connection, {
        id: nonExistentId,
      });
    },
  );
}