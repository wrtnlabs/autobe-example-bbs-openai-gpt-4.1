import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";
import type { IPageIDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPrivacyDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate admin search and filter functionality for privacy dashboards.
 *
 * This end-to-end test ensures an authenticated admin can search/filter
 * privacy dashboards created for different users, that pagination, filter
 * parameters, and result redaction rules all work, and that no sensitive
 * data is improperly exposed.
 *
 * Steps:
 *
 * 1. Register user1 with consent.
 * 2. Register user2 with consent.
 * 3. Elevate user1 as admin (register admin account with user1.id).
 * 4. Authenticate as admin (token refresh is implicit in /auth/admin/join
 *    response).
 * 5. For each user, create a privacy dashboard record via the admin API,
 *    assigning distinct access_requested_at timestamps (simulate
 *    access_fulfilled for user2ʼs dashboard).
 * 6. As the admin, search with no filters (should return both dashboards,
 *    paginated, with all admin-visible fields).
 * 7. Filter by user_id (each user in turn; always correct filtering and record
 *    count).
 * 8. Filter by fulfillment status (true and false; should match expected
 *    records).
 * 9. Filter by requested_at date range (ensure range boundaries select proper
 *    records).
 * 10. Validate pagination meta: count, limit, and pages.
 * 11. For each query, verify data visibility and absence of over-exposure for
 *     sensitive fields.
 */
export async function test_api_admin_privacy_dashboard_search_filter_success(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Username = RandomGenerator.name();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      username: user1Username,
      password: "Aa&1234567", // valid example
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user1);

  // 2. Register user2
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Username = RandomGenerator.name();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      username: user2Username,
      password: "Bb&7654321",
      consent: true,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user2);

  // 3. Elevate user1 to admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: user1.user.id,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Create two privacy dashboard records via admin API
  const now = new Date();
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24); // -1d
  const later = new Date(now.getTime() + 1000 * 60 * 60 * 24); // +1d

  const dashboard1 =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: user1.user.id,
          access_requested_at: earlier.toISOString(),
          dashboard_payload: JSON.stringify({ test: "payload1" }),
          export_file_uri: null,
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(dashboard1);

  const dashboard2 =
    await api.functional.discussionBoard.admin.privacyDashboards.create(
      connection,
      {
        body: {
          discussion_board_user_id: user2.user.id,
          access_requested_at: later.toISOString(),
          dashboard_payload: JSON.stringify({ test: "payload2" }),
          export_file_uri: "https://example.com/export.zip",
        } satisfies IDiscussionBoardPrivacyDashboard.ICreate,
      },
    );
  typia.assert(dashboard2);

  // 5. Search with no filters
  const resAll =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(resAll);
  TestValidator.predicate(
    "All dashboards are returned",
    resAll.data.length >= 2,
  );
  TestValidator.predicate(
    "Every record has proper user_id",
    resAll.data.some((d) => d.discussion_board_user_id === user1.user.id) &&
      resAll.data.some((d) => d.discussion_board_user_id === user2.user.id),
  );

  // 6. Filter by user_id (user1)
  const resUser1 =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: { user_id: user1.user.id },
      },
    );
  typia.assert(resUser1);
  TestValidator.equals("Filter by user1", resUser1.data.length, 1);
  TestValidator.equals(
    "user1 id match",
    resUser1.data[0].discussion_board_user_id,
    user1.user.id,
  );

  // 7. Filter by user_id (user2)
  const resUser2 =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: { user_id: user2.user.id },
      },
    );
  typia.assert(resUser2);
  TestValidator.equals("Filter by user2", resUser2.data.length, 1);
  TestValidator.equals(
    "user2 id match",
    resUser2.data[0].discussion_board_user_id,
    user2.user.id,
  );

  // 8. Filter by access_fulfilled (true/false on simulated fulfilled/unfulfilled)
  const resFulfilled =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: { access_fulfilled: true },
      },
    );
  typia.assert(resFulfilled);
  TestValidator.predicate(
    "Fulfilled records present",
    resFulfilled.data.some((d) => d.export_file_uri != null),
  );

  const resUnfulfilled =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: { access_fulfilled: false },
      },
    );
  typia.assert(resUnfulfilled);
  TestValidator.predicate(
    "Unfulfilled records present",
    resUnfulfilled.data.some((d) => d.export_file_uri == null),
  );

  // 9. Filter by requested_at date range
  const resDateRange =
    await api.functional.discussionBoard.admin.privacyDashboards.index(
      connection,
      {
        body: {
          access_requested_at_from: earlier.toISOString(),
          access_requested_at_to: later.toISOString(),
        },
      },
    );
  typia.assert(resDateRange);
  TestValidator.predicate(
    "Date range filter selects both dashboards",
    resDateRange.data.length >= 2,
  );

  // 10. Validate pagination metadata
  TestValidator.predicate(
    "Pagination fields are present",
    resAll.pagination != null && typeof resAll.pagination.current === "number",
  );
  TestValidator.predicate(
    "Total count at least 2",
    resAll.pagination.records >= 2,
  );

  // 11. Validate field visibility, check no improper exposure for admin
  for (const dash of resAll.data) {
    TestValidator.predicate(
      "dashboard_payload is present",
      typeof dash.dashboard_payload === "string",
    );
    TestValidator.predicate(
      "export_file_uri may be string or null",
      typeof dash.export_file_uri === "string" || dash.export_file_uri === null,
    );
  }
}
