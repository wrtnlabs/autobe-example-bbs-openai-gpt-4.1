import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Test update failure for notification preference when provided input is
 * invalid (e.g. illegal frequency value, malformed category string).
 * Register a user for authentication. Attempt to update the notification
 * preference with values that do not meet type, enum, or format
 * requirements, expecting validation error response.
 *
 * Scenario steps:
 *
 * 1. Register a new user to obtain authentication context required for
 *    preference update.
 * 2. Use a random UUID for preferenceId (since the update will be rejected for
 *    input validation, not resource existence/ownership).
 * 3. Attempt to update a notification preference with each of the following
 *    invalid input cases: a) Illegal frequency value. b) Malformed
 *    categories value. c) Both frequency and categories invalid.
 * 4. Assert that each update attempt is rejected with a validation error (API
 *    rejects malformed values as expected).
 */
export async function test_api_notification_preference_update_invalid_input(
  connection: api.IConnection,
) {
  // 1. Register a user for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password: "Passw0rd!@#Secure",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Generate random UUID as the target preferenceId
  const preferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3a. Attempt with illegal frequency value (not expected by API)
  await TestValidator.error("fails with illegal frequency value", async () => {
    await api.functional.discussionBoard.user.notificationPreferences.update(
      connection,
      {
        preferenceId,
        body: {
          frequency: "not_a_valid_frequency",
        } satisfies IDiscussionBoardNotificationPreference.IUpdate,
      },
    );
  });
  // 3b. Attempt with malformed category string
  await TestValidator.error(
    "fails with malformed categories string",
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.update(
        connection,
        {
          preferenceId,
          body: {
            categories: "not,a,properly[formatted,json{or}csv",
          } satisfies IDiscussionBoardNotificationPreference.IUpdate,
        },
      );
    },
  );
  // 3c. Attempt with both fields invalid
  await TestValidator.error(
    "fails with both frequency and categories invalid",
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.update(
        connection,
        {
          preferenceId,
          body: {
            frequency: "",
            categories: "##invalid_categories_value###",
          } satisfies IDiscussionBoardNotificationPreference.IUpdate,
        },
      );
    },
  );
}
