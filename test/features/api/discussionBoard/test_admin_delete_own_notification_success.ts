import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that an admin user can successfully delete their own notification.
 *
 * This test covers the ability for an admin to remove a notification (such as a
 * system notice) that is addressed to themselves, ensuring the deletion
 * endpoint works and prevents subsequent retrieval.
 *
 * Steps:
 *
 * 1. Create a notification assigning the acting admin as recipient using POST
 *    /discussionBoard/admin/notifications
 * 2. Delete the notification as the admin via DELETE
 *    /discussionBoard/admin/notifications/{notificationId}
 * 3. Attempt to retrieve the deleted notification as a member using GET
 *    /discussionBoard/member/notifications/{notificationId} (should fail/no
 *    longer exist)
 * 4. (Expect system audit of deletion, although not verifiable via API)
 */
export async function test_api_discussionBoard_test_admin_delete_own_notification_success(
  connection: api.IConnection,
) {
  // 1. Create notification for admin
  const adminRecipientId: string = typia.random<string & tags.Format<"uuid">>();
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: adminRecipientId,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "Test: This notification will be deleted by admin.",
          delivered_at: new Date().toISOString(),
          delivery_status: "delivered",
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 2. Delete the notification as admin
  await api.functional.discussionBoard.admin.notifications.erase(connection, {
    notificationId: notification.id,
  });

  // 3. Attempt to fetch deleted notification as member (should fail)
  await TestValidator.error("Notification must not exist after deletion")(
    async () => {
      await api.functional.discussionBoard.member.notifications.at(connection, {
        notificationId: notification.id,
      });
    },
  );

  // 4. System should audit this deletion action (not verifiable in this test)
}
