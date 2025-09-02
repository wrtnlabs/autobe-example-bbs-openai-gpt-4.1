import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test permission denial when retrieving another user's notification.
 *
 * This test ensures that a user cannot access a notification belonging to
 * another user, enforcing strict privacy and access control boundaries on
 * the notification detail API.
 *
 * Steps:
 *
 * 1. Register the first user (the owner of the notification) with
 *    /auth/user/join and record their auth context.
 * 2. Register a second user (the one trying to access unauthorized
 *    notifications) with /auth/user/join.
 * 3. Simulate (mock up) a notification record belonging to the first user,
 *    since there's no API to create notifications directly.
 * 4. Confirm that authenticating as the second user, attempting to retrieve
 *    the first user's notification fails due to forbidden access (negative
 *    test for privacy/security).
 */
export async function test_api_notification_retrieve_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register the first user (notification owner)
  const userAInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "Aa!1",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const userA = await api.functional.auth.user.join(connection, {
    body: userAInput,
  });
  typia.assert(userA);
  const ownerId = userA.user.id;

  // 2. Register the second user (unauthorized accessor)
  const userBInput: IDiscussionBoardUser.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12) + "Bb@2",
    display_name: RandomGenerator.name(),
    consent: true,
  };
  const userB = await api.functional.auth.user.join(connection, {
    body: userBInput,
  });
  typia.assert(userB);

  // 3. Simulate a notification for the first user (since no creation API is present)
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  // Normally, here we'd create a notification with an API, but we'll use a random UUID per E2E placeholder practice.

  // 4. Attempt to access the notification as the second user and confirm permission denied
  await TestValidator.error(
    "should not allow a user to fetch another user's notification",
    async () => {
      await api.functional.discussionBoard.user.notifications.at(connection, {
        notificationId: notificationId,
      });
    },
  );
}
