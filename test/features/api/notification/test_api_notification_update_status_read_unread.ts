import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validates status transitions (read <-> unread) for a discussion board
 * notification.
 *
 * Business context: Users must be able to reliably mark notifications as
 * read or unread. This test confirms both transitions are functional and
 * properly reflected in the API response. Ensures user ownership and
 * authentication requirements are respected throughout.
 *
 * Workflow:
 *
 * 1. Register (join) a new user to obtain an authenticated session.
 * 2. Simulate/generate a notification object for this user (since no
 *    notification creation API exists, use typia.random to construct it
 *    with the user's ID as recipient_user_id).
 * 3. PUT to mark the notification as 'read' with current timestamp as read_at.
 *    Assert status is updated.
 * 4. PUT to revert the status to 'unread' and clear the read_at field (set to
 *    undefined/null). Assert status reverts.
 *
 * Includes assertion after each update to confirm the persisted status
 * value in the returned notification record matches expectations.
 */
export async function test_api_notification_update_status_read_unread(
  connection: api.IConnection,
) {
  // 1. Register a new user and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "Password1!";
  const displayName = RandomGenerator.name(1);
  const joinResult = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: displayName,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(joinResult);
  const userId = joinResult.user.id;
  // 2. Simulate/generate a notification for this user
  const notification: IDiscussionBoardNotification = {
    ...typia.random<IDiscussionBoardNotification>(),
    recipient_user_id: userId,
    status: "unread",
    read_at: null,
  };
  typia.assert(notification);
  // 3. Update notification to 'read' with read_at timestamp
  const now = new Date().toISOString();
  const readUpdate =
    await api.functional.discussionBoard.user.notifications.update(connection, {
      notificationId: notification.id,
      body: {
        status: "read",
        read_at: now,
      } satisfies IDiscussionBoardNotification.IUpdate,
    });
  typia.assert(readUpdate);
  TestValidator.equals("status updated to read", readUpdate.status, "read");
  TestValidator.equals("read_at set", readUpdate.read_at, now);
  // 4. Update notification back to 'unread' (clear read_at)
  const unreadUpdate =
    await api.functional.discussionBoard.user.notifications.update(connection, {
      notificationId: notification.id,
      body: {
        status: "unread",
        read_at: undefined,
      } satisfies IDiscussionBoardNotification.IUpdate,
    });
  typia.assert(unreadUpdate);
  TestValidator.equals(
    "status updated to unread",
    unreadUpdate.status,
    "unread",
  );
  TestValidator.equals("read_at cleared", unreadUpdate.read_at, null);
}
