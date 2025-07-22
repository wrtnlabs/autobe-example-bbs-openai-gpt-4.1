import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validates that updating a soft-deleted notification fails as expected and leaves the object unchanged.
 *
 * Business context: In discussion boards, notifications represent critical system or user events. For compliance and audit integrity, once a notification is deleted (soft-delete/marked as deleted), it must not be changed by update operations. This prevents accidental recovery, inconsistent state, or bypass of moderation.
 *
 * Test steps:
 * 1. Register a new test member (to serve as notification recipient).
 * 2. Create a notification for this member.
 * 3. Soft-delete the notification (simulate user/admin delete action).
 * 4. Attempt to update the notification (e.g., change the read status or content preview).
 * 5. Confirm that the API returns an error (no update permitted), as per business rules.
 * 6. Optionally, verify that the notification's data is unchanged after the failed update (if the API supports retrieval of deleted notifications).
 *
 * This test ensures audit safety and business invariants on notification mutability after deletion.
 */
export async function test_api_discussionBoard_test_update_notification_fails_for_deleted_notification(
  connection: api.IConnection,
) {
  // 1. Register a new test member
  const newMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(newMember);

  // 2. Create a notification for this member
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: {
      recipient_member_id: newMember.id,
      trigger_actor_id: null,
      type: "test", // arbitrary test type
      content_preview: "Preview before delete",
      url: "https://example.com/test",
    },
  });
  typia.assert(notification);

  // 3. Soft-delete the notification
  const deleted = await api.functional.discussionBoard.notifications.eraseById(connection, {
    id: notification.id,
  });
  typia.assert(deleted);
  TestValidator.predicate("deleted_at must be set after erase")(!!deleted.deleted_at);

  // 4. Attempt to update the soft-deleted notification
  await TestValidator.error("Should not update soft-deleted notification")(
    async () => {
      await api.functional.discussionBoard.notifications.putById(connection, {
        id: notification.id,
        body: {
          read: true,
          content_preview: "Updated preview after deletion",
        },
      });
    }
  );
}