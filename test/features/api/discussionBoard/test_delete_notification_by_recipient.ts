import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate notification deletion by recipient and soft-deletion semantics.
 *
 * This test ensures that a discussion board member (as the recipient of a notification) can delete that notification, and on deletion, the notification's `deleted_at` field is set, preventing future listing or accidental recovery. 
 *
 * Steps:
 * 1. Register a new discussion board member
 * 2. Create a notification addressed to that member
 * 3. Delete the notification as the same member
 * 4. Verify `deleted_at` is set and business logic is enforced
 */
export async function test_api_discussionBoard_test_delete_notification_by_recipient(
  connection: api.IConnection,
) {
  // 1. Register a new member to act as notification recipient
  const username = RandomGenerator.alphabets(12);
  const email = typia.random<string & tags.Format<"email">>();
  const hashed_password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();

  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username,
      email,
      hashed_password,
      display_name,
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a notification for this member
  const notification = await api.functional.discussionBoard.notifications.post(
    connection,
    {
      body: {
        recipient_member_id: member.id,
        trigger_actor_id: null,
        type: "reply",
        content_preview: "Test notification for recipient deletion.",
        url: "https://discussion.example/notification-delete-test",
      } satisfies IDiscussionBoardNotification.ICreate,
    },
  );
  typia.assert(notification);

  // 3. Delete the notification as the same member
  const deleted = await api.functional.discussionBoard.notifications.eraseById(
    connection,
    {
      id: notification.id,
    },
  );
  typia.assert(deleted);

  // 4. Validate soft-delete: deleted_at must be set, recipient/id remain correct
  TestValidator.predicate("deleted_at is set after notification deletion")(
    !!deleted.deleted_at,
  );
  TestValidator.equals("recipient of deleted notification remains unchanged")(
    deleted.recipient_member_id,
  )(member.id);
  TestValidator.equals("deleted notification id matches original")(
    deleted.id,
  )(notification.id);
}