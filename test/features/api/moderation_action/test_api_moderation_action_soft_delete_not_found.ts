import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";

/**
 * Attempt to soft-delete a moderation action that does not exist
 * (negative-path error scenario).
 *
 * This test validates that the API correctly returns a not-found error with
 * no side effects when trying to retire (soft-delete) a moderation action
 * by moderationActionId that is not present in the database. It ensures
 * robust error handling and data integrity in the deletion endpoint for
 * moderation actions.
 *
 * Step-by-step process:
 *
 * 1. Register a new moderator to establish required authentication for
 *    moderator endpoints.
 * 2. Attempt to soft-delete a moderation action using a random UUID that will
 *    not match any record.
 * 3. Assert that this operation fails with an error (ideally, 404 not found).
 * 4. If no error is thrown, the test fails, highlighting broken not-found
 *    logic.
 */
export async function test_api_moderation_action_soft_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register moderator context (prerequisite for authorization)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardModerator.IJoin;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: joinInput,
  });
  typia.assert(moderatorAuth);

  // 2. Try to soft-delete a moderation action with a random UUID (guaranteed not to exist)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error when trying to soft-delete a non-existent moderation action",
    async () => {
      await api.functional.discussionBoard.moderator.moderationActions.erase(
        connection,
        {
          moderationActionId: nonExistentId,
        },
      );
    },
  );
}
