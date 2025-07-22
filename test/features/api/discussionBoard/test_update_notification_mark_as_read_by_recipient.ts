import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that a notification recipient can update a notification to mark it as read
 *
 * This end-to-end test verifies that:
 * 1. A member account can be registered (will be the notification recipient)
 * 2. A notification is correctly created for that member
 * 3. The member can update the notification to mark it as read
 * 4. After the update:
 *    - The 'read' field for the notification becomes true
 *    - Relevant audit fields remain logically correct or unchanged
 *
 * Test Steps:
 * 1. Register a discussion board member (recipient)
 * 2. Create a notification for that member (with read: false by default)
 * 3. Mark the notification as read (read: true) using the update API
 * 4. Assert that read transitions from false -> true, and core notification fields are preserved
 */
export async function test_api_discussionBoard_test_update_notification_mark_as_read_by_recipient(
  connection: api.IConnection,
) {
  // 1. Register a discussion board member (recipient)
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(24),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Create a notification for the member
  const notifInput: IDiscussionBoardNotification.ICreate = {
    recipient_member_id: member.id,
    trigger_actor_id: null,
    type: "mention",
    content_preview: "You were mentioned in a comment!",
    url: "https://community.example.com/thread/" + RandomGenerator.alphaNumeric(8),
  };
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: notifInput,
  });
  typia.assert(notification);
  TestValidator.equals("Initial notification is unread")(notification.read)(false);

  // 3. Update the notification to mark as read
  const updated = await api.functional.discussionBoard.notifications.putById(connection, {
    id: notification.id,
    body: { read: true },
  });
  typia.assert(updated);

  // 4. Assert read transitions and immutable fields stay consistent
  TestValidator.equals("Read field after update")(updated.read)(true);
  TestValidator.equals("Member and notification unchanged")(updated.recipient_member_id)(notification.recipient_member_id);
  TestValidator.equals("Type unchanged")(updated.type)(notification.type);
  TestValidator.equals("Notification id unchanged")(updated.id)(notification.id);
  TestValidator.equals("created_at unchanged")(updated.created_at)(notification.created_at);
  if (notification.delivered_at !== undefined && updated.delivered_at !== undefined) {
    TestValidator.equals("delivered_at unchanged or progresses")(typeof updated.delivered_at === typeof notification.delivered_at)(true);
  }
}