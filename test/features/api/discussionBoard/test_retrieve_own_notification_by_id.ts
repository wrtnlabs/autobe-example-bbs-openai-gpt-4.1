import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that a member can successfully retrieve one of their own notifications by ID.
 *
 * This test simulates a typical user receiving a notification and then fetching its details.
 *
 * Step-by-step procedure:
 * 1. Register a discussion board member with typical random data.
 * 2. Create a notification for the registered member.
 * 3. Retrieve that notification by its ID as the same user.
 * 4. Assert that the retrieved notification matches what was created and contains all expected details.
 * 5. (Edge case) Attempt to retrieve a nonexistent notification ID—should throw error.
 */
export async function test_api_discussionBoard_test_retrieve_own_notification_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new member
  const memberInput: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Create a notification for the user
  const notificationInput: IDiscussionBoardNotification.ICreate = {
    recipient_member_id: member.id,
    trigger_actor_id: null,
    type: "reply",
    content_preview: "You have a new reply!",
    url: "/discussionBoard/thread/12345",
  };
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: notificationInput,
  });
  typia.assert(notification);
  TestValidator.equals("Notification recipient matches member")(notification.recipient_member_id)(member.id);

  // 3. Retrieve the notification by ID as the same user
  const fetched = await api.functional.discussionBoard.notifications.getById(connection, {
    id: notification.id,
  });
  typia.assert(fetched);
  TestValidator.equals("Fetched notification ID matches")(fetched.id)(notification.id);
  TestValidator.equals("Fetched notification recipient matches")(fetched.recipient_member_id)(member.id);

  // 4. Additional content checks
  TestValidator.equals("Notification type matches")(fetched.type)(notificationInput.type);
  TestValidator.equals("Notification preview matches")(fetched.content_preview)(notificationInput.content_preview);
  TestValidator.equals("Notification URL matches")(fetched.url)(notificationInput.url);
  TestValidator.predicate("Notification is not deleted")(fetched.deleted_at === null || fetched.deleted_at === undefined);

  // 5. Attempt to fetch a nonexistent notification (should error)
  await TestValidator.error("Fetching nonexistent notification throws error")(async () => {
    await api.functional.discussionBoard.notifications.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}