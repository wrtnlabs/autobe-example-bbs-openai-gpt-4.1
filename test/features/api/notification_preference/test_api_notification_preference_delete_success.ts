import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the successful deletion of a user's notification preference (hard
 * delete).
 *
 * This E2E test workflow follows:
 *
 * 1. Register a new user account via join API, providing unique email,
 *    username, password, and required consent (and optional display_name).
 * 2. Authenticate automatically as the created user via the returned token
 *    (connection context is updated automatically by SDK).
 * 3. Simulate existence of a notification preference by generating a random
 *    preferenceId UUID (since no create/list/get endpoint is present in the
 *    test context).
 * 4. Call the DELETE
 *    /discussionBoard/user/notificationPreferences/{preferenceId} endpoint
 *    as the authenticated user to remove the notification preference.
 * 5. Validate that the operation completes without error (void return) and no
 *    exceptions are thrown, confirming intended deletion logic for owned
 *    resources.
 *
 * Restriction: Since there is no way to check resource existence or query
 * the status after deletion given API limitations, this test focuses only
 * on ensuring the API completes as expected for deletion of an owned
 * resource, and that required authentication flows are respected.
 */
export async function test_api_notification_preference_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new discussion board user
  const userInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12) + "!Aa1", // meets password policy
    consent: true,
  } satisfies IDiscussionBoardUser.ICreate;
  const authorized = await api.functional.auth.user.join(connection, {
    body: userInput,
  });
  typia.assert(authorized);

  // 2. Simulate an existing notification preference (since no create/index/get endpoint is provided)
  const preferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call DELETE /discussionBoard/user/notificationPreferences/{preferenceId} as the authenticated user
  await api.functional.discussionBoard.user.notificationPreferences.erase(
    connection,
    { preferenceId },
  );
}
