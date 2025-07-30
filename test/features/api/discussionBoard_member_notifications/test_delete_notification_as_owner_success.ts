import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test the successful deletion of a notification by its recipient (member
 * user).
 *
 * This test ensures that a user can delete their own notification from their
 * feed. The workflow:
 *
 * 1. Create a mock user/member (simulate member context).
 * 2. Using an admin session, post a notification targeted at the member (using
 *    admin notifications API).
 * 3. As the member, confirm the notification is visible via GET.
 * 4. As the member, DELETE the notification.
 * 5. Attempt to GET the deleted notification, expecting an error (not
 *    found/unauthorized).
 *
 * The deletion should be audit-logged per system policy (not directly testable,
 * but deletion can be confirmed by unavailability of the notification to the
 * user).
 */
export async function test_api_discussionBoard_member_notifications_test_delete_notification_as_owner_success(
  connection: api.IConnection,
) {
  // 1. Generate a unique recipient_id (simulate a member's UUID)
  const recipient_id = typia.random<string & tags.Format<"uuid">>();

  // 2. As admin, create a notification for the member
  const deliverAt = new Date().toISOString();
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "Test notification for deletion scenario",
          delivered_at: deliverAt,
          delivery_status: "delivered",
          failure_reason: null,
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 3. As member: GET the notification by ID (should succeed)
  const fetched = await api.functional.discussionBoard.member.notifications.at(
    connection,
    {
      notificationId: notification.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("notification exists before deletion")(fetched.id)(
    notification.id,
  );

  // 4. As member: DELETE the notification
  await api.functional.discussionBoard.member.notifications.erase(connection, {
    notificationId: notification.id,
  });

  // 5. As member: GET again, expect error (notification should not exist)
  await TestValidator.error(
    "notification should not be accessible after deletion",
  )(async () => {
    await api.functional.discussionBoard.member.notifications.at(connection, {
      notificationId: notification.id,
    });
  });
}
