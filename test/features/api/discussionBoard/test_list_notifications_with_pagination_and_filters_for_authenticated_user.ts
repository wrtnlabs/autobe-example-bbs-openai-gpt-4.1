import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for retrieving filtered and paginated notification lists.
 *
 * This test validates that a logged-in user can use PATCH /discussionBoard/notifications to retrieve only their own notifications,
 * respecting filter options (unread/filter/date), different roles, sorting, and pagination. It covers that notifications are visible
 * only for the intended recipient, pagination behaves as expected, and basic filter (read/unread/type/date) options are honored.
 *
 * Steps:
 * 1. Register test users for all allowed roles (standard member and alternate)
 * 2. Generate notifications for each user with a variety of types, read/unread states, and distributed timestamps
 * 3. For a user, test:
 *    a. Patch the notification list endpoint without a filter (should return all their notifications only)
 *    b. Patch with filter:unread=true (only unread of their notifications)
 *    c. Patch with filter:unread=false (only read of their notifications)
 *    d. Patch with filter:type=(a specific notification type used among those created)
 *    e. Patch with paging (limit/page) to ensure pagination works
 *    f. Patch with date range filter delivered_from/delivered_to to select by notification date
 *    g. Patch with sort order (if available)
 *    h. Confirm that another user's notifications never appear in the response
 */
export async function test_api_discussionBoard_test_list_notifications_with_pagination_and_filters_for_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register users of different roles (here: standard member and alternate)
  const password = "hashed_password_123";
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: password,
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    },
  });
  typia.assert(memberB);

  // 2. Generate notifications for each user
  // Several combinations of read/unread, type, timestamp
  const now = new Date();
  const types = ["reply", "mention", "moderation", "subscription"];
  const notifications: any[] = [];

  // Generate notifications for memberA
  for (let i = 0; i < 10; ++i) {
    const delivered_at = new Date(now.getTime() - (i * 1000 * 60 * 60)).toISOString();
    const note = await api.functional.discussionBoard.notifications.post(connection, {
      body: {
        recipient_member_id: memberA.id,
        trigger_actor_id: i % 2 === 0 ? memberB.id : null,
        type: types[i % types.length],
        content_preview: `Preview ${i}`,
        url: `/posts/${i}`,
      },
    });
    typia.assert(note);
    // On real system, we cannot set delivered_at directly, but keep for reference
    notifications.push({ ...note, delivered_at });
  }
  for (let i = 0; i < 5; ++i) {
    const delivered_at = new Date(now.getTime() - (i * 1000 * 60 * 10)).toISOString();
    const note = await api.functional.discussionBoard.notifications.post(connection, {
      body: {
        recipient_member_id: memberB.id,
        trigger_actor_id: i % 2 === 0 ? memberA.id : null,
        type: types[(i + 1) % types.length],
        content_preview: `Alt Preview ${i}`,
        url: `/posts/alt/${i}`,
      },
    });
    typia.assert(note);
  }

  // 3. For memberA: test no filter (all their notifications)
  let res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: { recipient_member_id: memberA.id },
      page: 1,
      limit: 100,
      sort: "delivered_at desc",
    },
  });
  typia.assert(res);
  TestValidator.predicate("returns only memberA notifications")(
    res.data.every((n) => n.recipient_member_id === memberA.id)
  );

  // 3b. Filter unread only (simulate unread by filtering read: false)
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
        read: false,
      },
      page: 1,
      limit: 100,
    },
  });
  typia.assert(res);
  TestValidator.predicate("returns only unread memberA notifications")(
    res.data.every((n) => n.recipient_member_id === memberA.id && n.read === false)
  );

  // 3c. Filter read only
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
        read: true,
      },
      page: 1,
      limit: 100,
    },
  });
  typia.assert(res);
  TestValidator.predicate("returns only read memberA notifications")(
    res.data.every((n) => n.recipient_member_id === memberA.id && n.read === true)
  );

  // 3d. Filter by type (pick one used above)
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
        type: types[0],
      },
      page: 1,
      limit: 100,
    },
  });
  typia.assert(res);
  TestValidator.predicate("returns only memberA notifications of type reply")(
    res.data.every((n) => n.recipient_member_id === memberA.id && n.type === types[0])
  );

  // 3e. Pagination: limit to 3 per page
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
      },
      page: 1,
      limit: 3,
    },
  });
  typia.assert(res);
  TestValidator.equals("pagination size")(res.data.length)(3);

  // 3f. Date window (delivered_from, delivered_to)
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString();
  const to = now.toISOString();
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
        delivered_from: from,
        delivered_to: to,
      },
      page: 1,
      limit: 100,
    },
  });
  typia.assert(res);
  TestValidator.predicate("returns only memberA notifications within date range")(
    res.data.every(
      (n) =>
        n.recipient_member_id === memberA.id &&
        n.delivered_at !== null &&
        n.delivered_at !== undefined &&
        n.delivered_at >= from &&
        n.delivered_at <= to
    )
  );

  // 3g. Sort order (delivered_at asc)
  res = await api.functional.discussionBoard.notifications.patch(connection, {
    body: {
      filter: {
        recipient_member_id: memberA.id,
      },
      sort: "delivered_at asc",
      page: 1,
      limit: 100,
    },
  });
  typia.assert(res);
  let prev: string | null = null;
  for (const n of res.data) {
    if (prev !== null)
      TestValidator.predicate("sort delivered_at ascending")(prev <= (n.delivered_at ?? ""));
    prev = n.delivered_at ?? "";
  }

  // 3h. Confirm that memberB's notifications do not appear for memberA
  TestValidator.predicate("no cross-user leak in memberA notifications only")(
    res.data.every((n) => n.recipient_member_id === memberA.id)
  );
  // Optionally more: repeat for memberB, edge tests, etc.
}