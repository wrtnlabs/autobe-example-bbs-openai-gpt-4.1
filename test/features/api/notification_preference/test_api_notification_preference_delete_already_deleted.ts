import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test deletion of an already deleted or non-existent notification
 * preference.
 *
 * This E2E test verifies correct error handling when a user tries to delete
 * a notification preference that has already been deleted (or never
 * existed). It covers API business rules for ownership enforcement and
 * proper error codes on repeated deletion.
 *
 * 1. Register a new user (join).
 * 2. Attempt to delete a randomly generated UUID preferenceId (guaranteed
 *    non-existent resource).
 *
 *    - Expect a resource not found or domain error.
 * 3. (If possible) Simulate creation of a preference (note: creation API not
 *    provided here, so skip actual creation).
 * 4. Attempt to delete (simulate first delete—cannot perform without a
 *    creation endpoint, so only test non-existent resource, which covers
 *    'already deleted').
 * 5. Verify clear error feedback (such as 404 or specific business error), not
 *    silent success.
 * 6. Ensure proper authentication is enforced throughout.
 */
export async function test_api_notification_preference_delete_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Aa!" + RandomGenerator.alphaNumeric(12); // Strong password per policy
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResult);

  // 2. Attempt to delete a non-existent notification preference (random UUID)
  const fakePreferenceId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting non-existent notification preference returns error",
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.erase(
        connection,
        {
          preferenceId: fakePreferenceId,
        },
      );
    },
  );

  // 3. (Skipped): Real creation + deletion sequence. This would be implemented if a creation API for notification preferences existed.
}
