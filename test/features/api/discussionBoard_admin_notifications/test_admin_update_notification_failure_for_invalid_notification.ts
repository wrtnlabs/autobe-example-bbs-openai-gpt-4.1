import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that updating a notification with a non-existent notificationId as
 * an admin fails.
 *
 * Business context: Administrators can update notification records to amend
 * messages, mark as read, or alter delivery status/messages. However,
 * attempting to update a notification using a UUID that does not exist should
 * result in a not-found error and must not introduce any accidental side
 * effects or records into the database.
 *
 * Steps:
 *
 * 1. Prepare a random UUID that does not correspond to any real notification
 *    (since we never create one in this flow).
 * 2. Prepare an arbitrary valid update body for a notification (only valid
 *    fields).
 * 3. As an admin, attempt to call the update API with the fake notificationId and
 *    the update payload.
 * 4. Assert that the API responds with a not-found error (should throw an error or
 *    equivalent business error).
 */
export async function test_api_discussionBoard_admin_notifications_test_admin_update_notification_failure_for_invalid_notification(
  connection: api.IConnection,
) {
  // 1. Prepare a UUID that's not present in the DB
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create an arbitrary valid update payload
  const updateInput = {
    message: "Updated by admin due to moderation.",
    delivery_status: "failed",
    failure_reason: "Recipient has left the platform.",
    read_at: null,
  } satisfies IDiscussionBoardNotification.IUpdate;

  // 3 & 4. Attempt the update and expect a not-found error
  await TestValidator.error("update to nonexistent notification should fail")(
    async () => {
      await api.functional.discussionBoard.admin.notifications.update(
        connection,
        {
          notificationId: nonExistentId,
          body: updateInput,
        },
      );
    },
  );
}
