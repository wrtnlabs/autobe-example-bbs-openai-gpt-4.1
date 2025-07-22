import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test that retrieving a soft-deleted notification returns an error and no data is exposed.
 *
 * This test ensures that if a notification has been soft-deleted (deleted_at set),
 * the system will not return it via GET /discussionBoard/notifications/{id},
 * thus enforcing proper data hiding for removed user content.
 *
 * Business context:
 * Soft-deletion is essential for audit compliance and user privacy—deleted notifications
 * must never be returned via public API, protecting both data privacy and deletion workflow guarantees.
 *
 * Test Workflow:
 * 1. Create a test member to own the notification
 * 2. Create a notification for that member
 * 3. Soft-delete the notification
 * 4. Attempt to retrieve the notification by ID and assert that an error is thrown (not found or forbidden)
 */
export async function test_api_discussionBoard_test_retrieve_notification_returns_error_if_deleted(
  connection: api.IConnection,
) {
  // 1. Create a test member to own the notification
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: null
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a notification for the member
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: {
      recipient_member_id: member.id,
      trigger_actor_id: null,
      type: "test",
      content_preview: "E2E test notification.",
      url: "https://example.com/thread/" + RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardNotification.ICreate,
  });
  typia.assert(notification);

  // 3. Soft-delete the notification
  const deleted = await api.functional.discussionBoard.notifications.eraseById(connection, {
    id: notification.id,
  });
  typia.assert(deleted);
  TestValidator.predicate("deleted_at is set")(typeof deleted.deleted_at === "string" && deleted.deleted_at.length > 0);

  // 4. Attempt to retrieve the soft-deleted notification
  await TestValidator.error("Cannot retrieve a soft-deleted notification.")(async () => {
    await api.functional.discussionBoard.notifications.getById(connection, {
      id: notification.id,
    });
  });
}