import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test that a member can mark their own notification as read using the member
 * notification update endpoint.
 *
 * This validates the following workflow:
 *
 * 1. An admin creates a notification for a target member via the admin API.
 * 2. The recipient member marks the notification as read by updating its read_at
 *    field via the member endpoint.
 * 3. The test asserts that read_at is updated (from null to a non-null date-time),
 *    and that delivery_status and message are unchanged.
 * 4. Audit log checking is omitted because there is no visible API for it.
 *
 * Steps performed:
 *
 * 1. Generate a unique member id for test as the notification recipient.
 * 2. As admin, create a notification for the member (ICreate DTO, with distinct
 *    values).
 * 3. Validate the notification output: correct recipient, unread (read_at null).
 * 4. As the member, call the update endpoint to set read_at to now (simulate user
 *    reads notification).
 * 5. Assert response has the updated read_at, same message/delivery_status.
 */
export async function test_api_discussionBoard_test_update_notification_as_recipient_marks_as_read(
  connection: api.IConnection,
) {
  // 1. Admin creates a notification for a specific member
  const recipient_id: string = typia.random<string & tags.Format<"uuid">>();
  const notification_input: IDiscussionBoardNotification.ICreate = {
    recipient_id,
    subscription_id: null,
    notification_type: "system",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: "You have a new system notification.",
    delivered_at: new Date().toISOString(),
    delivery_status: "delivered",
    failure_reason: null,
  };
  const created: IDiscussionBoardNotification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      { body: notification_input },
    );
  typia.assert(created);

  TestValidator.equals("recipient matches")(created.recipient_id)(recipient_id);
  TestValidator.equals("not yet read")(created.read_at)(null);

  // 2. As the member, mark the notification as read
  const now: string = new Date().toISOString();
  const updated: IDiscussionBoardNotification =
    await api.functional.discussionBoard.member.notifications.update(
      connection,
      {
        notificationId: created.id,
        body: { read_at: now } satisfies IDiscussionBoardNotification.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("read_at updated")(updated.read_at)(now);
  TestValidator.equals("delivery_status unchanged")(updated.delivery_status)(
    created.delivery_status,
  );
  TestValidator.equals("message unchanged")(updated.message)(created.message);
  // Note: Audit log validation skipped due to lack of API.
}
