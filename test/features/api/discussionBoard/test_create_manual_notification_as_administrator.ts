import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate administrative creation of manual/system notifications for a specified user.
 *
 * This test ensures that administrators can generate a notification event targeted to a member.
 * The scenario covers:
 * 1. Registration of an administrator account (served by member registration API, as roles are not distinguished in the DTOs available)
 * 2. Registration of a regular member who will be the notification recipient
 * 3. The administrator creates a manual/system notification for the member with all required fields and an optional trigger_actor_id
 * 4. The result is a notification object containing all details as specified
 * 5. Validation of all relevant fields, confirming proper linkage between admin, recipient, and notification properties
 */
export async function test_api_discussionBoard_test_create_manual_notification_as_administrator(
  connection: api.IConnection,
) {
  // 1. Register "administrator" (for this E2E, just create a member deemed to be admin for notification trigger)
  const adminInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const admin = await api.functional.discussionBoard.members.post(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Register notification recipient member
  const recipientInput = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  } satisfies IDiscussionBoardMember.ICreate;
  const recipient = await api.functional.discussionBoard.members.post(connection, {
    body: recipientInput,
  });
  typia.assert(recipient);

  // 3. Admin triggers notification for the recipient, specifying all required and optional fields
  const notificationInput = {
    recipient_member_id: recipient.id,
    trigger_actor_id: admin.id,
    type: "moderation",
    content_preview: "Admin notice test: test notification preview text.",
    url: `/discussionBoard/members/${recipient.id}`,
  } satisfies IDiscussionBoardNotification.ICreate;
  const notification = await api.functional.discussionBoard.notifications.post(connection, {
    body: notificationInput,
  });
  typia.assert(notification);

  // 4. Validate that the notification was delivered correctly and fields match expectations
  TestValidator.equals("recipient member id")(notification.recipient_member_id)(recipient.id);
  TestValidator.equals("trigger actor id")(notification.trigger_actor_id)(admin.id);
  TestValidator.equals("type")(notification.type)(notificationInput.type);
  TestValidator.equals("content_preview")(notification.content_preview)(notificationInput.content_preview);
  TestValidator.equals("url")(notification.url)(notificationInput.url);
  TestValidator.equals("read")(notification.read)(false);
  TestValidator.predicate("created_at present")(
    typeof notification.created_at === "string" && notification.created_at.length > 0
  );
}