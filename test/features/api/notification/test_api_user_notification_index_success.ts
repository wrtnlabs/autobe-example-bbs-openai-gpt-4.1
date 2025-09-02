import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import type { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test to verify the authenticated user's notification index/listing
 * endpoint with filtering and pagination. Tests include status, type, date
 * window, and sort options.
 *
 * 1. Register a new user (auth/user/join) to obtain authentication and user
 *    info.
 * 2. (Notification creation is presumed to occur implicitly in backend or is
 *    pre-seeded for E2E; if unavailable, test can only validate
 *    listing/filter logic for available - possibly empty - result set.)
 * 3. Call PATCH /discussionBoard/user/notifications with request bodies:
 *
 *    - A. Empty filter (all notifications for user)
 *    - B. Filter by status
 *    - C. Filter by type
 *    - D. Filter by from_date/to_date window
 *    - E. Custom page and limit
 *    - F. Sort by created_at ascending/descending
 *    - G. Compound filters (e.g., type + status, or type + from_date)
 * 4. For each query:
 *
 *    - Validate the result shape (typia.assert)
 *    - Validate pagination fields (current, limit, records, pages >= 1)
 *    - If items present, validate that each notification.recipient_user_id
 *         matches authenticated user id
 *    - For filtered queries (e.g., status/type), check that field in all
 *         returned notifications
 *    - For time window queries, check all notifications.created_at falls within
 *         window
 *    - For sort queries, check ordering by created_at as requested
 */
export async function test_api_user_notification_index_success(
  connection: api.IConnection,
) {
  // 1. Register new user and capture authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = "P@ssword123";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email,
      username,
      password,
      display_name: RandomGenerator.name(),
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  const userId = userJoin.user.id;

  // 2. PATCH notifications index with empty filter (default listing)
  const fullList =
    await api.functional.discussionBoard.user.notifications.index(connection, {
      body: {},
    });
  typia.assert(fullList);
  TestValidator.equals(
    "pagination current page is 1",
    fullList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "notifications belong to user",
    fullList.data.every((n) => n.recipient_user_id === userId),
  );

  // 3. Apply status filter (if notifications exist to check)
  const statusFilter = fullList.data[0]?.status;
  if (statusFilter) {
    const statusList =
      await api.functional.discussionBoard.user.notifications.index(
        connection,
        {
          body: { status: statusFilter },
        },
      );
    typia.assert(statusList);
    TestValidator.predicate(
      "all notifications match status filter",
      statusList.data.every((n) => n.status === statusFilter),
    );
  }

  // 4. Apply type filter (if notifications exist to check)
  const typeFilter = fullList.data[0]?.type;
  if (typeFilter) {
    const typeList =
      await api.functional.discussionBoard.user.notifications.index(
        connection,
        {
          body: { type: typeFilter },
        },
      );
    typia.assert(typeList);
    TestValidator.predicate(
      "all notifications match type filter",
      typeList.data.every((n) => n.type === typeFilter),
    );
  }

  // 5. Apply date window filter (if notifications exist)
  const firstCreatedAt = fullList.data[0]?.created_at;
  if (firstCreatedAt) {
    const from = new Date(
      new Date(firstCreatedAt).getTime() - 1000,
    ).toISOString();
    const to = new Date(
      new Date(firstCreatedAt).getTime() + 1000,
    ).toISOString();
    const windowList =
      await api.functional.discussionBoard.user.notifications.index(
        connection,
        {
          body: { from_date: from, to_date: to },
        },
      );
    typia.assert(windowList);
    TestValidator.predicate(
      "all notifications fall within date window",
      windowList.data.every((n) => n.created_at >= from && n.created_at <= to),
    );
  }

  // 6. Custom page & limit
  const limit = 2;
  const pagedList =
    await api.functional.discussionBoard.user.notifications.index(connection, {
      body: { limit, page: 1 },
    });
  typia.assert(pagedList);
  TestValidator.equals(
    "pagination limit set",
    pagedList.pagination.limit,
    limit,
  );

  // 7. Sort by created_at descending
  const sortedList =
    await api.functional.discussionBoard.user.notifications.index(connection, {
      body: { sort: "-created_at" },
    });
  typia.assert(sortedList);
  TestValidator.predicate(
    "notifications sorted by created_at descending",
    sortedList.data.every(
      (n, i, arr) => i === 0 || n.created_at <= arr[i - 1].created_at,
    ),
  );

  // 8. Compound filter: type + status if available
  if (typeFilter && statusFilter) {
    const compoundList =
      await api.functional.discussionBoard.user.notifications.index(
        connection,
        {
          body: { type: typeFilter, status: statusFilter },
        },
      );
    typia.assert(compoundList);
    TestValidator.predicate(
      "notifications match both type and status",
      compoundList.data.every(
        (n) => n.type === typeFilter && n.status === statusFilter,
      ),
    );
  }
}
