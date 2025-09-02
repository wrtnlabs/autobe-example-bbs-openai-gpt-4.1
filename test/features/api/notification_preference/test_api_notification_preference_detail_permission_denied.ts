import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Validate permission enforcement when retrieving another user's
 * notification preference by ID.
 *
 * Business context: Ensures that one authenticated user cannot access
 * notification preferences that belong to another user, enforcing strict
 * privacy/ownership for notification configuration data. This is a critical
 * security and privacy rule for user-prefixed endpoints.
 *
 * Steps:
 *
 * 1. Register user1 (owner of the notification preference).
 * 2. Register user2 (the attacker/test subject).
 * 3. (If possible) Determine user1's notification preferenceId. If not
 *    provided in join response and no creation/listing API exists,
 *    functionally skip the forbidden access check as it is not possible
 *    given the current API.
 * 4. (If setup/test fixture provides preferenceId, attempt forbidden access as
 *    user2 and expect a permission error.)
 *
 * NOTE: This test cannot be run E2E unless the framework provides a way to
 * obtain user1's notification preference id (e.g., by join response,
 * bootstrap fixture, or DB injection). As no such mechanism is available in
 * the released APIs/types, the function aborts after setup.
 */
export async function test_api_notification_preference_detail_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register user1 (owner)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = "TestPassword1!"; // Meets strong password policy
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  // 2. Register user2 (attacker)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = "TestPassword2!";
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2);

  // 3. There is no API to obtain user1's notification preferenceId, nor is it returned from join.
  //    Therefore, the forbidden access test cannot be implemented unless test setup makes it available.
  //    If in the future such an ID is obtainable, add code here like:
  //
  // await TestValidator.error(
  //   "user2 should not access user1's notification preference",
  //   async () => {
  //     await api.functional.discussionBoard.user.notificationPreferences.at(connection, {
  //       preferenceId: user1PreferenceId,
  //     });
  //   },
  // );
  //
  // End of test – nothing further possible with current API surface.
}
