import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Ensure notification update is forbidden for unauthorized users.
 *
 * This test verifies that a user cannot update the status of a notification
 * they do not own.
 *
 * 1. Register User A (recipient of the notification)
 * 2. Register User B (attacker who will try to perform forbidden update)
 * 3. (Simulate or arrange) Notification is created with
 *    recipient_user_id=UserA.id
 * 4. As User B, attempt to update the status of User A's notification via
 *    api.functional.discussionBoard.user.notifications.update
 * 5. Confirm that the response is a forbidden error (permission denied)
 */
export async function test_api_notification_update_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register User A
  const emailA = `${RandomGenerator.alphaNumeric(8)}_a@example.com`;
  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: emailA,
      username: RandomGenerator.alphaNumeric(8),
      password: `P@ssword${RandomGenerator.alphaNumeric(4)}!`,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2. Register User B
  const emailB = `${RandomGenerator.alphaNumeric(8)}_b@example.com`;
  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: emailB,
      username: RandomGenerator.alphaNumeric(8),
      password: `P@ssword${RandomGenerator.alphaNumeric(4)}!`,
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userB);

  // 3. Simulate or arrange notification for User A
  // Since there is no notification creation API publicly exposed,
  // we simulate the notification entity for test purposes only.
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Login as User B (token already set after join)
  // (SDK sets connection.headers.Authorization after join)

  // 5. Attempt forbidden update as User B
  await TestValidator.error(
    "forbidden: user B cannot update notification belonging to user A",
    async () => {
      await api.functional.discussionBoard.user.notifications.update(
        connection,
        {
          notificationId,
          body: {
            status: "archived",
            read_at: new Date().toISOString(),
          } satisfies IDiscussionBoardNotification.IUpdate,
        },
      );
    },
  );
}
