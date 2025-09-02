import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Validate that fetching a notification preference with a non-existent or
 * deleted ID returns a not found error (404), using an authenticated user
 * context.
 *
 * This test verifies proper error handling and access control for
 * individual user notification preference records.
 *
 * Steps:
 *
 * 1. Register a discussion board user to establish an authenticated session
 *    (via /auth/user/join).
 * 2. Attempt to fetch a notification preference using a random (non-existent)
 *    UUID as the preferenceId parameter.
 * 3. Assert that the request returns a 404 not found error, verifying that the
 *    endpoint does not reveal information about missing or deleted
 *    records.
 *
 * No notification preference record is created in this flow; only retrieval
 * of a guaranteed-nonexistent ID is attempted. No cleanup is required.
 */
export async function test_api_notification_preference_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a user to establish authentication.
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userName = RandomGenerator.name();
  const password = "Test1234!@#";
  await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username: userName,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });

  // 2. Use a completely random UUID that cannot exist as a preferenceId.
  const nonExistentPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt fetch and assert proper not-found error.
  await TestValidator.httpError(
    "throws 404 Not Found on missing notification preferenceId",
    404,
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.at(
        connection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
}
