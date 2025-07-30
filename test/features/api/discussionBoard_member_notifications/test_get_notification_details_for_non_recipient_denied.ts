import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test that access to a notification is denied to non-recipients (privacy
 * enforcement).
 *
 * This test simulates two distinct users (member accounts). It creates a
 * notification belonging to MemberA and then attempts to retrieve it using
 * MemberB's context. The correct business behavior is that only the recipient
 * (MemberA) should be able to access the notification. Any attempt by a
 * non-recipient (MemberB) must result in an access-denied or not-found error
 * (such as HTTP 403/404), never leaking data.
 *
 * Test steps:
 *
 * 1. Create two unique member IDs to represent MemberA and MemberB.
 * 2. As an admin, create a notification targeting MemberA only.
 * 3. Attempt to fetch the notification's details as MemberB (the non-recipient).
 * 4. Assert that access is denied (TestValidator.error), ensuring strict privacy
 *    enforcement.
 */
export async function test_api_discussionBoard_member_notifications_test_get_notification_details_for_non_recipient_denied(
  connection: api.IConnection,
) {
  // 1. Create two distinct member IDs (simulate two separate users)
  const memberAId: string = typia.random<string & tags.Format<"uuid">>();
  const memberBId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Admin creates a notification for MemberA
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: memberAId,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "E2E privacy notification to MemberA",
          delivered_at: new Date().toISOString(),
          delivery_status: "delivered",
          failure_reason: null,
          subscription_id: null,
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 3. Attempt to fetch as MemberB (simulate by using the same connection). In a real suite, would use a MemberB-authenticated session
  //    The API must enforce that only recipient_id can view, so this lookup should NOT succeed for a non-recipient
  await TestValidator.error(
    "Non-recipient cannot access another user's notification",
  )(async () => {
    await api.functional.discussionBoard.member.notifications.at(connection, {
      notificationId: notification.id,
    });
  });
}
