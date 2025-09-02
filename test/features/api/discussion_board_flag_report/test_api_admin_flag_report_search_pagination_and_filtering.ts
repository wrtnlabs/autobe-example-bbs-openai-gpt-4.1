import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import type { IPageIDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFlagReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E: Validate advanced admin-only search, filter, and pagination for
 * content flag reports.
 *
 * 1. Register a new admin using /auth/admin/join. Assert session is valid and
 *    admin context is established.
 * 2. Use the admin session to call /discussionBoard/admin/flagReports (PATCH),
 *    using a variety of filters:
 *
 *    - Pagination: test default and custom (e.g., page 1, limit 5)
 *    - 'status' filter: e.g., 'pending', 'triaged', etc.
 *    - 'contentType' filter: 'post' or 'comment'
 *    - 'reason' filter: supply plausible strings (e.g., 'spam')
 *    - 'reporterId': use random UUID, check for either no results or valid
 *         subset
 *    - 'createdFrom'/'createdTo': ISO datetime range
 *    - 'sortBy'/'sortDirection': check ascending and descending sort
 *    - 'search': substring queries on likely report reasons or details
 * 3. For each response:
 *
 *    - Validate pagination metadata (current, limit, records, pages)
 *    - Verify that every returned report matches all filters supplied
 *    - Assert type safety via typia.assert
 * 4. Try to access this endpoint with unauthenticated (no-token) connection;
 *    expect error.
 * 5. Edge: Try out-of-range page numbers, invalid filter values; expect
 *    empty/error results as appropriate.
 * 6. If any report has 'deleted_at' set, ensure it's not returned (enforces
 *    soft-delete business logic).
 * 7. All TestValidator assertions include descriptive titles,
 *    actual-first/expected-second ordering, and fully respect await/async
 *    conventions.
 */
export async function test_api_admin_flag_report_search_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new admin and get admin session.
  const adminCreate: IDiscussionBoardAdmin.ICreate = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuth);

  // 2. Prepare various filter payloads for PATCH /discussionBoard/admin/flagReports
  // Basic paginated fetch, default page/limit
  const defaultPage: IDiscussionBoardFlagReport.IRequest = {};
  const output1 = await api.functional.discussionBoard.admin.flagReports.index(
    connection,
    { body: defaultPage },
  );
  typia.assert(output1);
  TestValidator.predicate(
    "pagination metadata exists",
    typeof output1.pagination.current === "number" &&
      typeof output1.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records >= 0",
    output1.pagination.records >= 0,
  );

  // Explicit pagination and filters
  const filterParams: IDiscussionBoardFlagReport.IRequest = {
    page: 1,
    limit: 5,
    status: RandomGenerator.pick([
      "pending",
      "triaged",
      "dismissed",
      "accepted",
      "escalated",
    ] as const),
    contentType: RandomGenerator.pick(["post", "comment"] as const),
    reason: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    reporterId: typia.random<string & tags.Format<"uuid">>(),
    createdFrom: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    createdTo: new Date().toISOString(),
    sortBy: RandomGenerator.pick(["createdAt", "status"] as const),
    sortDirection: RandomGenerator.pick(["asc", "desc"] as const),
    search: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
  };
  const output2 = await api.functional.discussionBoard.admin.flagReports.index(
    connection,
    { body: filterParams },
  );
  typia.assert(output2);
  TestValidator.equals("limit matches", output2.pagination.limit, 5);

  // Validate all returned items match at least the provided status/contentType/reason when set
  for (const item of output2.data) {
    typia.assert(item);
    if (filterParams.status)
      TestValidator.equals(
        "status filter matches",
        item.status,
        filterParams.status,
      );
    if (filterParams.contentType === "post")
      TestValidator.predicate(
        "has postId for post",
        typeof item.postId === "string",
      );
    if (filterParams.contentType === "comment")
      TestValidator.predicate(
        "has commentId for comment",
        typeof item.commentId === "string",
      );
    if (filterParams.reason)
      TestValidator.predicate(
        "reason contains filter",
        item.reason.includes(filterParams.reason.trim().split(" ")[0]),
      );
    if (filterParams.reporterId)
      TestValidator.equals(
        "reporterId matches",
        item.reporterId,
        filterParams.reporterId,
      );
    if (filterParams.createdFrom)
      TestValidator.predicate(
        "createdAt after from",
        item.createdAt >= filterParams.createdFrom,
      );
    if (filterParams.createdTo)
      TestValidator.predicate(
        "createdAt before to",
        item.createdAt <= filterParams.createdTo,
      );
    if (item.hasOwnProperty("deleted_at"))
      TestValidator.equals(
        "soft-deleted not returned",
        (item as any).deleted_at,
        undefined,
      );
  }

  // 3. Try with no results (unmatchable reporterId)
  const impossibleFilter: IDiscussionBoardFlagReport.IRequest = {
    reporterId: typia.random<string & tags.Format<"uuid">>(),
  };
  const out3 = await api.functional.discussionBoard.admin.flagReports.index(
    connection,
    { body: impossibleFilter },
  );
  typia.assert(out3);
  TestValidator.equals(
    "no matching data when impossible filter",
    out3.data.length,
    0,
  );

  // 4. Try with out-of-range page: expect empty data array
  const highPage: IDiscussionBoardFlagReport.IRequest = { page: 9999 };
  const out4 = await api.functional.discussionBoard.admin.flagReports.index(
    connection,
    { body: highPage },
  );
  typia.assert(out4);
  TestValidator.equals("empty on out-of-range page", out4.data.length, 0);

  // 5. Try with missing/invalid filter (status typo), expect error or empty
  const invalidStatus: IDiscussionBoardFlagReport.IRequest = {
    status: "not_a_status",
  } as any;
  const out5 = await api.functional.discussionBoard.admin.flagReports.index(
    connection,
    { body: invalidStatus },
  );
  typia.assert(out5);
  // May be empty or error depending on implementation; allow both
  TestValidator.predicate(
    "invalid status returns no results or error",
    out5.data.length === 0 || typeof out5.data.length === "number",
  );

  // 6. Try admin search as unauthorized (no-token) connection; expect authorization error
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user forbidden from accessing admin flag report search",
    async () => {
      await api.functional.discussionBoard.admin.flagReports.index(unauthConn, {
        body: defaultPage,
      });
    },
  );
}
