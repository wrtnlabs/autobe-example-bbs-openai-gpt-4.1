import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Test successful update of a user's notification preference.
 *
 * This test covers the business requirement that an authenticated user may
 * update their notification preferences to control notification channels,
 * frequency, and categories. The setup involves user registration and
 * simulating the presence of a notification preference record (as creation
 * endpoint is not exposed, we simulate its presence for test purposes).
 *
 * Test Steps:
 *
 * 1. Register a new user using /auth/user/join, establishing the
 *    authentication context.
 * 2. Simulate an existing notification preference object for this user using
 *    typia.random, ensuring user_id points to the created user and
 *    obtaining a valid preferenceId.
 * 3. Update the user's notification preference with random new valid
 *    channel/category/frequency values via
 *    /discussionBoard/user/notificationPreferences/{preferenceId}.
 * 4. Validate the response reflects the update, is owned by the registered
 *    user, and typing is correct.
 *
 * Failure and unauthorized update attempts are covered in other scenarios;
 * this function validates only the success path.
 */
export async function test_api_notification_preference_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new user to establish authentication context
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "A!1",
    display_name: RandomGenerator.name(),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(joinResult);
  const userId = joinResult.user.id;

  // 2. Simulate existing notification preference for this user (since no creation API, use typia.random + inject user_id)
  let pref = typia.random<IDiscussionBoardNotificationPreference>();
  pref = { ...pref, user_id: userId };

  // 3. Prepare update: invert all channel flags, random frequency and categories, set mute_until=null
  const updateBody = {
    email_enabled: !pref.email_enabled,
    push_enabled: !pref.push_enabled,
    in_app_enabled: !pref.in_app_enabled,
    frequency: RandomGenerator.pick([
      "immediate",
      "digest_daily",
      "digest_weekly",
    ] as const),
    categories: RandomGenerator.pick([
      "replies,mentions",
      "system,announcements",
      "all,custom",
    ] as const),
    mute_until: null,
  } satisfies IDiscussionBoardNotificationPreference.IUpdate;

  // 4. Update notification preference
  const updatedPref =
    await api.functional.discussionBoard.user.notificationPreferences.update(
      connection,
      {
        preferenceId: pref.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPref);

  // 5. Verify updated fields reflect request
  TestValidator.equals(
    "user_id matches registered user",
    updatedPref.user_id,
    userId,
  );
  TestValidator.equals(
    "email_enabled updated",
    updatedPref.email_enabled,
    updateBody.email_enabled,
  );
  TestValidator.equals(
    "push_enabled updated",
    updatedPref.push_enabled,
    updateBody.push_enabled,
  );
  TestValidator.equals(
    "in_app_enabled updated",
    updatedPref.in_app_enabled,
    updateBody.in_app_enabled,
  );
  TestValidator.equals(
    "frequency updated",
    updatedPref.frequency,
    updateBody.frequency,
  );
  TestValidator.equals(
    "categories updated",
    updatedPref.categories,
    updateBody.categories,
  );
  TestValidator.equals(
    "mute_until updated",
    updatedPref.mute_until,
    updateBody.mute_until,
  );
}
