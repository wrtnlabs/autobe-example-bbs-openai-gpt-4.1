import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate idempotence and not-found behavior for deleting discussion board notifications.
 *
 * This test ensures:
 * 1. Deleting an existing notification by ID succeeds (soft-deletes and returns correct data).
 * 2. Attempting to delete the same notification a second time (when it's already soft-deleted) results in an error.
 * 3. Attempting to delete a notification with a random non-existent ID also results in an error.
 *
 * Business context: Notification deletions must be safe and idempotent. The back-end must return clear error conditions and never succeed in "re-deleting" already deleted items. This is critical for proper UI and audit handling.
 *
 * Steps:
 * 1. Register a discussion board member (who will receive the notification).
 * 2. Create a notification for this member.
 * 3. Delete the notification by ID (expect soft-delete success).
 * 4. Immediately repeat the delete call with the same ID (expect error: not found).
 * 5. Attempt deletion for a random non-existent notification UUID (expect error: not found).
 */
export async function test_api_discussionBoard_test_delete_notification_idempotence_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new member for the discussion board
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const member: IDiscussionBoardMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a notification for the member
  const notification: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.post(connection, {
    body: {
      recipient_member_id: member.id,
      trigger_actor_id: null,
      type: "test-delete",
      content_preview: "Test for idempotent notification deletion",
      url: "https://example.com/test-notification",
    } satisfies IDiscussionBoardNotification.ICreate,
  });
  typia.assert(notification);

  // 3. Delete the notification (should succeed and soft-delete)
  const deleted: IDiscussionBoardNotification = await api.functional.discussionBoard.notifications.eraseById(connection, {
    id: notification.id,
  });
  typia.assert(deleted);
  TestValidator.equals("deleted id matches")(deleted.id)(notification.id);
  TestValidator.predicate("deleted_at property should be set")(!!deleted.deleted_at);

  // 4. Try deleting again — should yield error (already deleted)
  await TestValidator.error("Deleting already-deleted notification yields error")(
    async () => {
      await api.functional.discussionBoard.notifications.eraseById(connection, {
        id: notification.id,
      });
    },
  );

  // 5. Try deleting a completely random (non-existent) notification ID
  await TestValidator.error("Deleting non-existent notification yields error")(
    async () => {
      await api.functional.discussionBoard.notifications.eraseById(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}