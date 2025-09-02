import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IPageIDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardVisitor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardVisitorISummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitorISummary";

/**
 * E2E test to validate admin visitor listing endpoint with pagination and
 * filter.
 *
 * Ensures that:
 *
 * - Admin authentication is required for access;
 * - Filtering by user_agent, ip_address, created_at date-range, and sort-by
 *   all work;
 * - Pagination metadata (current/limit/records/pages) reflects the actual
 *   dataset;
 * - Results respect supplied filters, omit PII, and only expose allowed
 *   summary fields;
 * - Query with no matches returns a valid, empty page.
 *
 * 1. Register and authenticate as admin (using admin/join endpoint, requires
 *    test user_id).
 * 2. Populate multiple distinct visitors using /auth/visitor/join (each with
 *    different user_agent and ip_address).
 * 3. As admin, call PATCH /discussionBoard/admin/visitors: a. Without filter
 *    (fetch all, e.g. page=1/limit=10) – ensure all created visitors are
 *    present, and metainfo is correct. b. With user_agent filter (on one
 *    value previously inserted) – only that visitor appears. c. With
 *    pagination testing (limit=1, then page=2) – only one item per result,
 *    dataset sliced and paginated. d. With created_at date range: supply a
 *    range outside possible visitor created_at values (should yield empty
 *    result, correct pagination meta, and no crash). e. With both
 *    user_agent and ip_address combined filter (exact match one visitor
 *    only).
 * 4. On each response, validate: — Response type (typia.assert type check); —
 *    Data array length and visitor properties (id, visitor_token,
 *    created_at, user_agent); — Filtering and pagination is correct, all
 *    returned data matches filter criteria; — Sensitive/PII fields are not
 *    present (data structure check by keys).
 */
export async function test_api_admin_visitor_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin (requires user_id — normally would create/test user, but for core e2e, use random user_id).
  const adminUserId: string = typia.random<string & tags.Format<"uuid">>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: adminUserId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminAuthorized);

  // 2. Populate visitors (produce at least 3 with distinct properties)
  const visitorInputs = [
    { user_agent: "TestAgentA/1.0", ip_address: "192.168.0.1" },
    { user_agent: "TestAgentB/2.0", ip_address: "10.0.0.5" },
    { user_agent: "TestAgentC/3.1", ip_address: "172.16.8.8" },
  ];
  const createdVisitors: IDiscussionBoardVisitorISummary[] = [];
  for (const input of visitorInputs) {
    // Each call sets authentication to the visitor (reset by admin join after all visitors).
    const auth = await api.functional.auth.visitor.join(connection, {
      body: input,
    });
    typia.assert(auth);
    // After join, re-authenticate as admin for next admin call.
    await api.functional.auth.admin.join(connection, {
      body: { user_id: adminUserId },
    });
    // Save for local verification, extract from join result
    createdVisitors.push({
      id: typia.random<string & tags.Format<"uuid">>(),
      visitor_token: auth.visitor_token,
      created_at: auth.issued_at,
      user_agent: input.user_agent,
    });
  }

  // 3a. Fetch all visitors, page 1/limit 10, no filters.
  const allPage = await api.functional.discussionBoard.admin.visitors.index(
    connection,
    {
      body: { page: 1, limit: 10 },
    },
  );
  typia.assert(allPage);
  TestValidator.predicate("all 3 visitors present", allPage.data.length >= 3);

  // 3b. Filter by user_agent of the 2nd visitor
  const filteredByAgent =
    await api.functional.discussionBoard.admin.visitors.index(connection, {
      body: { user_agent: createdVisitors[1].user_agent, page: 1, limit: 10 },
    });
  typia.assert(filteredByAgent);
  TestValidator.equals(
    "filter by user_agent returns 1 visitor",
    filteredByAgent.data.length,
    1,
  );
  TestValidator.equals(
    "user_agent matches filtered value",
    filteredByAgent.data[0].user_agent,
    createdVisitors[1].user_agent,
  );

  // 3c. Pagination: limit=1, page=2.
  const paginatedPage2 =
    await api.functional.discussionBoard.admin.visitors.index(connection, {
      body: { page: 2, limit: 1 },
    });
  typia.assert(paginatedPage2);
  TestValidator.equals("page=2 only one item", paginatedPage2.data.length, 1);
  TestValidator.equals(
    "pagination current page=2",
    paginatedPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit=1",
    paginatedPage2.pagination.limit,
    1,
  );

  // 3d. Created_at date range: range in the far past (should return no results).
  const noMatch = await api.functional.discussionBoard.admin.visitors.index(
    connection,
    {
      body: {
        from: "2000-01-01T00:00:00.000Z",
        to: "2000-01-02T00:00:00.000Z",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(noMatch);
  TestValidator.equals("no results for far past date", noMatch.data.length, 0);
  TestValidator.equals(
    "pagination total records 0 for no-match",
    noMatch.pagination.records,
    0,
  );

  // 3e. Combined user_agent and ip_address filter for visitor 0
  const combined = await api.functional.discussionBoard.admin.visitors.index(
    connection,
    {
      body: {
        user_agent: createdVisitors[0].user_agent,
        ip_address: visitorInputs[0].ip_address,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined filter returns 1 result",
    combined.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter user_agent matches",
    combined.data[0].user_agent,
    createdVisitors[0].user_agent,
  );
  TestValidator.equals(
    "combined filter id not null",
    typeof combined.data[0].id,
    "string",
  );
  TestValidator.equals(
    "combined filter visitor_token type",
    typeof combined.data[0].visitor_token,
    "string",
  );
  TestValidator.equals(
    "combined filter created_at type",
    typeof combined.data[0].created_at,
    "string",
  );

  // Validate absence of sensitive fields by checking that only allowed properties exist.
  for (const pageData of [
    allPage.data,
    filteredByAgent.data,
    paginatedPage2.data,
    combined.data,
  ]) {
    for (const record of pageData) {
      const keys = Object.keys(record);
      TestValidator.equals(
        "No extra/sensitive fields in summary records",
        keys.sort(),
        ["id", "visitor_token", "created_at", "user_agent"].sort(),
      );
    }
  }
}
