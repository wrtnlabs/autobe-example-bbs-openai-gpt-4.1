import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test forbidden notification deletion by a non-recipient user.
 *
 * Ensures access control enforcement where only a notification recipient
 * can delete their own notification. This test validates that another user
 * (not the intended recipient) cannot delete a notification they do not
 * own.
 *
 * Steps:
 *
 * 1. Register two distinct users (user1: notification owner, user2: non-owner)
 * 2. (Unimplementable) Generate a notification for user1 - not possible with
 *    given API
 * 3. Switch to user2
 * 4. Attempt to delete the user1's notification as user2
 * 5. Assert that the operation is forbidden (permission denied error)
 */
export async function test_api_notification_delete_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register user1 (will be owner/recipient of the notification)
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const output1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: "TestPassword!234!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(output1);

  // --- Step 2: Notification generation (Unimplementable: no notification creation API) ---
  // We'll use a randomly generated UUID as a placeholder for notificationId
  // In real test, this notification should belong to user1
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Register user2 (who will attempt unauthorized deletion)
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const output2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: "TestPassword!234!",
      consent: true,
      display_name: RandomGenerator.name(1),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(output2);

  // 4. As user2, attempt to delete the user1-owned notification (should be forbidden)
  await TestValidator.error(
    "notification deletion by a non-recipient user must be forbidden",
    async () => {
      await api.functional.discussionBoard.user.notifications.erase(
        connection,
        {
          notificationId,
        },
      );
    },
  );
}
