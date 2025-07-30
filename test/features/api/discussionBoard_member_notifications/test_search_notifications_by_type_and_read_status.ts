import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced notification search and filtering for a member.
 *
 * This test scenario verifies that a member can use the PATCH endpoint to
 * filter and paginate their notifications by different criteria: notification
 * type (e.g., 'mention', 'reply', 'system'), delivery status, and unread
 * status.
 *
 * Steps:
 *
 * 1. Register a new discussion board member for testing.
 * 2. Generate notifications with different notification_type and delivery_status
 *    values for this member (at least one each of: 'mention', 'reply',
 *    'system', and a variety of delivery_status like 'delivered', 'pending',
 *    'failed', and both read_at set and unset).
 * 3. Search with PATCH using different filters:
 *
 *    - By notification_type (e.g., only 'mention'), expect only matching
 *         notifications.
 *    - By delivery_status (e.g., 'delivered'), expect only delivered items.
 *    - By unread (read: false), ensure only unread notifications are returned.
 *    - With pagination parameters (limit=2, page=1), verify pagination meta and data
 *         slice.
 *    - Combination filters (e.g., 'mention' & 'delivered' & unread)
 * 4. Assert that the notifications in each response match the filters and the
 *    pagination meta is correct.
 */
export async function test_api_discussionBoard_member_notifications_test_search_notifications_by_type_and_read_status(
  connection: api.IConnection,
) {
  // 1. Register a new discussion board member via admin API
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: `testuser_${typia.random<string>()}`,
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Create various notifications for this member
  const notifications = [
    // delivered, unread, mention
    {
      notification_type: "mention",
      delivery_status: "delivered",
      read: false,
    },
    // delivered, read, reply
    { notification_type: "reply", delivery_status: "delivered", read: true },
    // pending, unread, system
    { notification_type: "system", delivery_status: "pending", read: false },
    // failed, unread, reply
    { notification_type: "reply", delivery_status: "failed", read: false },
  ];
  const created_ids: string[] = [];
  for (const config of notifications) {
    const notif =
      await api.functional.discussionBoard.admin.notifications.create(
        connection,
        {
          body: {
            recipient_id: member.id,
            notification_type: config.notification_type,
            target_type: "thread",
            target_id: typia.random<string & tags.Format<"uuid">>(),
            message: `${config.notification_type} notification`,
            delivered_at: new Date().toISOString(),
            delivery_status: config.delivery_status,
            failure_reason:
              config.delivery_status === "failed" ? "Network error" : null,
          } satisfies IDiscussionBoardNotification.ICreate,
        },
      );
    typia.assert(notif);
    // Mark as read if needed (simulate by setting read_at after creation, if possible in system API)
    // For this test, since we cannot set read_at directly on creation,
    // we simply test patches for unread (read_at: undefined).
    created_ids.push(notif.id);
  }

  // 3. Test advanced filtering with PATCH
  // a. Filter by notification_type = 'mention'
  const outMention =
    await api.functional.discussionBoard.member.notifications.search(
      connection,
      {
        body: {
          notification_type: "mention",
          recipient_id: member.id,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(outMention);
  TestValidator.predicate("only mention notifications")(
    outMention.data.every((n) => n.notification_type === "mention"),
  );

  // b. Filter by delivery_status = 'delivered'
  const outDelivered =
    await api.functional.discussionBoard.member.notifications.search(
      connection,
      {
        body: {
          delivery_status: "delivered",
          recipient_id: member.id,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(outDelivered);
  TestValidator.predicate("only delivered")(
    outDelivered.data.every((n) => n.delivery_status === "delivered"),
  );

  // c. Filter unread (read: false)
  const outUnread =
    await api.functional.discussionBoard.member.notifications.search(
      connection,
      {
        body: {
          read: false,
          recipient_id: member.id,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(outUnread);
  TestValidator.predicate("only unread")(
    outUnread.data.every((n) => !n.read_at),
  );

  // d. Pagination (limit 2)
  const outPaged =
    await api.functional.discussionBoard.member.notifications.search(
      connection,
      {
        body: {
          recipient_id: member.id,
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(outPaged);
  TestValidator.equals("limit")(outPaged.pagination.limit)(2);
  TestValidator.equals("current page")(outPaged.pagination.current)(1);
  TestValidator.equals("records")(outPaged.pagination.records)(
    notifications.length,
  );
  TestValidator.equals("pages")(outPaged.pagination.pages)(
    Math.ceil(notifications.length / 2),
  );

  // e. Combined filter: notification_type = mention, delivery_status = delivered, unread
  const outCombined =
    await api.functional.discussionBoard.member.notifications.search(
      connection,
      {
        body: {
          recipient_id: member.id,
          notification_type: "mention",
          delivery_status: "delivered",
          read: false,
        } satisfies IDiscussionBoardNotification.IRequest,
      },
    );
  typia.assert(outCombined);
  TestValidator.predicate("all combined filters")(
    outCombined.data.every(
      (n) =>
        n.notification_type === "mention" &&
        n.delivery_status === "delivered" &&
        !n.read_at,
    ),
  );
}
