import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPageIDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Comprehensive E2E test for admin user search endpoint.
 *
 * This test verifies that an authenticated admin can retrieve and
 * filter/search/sort users in the system via PATCH
 * /discussionBoard/admin/users.
 *
 * Steps:
 *
 * 1. Register an admin (via /auth/admin/join), acquiring a valid admin session
 * 2. Use PATCH /discussionBoard/admin/users to retrieve (a) normal paginated
 *    results, (b) filtered by is_verified and is_suspended, (c) searched by
 *    display_name, (d) searched by partial display_name, (e) sorted by
 *    created_at, (f) impossible filters (none should leak sensitive fields,
 *    nor result in errors, just empty data).
 * 3. Verify for each case:
 *
 *    - Pagination data is present and consistent with query
 *    - Filters and searches work as expected
 *    - Sorting works as expected
 *    - Sensitive fields (passwords, hashes, etc) are never in responses
 *    - All user fields appropriate for admin are present
 *    - No data returned outside of admin's scope
 *    - No errors thrown for empty result sets or impossible queries
 */
export async function test_api_admin_user_search_happy_path(
  connection: api.IConnection,
) {
  // 1. Register (join) an admin - requires an existing verified user; here we assume a random user_id for isolation
  // In real tests, this should use one created via prior test fixture/setup
  const adminUserId = typia.random<string & tags.Format<"uuid">>();
  const joinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(joinOutput);
  TestValidator.predicate(
    "admin session established (authorization present)",
    Boolean(connection.headers && connection.headers.Authorization),
  );

  // 2. Retrieve a basic user list, asserting structure and pagination
  const userList = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardUser.IRequest,
    },
  );
  typia.assert(userList);
  TestValidator.predicate(
    "userList pagination object present",
    Boolean(userList.pagination),
  );
  TestValidator.equals(
    "userList pagination current page is 1",
    userList.pagination.current,
    1,
  );
  TestValidator.equals(
    "userList pagination limit is 10",
    userList.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "userList data is array",
    Array.isArray(userList.data),
  );

  // Check NO sensitive data fields (e.g., passwords) in user objects for main result set
  for (const user of userList.data) {
    TestValidator.predicate(
      "userList result: user has no password hash field",
      !("password" in user) && !("password_hash" in user),
    );
  }

  // 3. Filtering by is_verified: only matching users
  const verifiedUsersList =
    await api.functional.discussionBoard.admin.users.index(connection, {
      body: {
        is_verified: true,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(verifiedUsersList);
  for (const user of verifiedUsersList.data) {
    TestValidator.equals("is_verified filter applied", user.is_verified, true);
    TestValidator.predicate(
      "verifiedUsersList: user has no password hash field",
      !("password" in user) && !("password_hash" in user),
    );
  }

  // 4. Filtering by is_suspended: only suspended users
  const suspendedUsersList =
    await api.functional.discussionBoard.admin.users.index(connection, {
      body: {
        is_suspended: true,
        page: 1,
        limit: 10,
      },
    });
  typia.assert(suspendedUsersList);
  for (const user of suspendedUsersList.data) {
    TestValidator.equals(
      "is_suspended filter applied",
      user.is_suspended,
      true,
    );
    TestValidator.predicate(
      "suspendedUsersList: user has no password hash field",
      !("password" in user) && !("password_hash" in user),
    );
  }

  // 5. Searching by display_name (full and partial match if available)
  let sampleDisplayName: string | undefined = undefined;
  if (userList.data.length > 0 && userList.data[0].display_name) {
    sampleDisplayName = userList.data[0].display_name || undefined;
  }
  if (typeof sampleDisplayName === "string" && sampleDisplayName.length > 0) {
    // Full match search
    const searchByDisplayName =
      await api.functional.discussionBoard.admin.users.index(connection, {
        body: { search: sampleDisplayName, page: 1, limit: 10 },
      });
    typia.assert(searchByDisplayName);
    TestValidator.predicate(
      "searchByDisplayName: user(s) with display_name match appear",
      searchByDisplayName.data.some(
        (u) => u.display_name === sampleDisplayName,
      ),
    );
    for (const user of searchByDisplayName.data) {
      TestValidator.predicate(
        "searchByDisplayName: user has no password hash field",
        !("password" in user) && !("password_hash" in user),
      );
    }
    // Partial match search (slice 1/2)
    if (sampleDisplayName.length > 2) {
      const partial = sampleDisplayName.slice(
        0,
        Math.floor(sampleDisplayName.length / 2),
      );
      const searchByPartial =
        await api.functional.discussionBoard.admin.users.index(connection, {
          body: { search: partial, page: 1, limit: 10 },
        });
      typia.assert(searchByPartial);
      TestValidator.predicate(
        "searchByPartial: user(s) with partial display_name match present",
        searchByPartial.data.some((u) =>
          (u.display_name || "").includes(partial),
        ),
      );
      for (const user of searchByPartial.data) {
        TestValidator.predicate(
          "searchByPartial: user has no password hash field",
          !("password" in user) && !("password_hash" in user),
        );
      }
    }
  }

  // 6. Out-of-bounds page (should yield empty data, not error)
  const outOfBounds = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { page: 99999, limit: 10 },
    },
  );
  typia.assert(outOfBounds);
  TestValidator.equals(
    "outOfBounds page returns empty data",
    outOfBounds.data.length,
    0,
  );
  for (const user of outOfBounds.data) {
    TestValidator.predicate(
      "outOfBounds: user has no password hash field",
      !("password" in user) && !("password_hash" in user),
    );
  }

  // 7. Filtering for non-existent email, should yield empty data
  const nonsenseEmail = `${RandomGenerator.alphabets(12)}@test.invalid`;
  const impossible = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { email: nonsenseEmail, page: 1, limit: 10 },
    },
  );
  typia.assert(impossible);
  TestValidator.equals(
    "impossible email filter returns empty data",
    impossible.data.length,
    0,
  );
  for (const user of impossible.data) {
    TestValidator.predicate(
      "impossible: user has no password hash field",
      !("password" in user) && !("password_hash" in user),
    );
  }

  // 8. Sorting by created_at ascending
  const sortedAsc = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { page: 1, limit: 10, sort_by: "created_at", sort_order: "asc" },
    },
  );
  typia.assert(sortedAsc);
  for (let i = 1; i < sortedAsc.data.length; ++i) {
    TestValidator.predicate(
      `sortedAsc: users sorted ascending at ${i}`,
      sortedAsc.data[i - 1].created_at <= sortedAsc.data[i].created_at,
    );
    TestValidator.predicate(
      "sortedAsc: user has no password hash field",
      !("password" in sortedAsc.data[i]) &&
        !("password_hash" in sortedAsc.data[i]),
    );
  }

  // 9. Sorting by created_at descending
  const sortedDesc = await api.functional.discussionBoard.admin.users.index(
    connection,
    {
      body: { page: 1, limit: 10, sort_by: "created_at", sort_order: "desc" },
    },
  );
  typia.assert(sortedDesc);
  for (let i = 1; i < sortedDesc.data.length; ++i) {
    TestValidator.predicate(
      `sortedDesc: users sorted descending at ${i}`,
      sortedDesc.data[i - 1].created_at >= sortedDesc.data[i].created_at,
    );
    TestValidator.predicate(
      "sortedDesc: user has no password hash field",
      !("password" in sortedDesc.data[i]) &&
        !("password_hash" in sortedDesc.data[i]),
    );
  }
}
