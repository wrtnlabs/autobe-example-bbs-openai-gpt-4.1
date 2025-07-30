import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that a discussion board member can retrieve the details of a
 * notification addressed to them.
 *
 * This test checks end-to-end retrieval of notification detail for a
 * notificationId, ensuring access control and data correctness.
 *
 * Step-by-step process:
 *
 * 1. Prepare a new notification recipient (mocked as a random uuid, as actual
 *    member registration is outside current DTO set)
 * 2. As an admin, deliver a notification directly to this recipient using the
 *    admin API
 * 3. Using the recipient's context (simulated), fetch the notification detail
 *    using notificationId
 * 4. Assert that the returned data matches all notification fields sent (message,
 *    type, recipient, status, target, timestamps, etc.)
 * 5. Confirm that delivery/read timestamps, notification type, and context are
 *    properly populated
 * 6. (Security note) Full access control test requires user management which is
 *    not covered by provided APIs and DTOs
 */
export async function test_api_discussionBoard_test_get_notification_details_for_valid_user(
  connection: api.IConnection,
) {
  // 1. Prepare a new notification recipient (mocked user id)
  const recipient_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a notification as admin
  const notificationBody: IDiscussionBoardNotification.ICreate = {
    recipient_id,
    notification_type: "system",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: "Test notification for member detail view.",
    delivered_at: new Date().toISOString(),
    delivery_status: "delivered",
    // subscription_id and failure_reason optional: leaving undefined
  };
  const createdNotification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      { body: notificationBody },
    );
  typia.assert(createdNotification);

  // 3. Simulate the recipient context to fetch the notification details
  const notificationDetail =
    await api.functional.discussionBoard.member.notifications.at(connection, {
      notificationId: createdNotification.id,
    });
  typia.assert(notificationDetail);

  // 4. Validate all fields match what was created
  TestValidator.equals("id")(notificationDetail.id)(createdNotification.id);
  TestValidator.equals("recipient_id")(notificationDetail.recipient_id)(
    recipient_id,
  );
  TestValidator.equals("notification_type")(
    notificationDetail.notification_type,
  )(notificationBody.notification_type);
  TestValidator.equals("target_type")(notificationDetail.target_type)(
    notificationBody.target_type,
  );
  TestValidator.equals("target_id")(notificationDetail.target_id)(
    notificationBody.target_id,
  );
  TestValidator.equals("message")(notificationDetail.message)(
    notificationBody.message,
  );
  TestValidator.equals("delivered_at")(notificationDetail.delivered_at)(
    notificationBody.delivered_at,
  );
  TestValidator.equals("delivery_status")(notificationDetail.delivery_status)(
    notificationBody.delivery_status,
  );
  // Optional/nullable fields
  TestValidator.equals("subscription_id")(notificationDetail.subscription_id)(
    notificationBody.subscription_id ?? null,
  );
  TestValidator.equals("failure_reason")(notificationDetail.failure_reason)(
    notificationBody.failure_reason ?? null,
  );
  // read_at should be null for a new notification
  TestValidator.equals("read_at should be null")(notificationDetail.read_at)(
    null,
  );

  // 5. (Security test for forbidden access) is omitted: No member session switch available in current DTO/API set
}
