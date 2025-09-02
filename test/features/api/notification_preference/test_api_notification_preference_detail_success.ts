import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Validate successful retrieval of notification preference detail by owner.
 *
 * This test covers end-to-end user registration (join), authentication
 * context setup, and the retrieval of the user's own notification
 * preference detail using its unique ID. The focus is to verify that, when
 * a user authenticates properly, they can fetch the details of their own
 * notification preference record using the provided API endpoint, and that
 * all returned configuration fields are correct and match expectations.
 *
 * Process:
 *
 * 1. Register a new user (POST /auth/user/join) with typia-generated data;
 *    this authenticates the context.
 * 2. As there is no explicit notification preference creation or listing
 *    endpoint, simulate the existence of the notification preference: use a
 *    random valid UUID as the preferenceId (noting this limitation in E2E
 *    context). In future, refactor to use a concrete ID fetch method once
 *    APIs allow.
 * 3. Use GET /discussionBoard/user/notificationPreferences/{preferenceId} as
 *    the authenticated user to retrieve the preference.
 * 4. Assert:
 *
 *    - Preference.id matches the requested ID
 *    - User_id matches the joined user
 *    - All enablement booleans are correct types
 *    - Frequency and category fields are non-empty strings
 *    - Mute_until is nullable but if present, is a string
 *    - Created_at and updated_at are valid ISO date-times
 *    - All relevant type and business expectations (ownership, linkage) are
 *         enforced via TestValidator
 *
 * Only the success (happy) path is implemented—errors/edge/failure
 * scenarios are out of scope.
 */
export async function test_api_notification_preference_detail_success(
  connection: api.IConnection,
) {
  // 1. Register a new user; context authenticated with join result
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "A!1",
    display_name: RandomGenerator.name(1),
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;

  const authResult = await api.functional.auth.user.join(connection, {
    body: registrationInput,
  });
  typia.assert(authResult);
  // Authentication context now set in connection.header

  // 2. Simulate notification preference existence: use a random UUID as id
  //    (In real test: fetch from user/profile/listing endpoint)
  const ownerId = authResult.user.id;
  const notificationPreferenceId = typia.random<string & tags.Format<"uuid">>();

  // 3. Fetch notification preference detail by ID as the proper user
  const notificationPreference =
    await api.functional.discussionBoard.user.notificationPreferences.at(
      connection,
      { preferenceId: notificationPreferenceId },
    );
  typia.assert(notificationPreference);

  // 4. Validate fields and business contract strictness
  TestValidator.equals(
    "preference ID matches requested",
    notificationPreference.id,
    notificationPreferenceId,
  );
  TestValidator.equals(
    "preference belongs to correct user",
    notificationPreference.user_id,
    ownerId,
  );
  TestValidator.predicate(
    "email_enabled is boolean",
    typeof notificationPreference.email_enabled === "boolean",
  );
  TestValidator.predicate(
    "push_enabled is boolean",
    typeof notificationPreference.push_enabled === "boolean",
  );
  TestValidator.predicate(
    "in_app_enabled is boolean",
    typeof notificationPreference.in_app_enabled === "boolean",
  );
  TestValidator.predicate(
    "frequency is non-empty string",
    typeof notificationPreference.frequency === "string" &&
      notificationPreference.frequency.length > 0,
  );
  TestValidator.predicate(
    "categories is non-empty string",
    typeof notificationPreference.categories === "string" &&
      notificationPreference.categories.length > 0,
  );
  TestValidator.predicate(
    "mute_until is string or null/undefined",
    notificationPreference.mute_until === null ||
      notificationPreference.mute_until === undefined ||
      typeof notificationPreference.mute_until === "string",
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof notificationPreference.created_at === "string" &&
      !isNaN(Date.parse(notificationPreference.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof notificationPreference.updated_at === "string" &&
      !isNaN(Date.parse(notificationPreference.updated_at)),
  );
}
