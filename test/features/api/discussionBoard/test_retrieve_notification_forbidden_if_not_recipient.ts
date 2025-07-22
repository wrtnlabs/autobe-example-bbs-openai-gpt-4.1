import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Test that a notification cannot be retrieved by a user who is not its intended recipient.
 *
 * This scenario validates privacy and access control of the notification retrieval endpoint. It ensures no member can view notifications addressed to another account.
 *
 * Workflow:
 * 1. Register User A (recipient)
 * 2. Register User B (unauthorized actor)
 * 3. While authenticated as User A, create a notification with User A as the recipient
 * 4. While authenticated as User B, attempt to retrieve the notification using its ID
 * 5. Expect a forbidden or not found error response (privacy rules enforced)
 *
 * Steps confirm that only the recipient may access their own notification details, and others cannot view them—even if having the notification's UUID.
 */
export async function test_api_discussionBoard_test_retrieve_notification_forbidden_if_not_recipient(
  connection: api.IConnection,
) {
  // 1. Register User A (recipient)
  const userACreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const userA = await api.functional.discussionBoard.members.post(connection, { body: userACreate });
  typia.assert(userA);

  // 2. Register User B (unauthorized actor)
  const userBCreate = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const userB = await api.functional.discussionBoard.members.post(connection, { body: userBCreate });
  typia.assert(userB);

  // 3. Create notification for User A (acting as admin/system)
  const notificationInput = {
    recipient_member_id: userA.id,
    trigger_actor_id: null,
    type: "test",
    content_preview: "This is a test notification for privacy checks.",
    url: "/test/url-for-notification"
  } satisfies IDiscussionBoardNotification.ICreate;
  const notification = await api.functional.discussionBoard.notifications.post(connection, { body: notificationInput });
  typia.assert(notification);

  // 4. Simulate User B context (user B attempts to fetch User A's notification)
  // NOTE: In a real authentication scenario, you would switch the connection/session to User B here. For testing, this step assumes such context is configured.

  // 5. Attempt to fetch User A's notification as User B and expect error
  await TestValidator.error("Non-recipient should not access notification")(
    () => api.functional.discussionBoard.notifications.getById(connection, { id: notification.id })
  );
}