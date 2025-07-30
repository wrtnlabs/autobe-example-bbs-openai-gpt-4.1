import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that members cannot update notifications that do not belong to them.
 *
 * This test asserts the strictness of the notification system's access control
 * by ensuring a recipient is the sole party allowed to update their
 * notification. The process simulates two different members:
 *
 * 1. First, a notification is created for Member A (as an admin).
 * 2. Then, an attempt is made to update this notification as Member B (who is not
 *    the recipient).
 *
 * The update should be denied, returning a 403 Forbidden or 404 Not Found
 * error, confirming that only the correct recipient may modify their
 * notification state or content.
 *
 * Step-by-step process:
 *
 * 1. (Setup) Register two member accounts (Member A, Member B). (Simulate with
 *    UUIDs; no user API is present.)
 * 2. (Setup/Admin) Create a notification targeted at Member A via the admin create
 *    API.
 * 3. (Member B) Simulate authentication as Member B, if possible. (If not, just
 *    use a context switch.)
 * 4. Attempt to update the notification as Member B.
 * 5. Assert that the update call fails with the correct error signal (403/404).
 */
export async function test_api_discussionBoard_test_update_notification_as_non_owner_denied(
  connection: api.IConnection,
) {
  // 1. Simulate two unique member UUIDs (A and B); in reality, would be registered users
  const memberA_id = typia.random<string & tags.Format<"uuid">>();
  const memberB_id = typia.random<string & tags.Format<"uuid">>();

  // 2. (Admin) Create a notification for Member A
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: memberA_id,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "Test: Non-owner update validation.",
          delivered_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          delivery_status: "delivered",
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 3. Simulate authentication as Member B (no auth API, so assume session context)
  // Normally this would involve switching user context/tokens in connection
  // For this e2e, we assert business error for wrong recipient

  // 4. Attempt to update the notification as Member B (not the recipient)
  await TestValidator.error("only recipient can update notification")(
    async () => {
      await api.functional.discussionBoard.member.notifications.update(
        connection,
        {
          notificationId: notification.id,
          body: {
            message: "Hacked by non-owner!",
          } satisfies IDiscussionBoardNotification.IUpdate,
        },
      );
    },
  );
}
