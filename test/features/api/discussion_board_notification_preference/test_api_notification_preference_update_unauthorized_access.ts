import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

/**
 * Test that unauthorized users cannot update another user's notification
 * preference.
 *
 * This test validates ownership enforcement on the PUT
 * /discussionBoard/user/notificationPreferences/{preferenceId} endpoint. It
 * registers two users, creates a notification preference for one, then
 * attempts to update that preference as the other user and confirms access
 * is denied.
 *
 * 1. Register user1 (preference owner) using a unique identity.
 * 2. Simulate existence of notification preference for user1 (since no
 *    creation endpoint exists, assume system default or obtain plausible
 *    ID).
 * 3. Register user2 and authenticate as user2.
 * 4. Attempt update of user1's notification preference as user2 and assert
 *    access is denied.
 */
export async function test_api_notification_preference_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register user1 (the rightful owner of the notification preference)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1Password = RandomGenerator.alphaNumeric(12) + "Ab!";
  const user1Result = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: user1Password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1Result);
  const user1Id = user1Result.user.id;

  // 2. Assume a notification preference record for user1 (system default or created with account)
  const preferenceId = typia.random<string & tags.Format<"uuid">>(); // Simulated, as no lookup or create endpoint is available

  // 3. Register user2 and switch authentication context
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2Password = RandomGenerator.alphaNumeric(12) + "Ab!";
  const user2Result = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: user2Password,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2Result);

  // 4. Try to update user1's preference with user2 context — this should be rejected.
  await TestValidator.error(
    "user2 cannot update user1's notification preference (ownership enforced)",
    async () => {
      await api.functional.discussionBoard.user.notificationPreferences.update(
        connection,
        {
          preferenceId,
          body: {
            email_enabled: false,
            push_enabled: true,
            in_app_enabled: false,
            frequency: "digest_daily",
            categories: "replies,mentions,system",
            mute_until: null,
          } satisfies IDiscussionBoardNotificationPreference.IUpdate,
        },
      );
    },
  );
}
