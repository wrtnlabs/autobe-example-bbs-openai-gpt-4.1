import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that non-admin users are forbidden from deleting notifications using
 * the admin endpoint, even if they own the target notification.
 *
 * This test ensures that privilege escalation is not possible by verifying that
 * only admin accounts can remove notifications via the protected admin
 * endpoint.
 *
 * Steps:
 *
 * 1. As an admin, create a notification for a random user (recipient).
 * 2. Simulate a context/login as the recipient (non-admin member).
 * 3. Attempt to delete the notification using the admin endpoint as the recipient.
 * 4. Confirm that a forbidden/unauthorized error is thrown (API call should fail;
 *    permission is denied).
 */
export async function test_api_discussionBoard_test_admin_delete_notification_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Admin creates a notification for a member
  const recipient_id: string = typia.random<string & tags.Format<"uuid">>();
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id,
          subscription_id: null,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "This is a test notification.",
          delivered_at: new Date().toISOString(),
          delivery_status: "delivered",
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 2. Simulate login as the recipient (non-admin member)
  // (Note: In real scenarios, you'd use a member-authenticated connection. For testing, we simulate by changing the Authorization header.)
  const memberConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer MEMBER-${recipient_id}`,
    },
  };

  // 3. Attempt to delete the notification through the admin endpoint as the member
  await TestValidator.error(
    "Non-admin cannot delete notifications via admin endpoint",
  )(async () => {
    await api.functional.discussionBoard.admin.notifications.erase(
      memberConnection,
      {
        notificationId: notification.id,
      },
    );
  });
}
