import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Admin updates for discussion board notifications.
 *
 * This test verifies that an admin can successfully update notification
 * properties for any user/recipient via the notification update endpoint. It
 * covers multiple allowed admin update scenarios as described below, ensures
 * changes are persisted correctly, and checks data/system consistency
 * post-update.
 *
 * Test Workflow:
 *
 * 1. Create a notification using the admin notification creation endpoint (for
 *    arbitrary recipient ID and content).
 * 2. As admin, update some or all of these notification properties:
 *
 *    - Message (edit content)
 *    - Delivery_status
 *    - Read_at (simulate marking as read)
 *    - Failure_reason (set and clear error)
 *    - Combinations of the above
 * 3. After each update, verify that changes persist (by checking the notification
 *    object response).
 * 4. Ensure updates do not break schema, illegal state transitions are not
 *    allowed, and unused properties remain unmodified.
 * 5. (In a real prod scenario, the audit log would also be checked, but here we
 *    focus on observable API changes.)
 */
export async function test_api_discussionBoard_admin_notifications_test_admin_update_notification_status_or_content(
  connection: api.IConnection,
) {
  // 1. Create a notification as admin
  const createInput: IDiscussionBoardNotification.ICreate = {
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    notification_type: "system",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: `Notification for admin-update test at ${new Date().toISOString()}`,
    delivered_at: new Date().toISOString(),
    delivery_status: "delivered",
    failure_reason: null,
  };
  const notif = await api.functional.discussionBoard.admin.notifications.create(
    connection,
    { body: createInput },
  );
  typia.assert(notif);

  // 2a. Admin updates message content and delivery_status to "pending"
  const updated1 =
    await api.functional.discussionBoard.admin.notifications.update(
      connection,
      {
        notificationId: notif.id,
        body: {
          message: `${notif.message} [edited by admin]`,
          delivery_status: "pending",
        },
      },
    );
  typia.assert(updated1);
  TestValidator.equals("updated message content")(updated1.message)(
    `${notif.message} [edited by admin]`,
  );
  TestValidator.equals("delivery status updated")(updated1.delivery_status)(
    "pending",
  );

  // 2b. Admin marks as read by setting read_at
  const readAtTs = new Date().toISOString();
  const updated2 =
    await api.functional.discussionBoard.admin.notifications.update(
      connection,
      {
        notificationId: notif.id,
        body: { read_at: readAtTs },
      },
    );
  typia.assert(updated2);
  TestValidator.equals("read_at set")(updated2.read_at)(readAtTs);

  // 2c. Admin sets delivery failure
  const failReason = "Simulated delivery error";
  const updated3 =
    await api.functional.discussionBoard.admin.notifications.update(
      connection,
      {
        notificationId: notif.id,
        body: {
          delivery_status: "failed",
          failure_reason: failReason,
        },
      },
    );
  typia.assert(updated3);
  TestValidator.equals("delivery_status=failed")(updated3.delivery_status)(
    "failed",
  );
  TestValidator.equals("failure_reason set")(updated3.failure_reason)(
    failReason,
  );

  // 2d. Admin clears failure reason, sets delivery_status delivered
  const updated4 =
    await api.functional.discussionBoard.admin.notifications.update(
      connection,
      {
        notificationId: notif.id,
        body: {
          delivery_status: "delivered",
          failure_reason: null,
        },
      },
    );
  typia.assert(updated4);
  TestValidator.equals("failure_reason cleared")(updated4.failure_reason)(null);
  TestValidator.equals("delivery_status restored")(updated4.delivery_status)(
    "delivered",
  );

  // 3. Check that recipient, target info, and untouched fields remain unchanged
  TestValidator.equals("recipient stays same")(updated4.recipient_id)(
    notif.recipient_id,
  );
  TestValidator.equals("target_id stays same")(updated4.target_id)(
    notif.target_id,
  );
  TestValidator.equals("notification_type unchanged")(
    updated4.notification_type,
  )(notif.notification_type);
  TestValidator.equals("target_type unchanged")(updated4.target_type)(
    notif.target_type,
  );
  TestValidator.equals("delivered_at unchanged")(updated4.delivered_at)(
    notif.delivered_at,
  );
}
