import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that an admin can delete notifications belonging to any user.
 *
 * This test ensures the admin can remove any notification from the board, not
 * just those belonging to themselves. The following workflow is exercised:
 *
 * 1. Create a new member (will be the notification recipient).
 * 2. As admin, create a notification for this member.
 * 3. As admin, delete the notification using the notification ID.
 * 4. Attempt to delete the same notification again (should fail as already
 *    deleted).
 *
 * Notes:
 *
 * - Confirm deletion by expecting that additional delete attempts error.
 * - Also validate that the notification belongs to the member created in step 1,
 *   and admin access is required for these APIs.
 * - Notification creation is direct via admin endpoint. No member authentication
 *   required.
 * - No separate audit log API is supplied, so audit validation is omitted.
 */
export async function test_api_discussionBoard_admin_notifications_test_admin_delete_notification_for_any_user(
  connection: api.IConnection,
) {
  // 1. Create a new member
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphabets(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create a notification for this member
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: member.id,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "Test admin notification deletion",
          delivered_at: new Date().toISOString(),
          delivery_status: "delivered",
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);
  TestValidator.equals("recipient_id matches")(notification.recipient_id)(
    member.id,
  );

  // 3. Delete the notification as admin
  await api.functional.discussionBoard.admin.notifications.erase(connection, {
    notificationId: notification.id,
  });

  // 4. Attempt to delete the same notification again (should result in error)
  await TestValidator.error("already deleted notification should fail")(() =>
    api.functional.discussionBoard.admin.notifications.erase(connection, {
      notificationId: notification.id,
    }),
  );
}
