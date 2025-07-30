import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * Validate that an authenticated discussion board member can successfully
 * retrieve their own notifications.
 *
 * This test simulates the following workflow:
 *
 * 1. Admin registers a new board member.
 * 2. The member subscribes to a discussion entity (e.g., thread/topic) for
 *    notification delivery (using their own id as subscriber).
 * 3. Admin creates a notification directly for the member, possibly referencing
 *    the created subscription and target entity.
 * 4. The member lists their notifications and confirms that at least the
 *    specifically-created notification exists and is visible in the returned,
 *    paginated notifications data.
 */
export async function test_api_discussionBoard_test_list_notifications_for_authenticated_member(
  connection: api.IConnection,
) {
  // 1. Admin creates/registers a member
  const userIdentifier = RandomGenerator.alphaNumeric(16);
  const joinedAt = new Date().toISOString();
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: userIdentifier,
        joined_at: joinedAt,
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Member creates a subscription (to a fictional thread/topic)
  const targetId = typia.random<string & tags.Format<"uuid">>(); // A fake thread or topic UUID
  const subscription =
    await api.functional.discussionBoard.member.subscriptions.create(
      connection,
      {
        body: {
          subscriber_id: member.id,
          target_type: "thread",
          target_id: targetId,
          notification_method: "in-app",
          is_active: true,
        } satisfies IDiscussionBoardSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 3. Admin creates a notification for this member
  const notificationMessage = "Test event: you have a reply in your thread.";
  const deliveredAt = new Date().toISOString();
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: member.id,
          subscription_id: subscription.id,
          notification_type: "reply",
          target_type: "thread",
          target_id: targetId,
          message: notificationMessage,
          delivered_at: deliveredAt,
          delivery_status: "delivered",
        } satisfies IDiscussionBoardNotification.ICreate,
      },
    );
  typia.assert(notification);

  // 4. Member lists their notifications
  const page =
    await api.functional.discussionBoard.member.notifications.index(connection);
  typia.assert(page);

  // Check that our created notification is present
  const found = page.data.some((n) => n.id === notification.id);
  TestValidator.predicate("notification visible to member")(found);

  // Optionally, validate pagination meta exists
  TestValidator.predicate("pagination fields present")(!!page.pagination);
}
