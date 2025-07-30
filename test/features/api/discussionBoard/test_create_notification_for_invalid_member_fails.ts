import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate error handling when creating a notification for a non-existent
 * member.
 *
 * This test ensures that the notification creation API properly rejects
 * attempts to create a notification with an invalid or non-existent recipient
 * ID. It verifies correct error response (e.g., HTTP 404 or 400), ensures no
 * notification is persisted, and confirms that the error is auditable on the
 * system.
 *
 * Steps:
 *
 * 1. Construct a valid notification payload but with a recipient_id set to a
 *    random (very likely non-existent) UUID.
 * 2. Attempt to call the notification creation API as an admin system.
 * 3. Verify that an error is thrown. This can be a 404 (not found), 400 (bad
 *    request), or appropriate error depending on business logic.
 * 4. Make sure the returned error signals failure and includes reason (if provided
 *    by system).
 * 5. (If API supports querying notifications:) Attempt to query notifications by
 *    recipient_id, and validate none exist for that UUID (cannot implement this
 *    as relevant API not provided).
 * 6. (Cannot verify audit trail as auditing API is not provided.)
 */
export async function test_api_discussionBoard_test_create_notification_for_invalid_member_fails(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for non-existent recipient_id
  const invalidRecipientId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create notification payload with invalid recipient
  const notificationCreate: IDiscussionBoardNotification.ICreate = {
    recipient_id: invalidRecipientId,
    // Optional: subscription_id is omitted for system notification
    notification_type: "system",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: `Test notification for invalid user (${invalidRecipientId})`,
    delivered_at: new Date().toISOString(),
    delivery_status: "pending",
    // failure_reason is not set (only used after a failed delivery)
  };

  // 3. Attempt to create notification and expect error
  await TestValidator.error(
    "creating notification for invalid recipient fails",
  )(() =>
    api.functional.discussionBoard.admin.notifications.create(connection, {
      body: notificationCreate,
    }),
  );

  // 4. (Cannot check DB or audit trail in black-box test)
}
